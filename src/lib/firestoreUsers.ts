"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where, type FirestoreError } from "firebase/firestore";
import { db } from "./firebase";
import { personaFromUserDoc, type Persona, type UserDoc } from "./auth";

// Live list of Firestore users/{uid} documents, optionally filtered to one facility.
export function subscribeToFacilityUsers(
  facilityScope: string,
  onData: (users: Persona[]) => void,
  onError: (err: FirestoreError) => void
): () => void {
  if (!db) return () => {};

  const usersCollection = collection(db, "users");
  const q = facilityScope === "all" ? usersCollection : query(usersCollection, where("facility", "==", facilityScope));

  return onSnapshot(
    q,
    (snap) => {
      const users = snap.docs
        .map((d) => personaFromUserDoc(d.id, d.data() as UserDoc))
        .filter((p): p is Persona => p !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      onData(users);
    },
    onError
  );
}

// Tags a fetched result with the scope it was fetched for, so a stale result from a
// just-changed facility filter is never mistaken for the current one.
type LoadState = { scope: string; users: Persona[] } | { scope: string; error: string };

export function useFacilityUsers(facilityScope: string): { users: Persona[] | null; error: string | null } {
  const [loadState, setLoadState] = useState<LoadState | null>(null);

  useEffect(() => {
    return subscribeToFacilityUsers(
      facilityScope,
      (users) => setLoadState({ scope: facilityScope, users }),
      (err) => setLoadState({ scope: facilityScope, error: err.code })
    );
  }, [facilityScope]);

  const current = loadState?.scope === facilityScope ? loadState : null;
  return {
    users: current && "users" in current ? current.users : null,
    error: current && "error" in current ? current.error : null,
  };
}

// Tags a fetched result with the uid it was fetched for, so a stale result from a
// just-changed uid is never mistaken for the current one.
type UserLoadState = { uid: string; user: Persona | null } | { uid: string; error: string };

/** Live Firestore users/{uid} document for a specific user, e.g. when a Manager/Admin looks up a staff member. */
export function useUserById(uid: string): { user: Persona | null; loading: boolean; error: string | null } {
  const [loadState, setLoadState] = useState<UserLoadState | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => setLoadState({ uid, user: snap.exists() ? personaFromUserDoc(snap.id, snap.data() as UserDoc) : null }),
      (err) => setLoadState({ uid, error: err.code })
    );
  }, [uid]);

  const current = loadState?.uid === uid ? loadState : null;
  return {
    user: current && "user" in current ? current.user : null,
    loading: current === null,
    error: current && "error" in current ? current.error : null,
  };
}
