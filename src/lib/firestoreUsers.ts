"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, type FirestoreError } from "firebase/firestore";
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
