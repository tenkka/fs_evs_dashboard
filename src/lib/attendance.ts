"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, Timestamp, type FirestoreError } from "firebase/firestore";
import { db } from "./firebase";

// One document per historical clock-in/out punch in the Firestore "attendance" collection,
// linked to the signed-in account via its Firebase Auth uid. Clock-in/out itself has been
// retired in favor of UKG Ready as the source of truth for time tracking (see /timesheet) —
// this read-only history is kept only because the Overview dashboard's "on shift today" /
// attendance-rate / trend stats still read from it.
export type AttendanceSession = {
  id: string;
  uid: string;
  clockIn: Date;
  clockOut: Date | null;
};

const MAX_ALL_SESSIONS = 300;

// Every clock-in/out record across every account — used by the Overview dashboard, which
// cross-references each record's uid against the facility's user list (attendance docs don't
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
