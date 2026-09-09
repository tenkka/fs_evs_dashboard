"use client";

import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// One document per employee per scheduled day in the Firestore "shifts" collection.
// Doc id is deterministic ("<uid>_<date>") so a given employee has at most one shift per
// day, and scheduling/clearing a shift is a plain upsert/delete rather than a query.
export type ShiftDoc = {
  id: string;
  uid: string;
  date: string; // "YYYY-MM-DD"
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  station: string;
};

function shiftId(uid: string, date: string): string {
  return `${uid}_${date}`;
}

/** Minutes between start and end, wrapping past midnight when end <= start (overnight shifts). */
export function shiftDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return endMinutes - startMinutes;
}

type LoadState = { shifts: ShiftDoc[] } | { error: string };

export function useAllShifts(): { shifts: ShiftDoc[] | null; error: string | null } {
  const [state, setState] = useState<LoadState | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, "shifts"),
      (snap) => {
        const shifts: ShiftDoc[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: data.uid,
            date: data.date,
            start: data.start,
            end: data.end,
            station: data.station ?? "",
          };
        });
        setState({ shifts });
      },
      (err) => setState({ error: err.code })
    );
  }, []);

  return {
    shifts: state && "shifts" in state ? state.shifts : null,
    error: state && "error" in state ? state.error : null,
  };
}

export async function setShift(
  uid: string,
  date: string,
  start: string,
  end: string,
  station: string
): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  await setDoc(doc(db, "shifts", shiftId(uid, date)), { uid, date, start, end, station });
}

export async function deleteShift(uid: string, date: string): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  await deleteDoc(doc(db, "shifts", shiftId(uid, date)));
}
