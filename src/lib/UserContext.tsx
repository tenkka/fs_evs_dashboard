"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";
import { personaFromUserDoc, type Persona, type UserDoc } from "./auth";

type UserContextValue = {
  isFirebaseConfigured: boolean;
  authLoading: boolean;
  /** True while the Firestore users/{uid} profile for the signed-in account is being fetched. */
  profileLoading: boolean;
  firebaseUser: FirebaseUser | null;
  /** Persona built from the signed-in account's Firestore users/{uid} document, or null if signed out / no matching document. */
  persona: Persona | null;
  /** Set if the Firestore users/{uid} read failed — most commonly "permission-denied" from security rules. */
  profileError: string | null;
  /** Effective facility scope: the persona's own facility, or the admin's current selection. */
  facilityScope: string;
  setFacilityScope: (facility: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

// Tags a fetched persona with the uid it was fetched for, so a stale result from a
// just-signed-out (or just-switched) account is never mistaken for the current one.
type ProfileState = { uid: string; persona: Persona | null; error?: string };

export function UserProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  // Nothing to wait for if Firebase isn't configured (or during server-side rendering, where auth is always null).
  const [authLoading, setAuthLoading] = useState(() => Boolean(auth));
  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  const [adminFacility, setAdminFacility] = useState<string>("all");

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Load (and live-sync) the signed-in account's role/profile from Firestore users/{uid}.
  useEffect(() => {
    if (!firebaseUser || !db) return;
    const uid = firebaseUser.uid;
    const unsubscribe = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setProfileState({ uid, persona: snap.exists() ? personaFromUserDoc(snap.id, snap.data() as UserDoc) : null });
      },
      (err) => {
        console.error("Failed to load Firestore user profile:", err);
        setProfileState({ uid, persona: null, error: err.code });
      }
    );
    return unsubscribe;
  }, [firebaseUser]);

  // Only trust profileState once it's confirmed to be for the currently signed-in uid —
  // otherwise a previous account's persona could flash while the new one is still loading.
  const currentProfile = firebaseUser && profileState?.uid === firebaseUser.uid ? profileState : null;
  const persona = currentProfile?.persona ?? null;
  const profileError = currentProfile?.error ?? null;
  const profileLoading = Boolean(firebaseUser) && profileState?.uid !== firebaseUser?.uid;

  const facilityScope = persona?.role === "admin" ? adminFacility : (persona?.facility ?? "all");

  const value = useMemo<UserContextValue>(
    () => ({
      isFirebaseConfigured,
      authLoading,
      profileLoading,
      firebaseUser,
      persona,
      profileError,
      facilityScope,
      setFacilityScope: setAdminFacility,
      signIn: async (email: string, password: string) => {
        if (!auth) throw new Error("Firebase isn't configured — add your web app config to .env.local first.");
        await signInWithEmailAndPassword(auth, email, password);
      },
      signOutUser: async () => {
        if (!auth) return;
        await signOut(auth);
      },
    }),
    [authLoading, profileLoading, firebaseUser, persona, profileError, facilityScope]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}

/** Use inside dashboard pages/components that only ever render once AppShell has confirmed a recognized persona. */
export function useAuthedUser(): UserContextValue & { persona: Persona; firebaseUser: FirebaseUser } {
  const ctx = useUser();
  if (!ctx.persona || !ctx.firebaseUser) {
    throw new Error("useAuthedUser was used outside of an authenticated, recognized session");
  }
  return { ...ctx, persona: ctx.persona, firebaseUser: ctx.firebaseUser };
}
