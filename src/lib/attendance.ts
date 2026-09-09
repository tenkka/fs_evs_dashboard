"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
  type FirestoreError,
} from "firebase/firestore";
import { db } from "./firebase";

// One document per clock-in/out punch in the Firestore "attendance" collection, linked to the
// signed-in account via its Firebase Auth uid — no separate employee record needed.
export type AttendanceSession = {
  id: string;
  uid: string;
  clockIn: Date;
  clockOut: Date | null;
};

const MAX_SESSIONS = 60;

export function subscribeToAttendance(
  uid: string,
  onData: (sessions: AttendanceSession[]) => void,
  onError: (err: FirestoreError) => void
): () => void {
  if (!db) return () => {};

  // Filter only, no orderBy — ordering on a field other than the equality filter would
  // require a composite index in Firestore. Sorted (and capped) client-side instead.
  const q = query(collection(db, "attendance"), where("uid", "==", uid));

  return onSnapshot(
    q,
    (snap) => {
      const sessions: AttendanceSession[] = snap.docs
        .map((d) => {
          const data = d.data();
          const clockIn: Timestamp | null = data.clock_in ?? null;
          const clockOut: Timestamp | null = data.clock_out ?? null;
          return {
            id: d.id,
            uid: data.uid,
            // A just-written serverTimestamp() reads back as null in the optimistic local
            // snapshot until the server confirms it — fall back to "now" for that instant.
            clockIn: clockIn ? clockIn.toDate() : new Date(),
            clockOut: clockOut ? clockOut.toDate() : null,
          };
        })
        .sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime())
        .slice(0, MAX_SESSIONS);
      onData(sessions);
    },
    onError
  );
}

const MAX_ALL_SESSIONS = 300;

// Every clock-in/out record across every account — used by Manager/Admin views, which then
// cross-reference each record's uid against the facility's user list (attendance docs don't
// carry a facility of their own).
export function subscribeToAllAttendance(
  onData: (sessions: AttendanceSession[]) => void,
  onError: (err: FirestoreError) => void
): () => void {
  if (!db) return () => {};

  return onSnapshot(
    collection(db, "attendance"),
    (snap) => {
      const sessions: AttendanceSession[] = snap.docs
        .map((d) => {
          const data = d.data();
          const clockIn: Timestamp | null = data.clock_in ?? null;
          const clockOut: Timestamp | null = data.clock_out ?? null;
          return {
            id: d.id,
            uid: data.uid,
            clockIn: clockIn ? clockIn.toDate() : new Date(),
            clockOut: clockOut ? clockOut.toDate() : null,
          };
        })
        .sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime())
        .slice(0, MAX_ALL_SESSIONS);
      onData(sessions);
    },
    onError
  );
}

type AllAttendanceState = { sessions: AttendanceSession[] } | { error: string };

export function useAllAttendance(): { sessions: AttendanceSession[] | null; error: string | null } {
  const [state, setState] = useState<AllAttendanceState | null>(null);

  useEffect(() => {
    return subscribeToAllAttendance(
      (sessions) => setState({ sessions }),
      (err) => setState({ error: err.code })
    );
  }, []);

  return {
    sessions: state && "sessions" in state ? state.sessions : null,
    error: state && "error" in state ? state.error : null,
  };
}

export async function clockIn(uid: string): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  await addDoc(collection(db, "attendance"), {
    uid,
    clock_in: serverTimestamp(),
    clock_out: null,
  });
}

export async function clockOutSession(sessionId: string): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  await updateDoc(doc(db, "attendance", sessionId), { clock_out: serverTimestamp() });
}
