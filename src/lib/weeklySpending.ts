"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  Timestamp,
  where,
  type FirestoreError,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import type { Department } from "./data";
import { currentWeekDates } from "./timeFormat";

export type SpendingEntry = {
  id: string;
  facility: string;
  department: Department;
  platform: string;
  amount: number;
  attachmentUrl: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  submittedByUid: string;
  submittedByName: string;
  createdAt: Date;
};

// Vendors seen across facilities so far — offered as suggestions, not a restricted list.
export const COMMON_PLATFORMS = ["Western Paper", "Staples", "US Foods", "Imperial Dade", "Walmart", "Misc"];

export type SpendGranularity = "week" | "month" | "year";

export const SPEND_GRANULARITY_OPTIONS: { label: string; value: SpendGranularity }[] = [
  { label: "Weekly", value: "week" },
  { label: "Monthly", value: "month" },
  { label: "Yearly", value: "year" },
];

/**
 * The bucket a date falls into for a given granularity — a sortable key, a full display
 * label (for list section headers, where there's room), and a short `axisLabel` (for dense
 * chart x-axes, where "Week of Oct 12 – Oct 18" repeated 50+ times would overlap).
 */
export function spendGroupKeyFor(d: Date, granularity: SpendGranularity): { key: string; label: string; axisLabel: string } {
  if (granularity === "year") {
    const year = String(d.getFullYear());
    return { key: year, label: year, axisLabel: year };
  }
  if (granularity === "month") {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return { key, label, axisLabel: label };
  }
  const week = currentWeekDates(d);
  return {
    key: week[0].date,
    label: `Week of ${week[0].dateLabel} – ${week[6].dateLabel}`,
    axisLabel: week[0].dateLabel,
  };
}

const MAX_ENTRIES = 500;

export function subscribeToSpending(
  facilityScope: string,
  onData: (entries: SpendingEntry[]) => void,
  onError: (err: FirestoreError) => void
): () => void {
  if (!db) return () => {};

  const spendingCollection = collection(db, "weeklySpending");
  const q = facilityScope === "all" ? spendingCollection : query(spendingCollection, where("facility", "==", facilityScope));

  return onSnapshot(
    q,
    (snap) => {
      const entries: SpendingEntry[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            facility: data.facility,
            department: data.department,
            platform: data.platform ?? "",
            amount: data.amount ?? 0,
            attachmentUrl: data.attachmentUrl ?? null,
            attachmentPath: data.attachmentPath ?? null,
            attachmentName: data.attachmentName ?? null,
            submittedByUid: data.submittedByUid,
            submittedByName: data.submittedByName,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, MAX_ENTRIES);
      onData(entries);
    },
    onError
  );
}

// Tags a fetched result with the scope it was fetched for, so a stale result from a
// just-changed facility filter is never mistaken for the current one.
type LoadState = { scope: string; entries: SpendingEntry[] } | { scope: string; error: string };

export function useSpendingEntries(facilityScope: string): { entries: SpendingEntry[] | null; error: string | null } {
  const [loadState, setLoadState] = useState<LoadState | null>(null);

  useEffect(() => {
    return subscribeToSpending(
      facilityScope,
      (entries) => setLoadState({ scope: facilityScope, entries }),
      (err) => setLoadState({ scope: facilityScope, error: err.code })
    );
  }, [facilityScope]);

  const current = loadState?.scope === facilityScope ? loadState : null;
  return {
    entries: current && "entries" in current ? current.entries : null,
    error: current && "error" in current ? current.error : null,
  };
}

export async function addSpendingEntry(
  facility: string,
  department: Department,
  platform: string,
  amount: number,
  date: Date,
  submittedByUid: string,
  submittedByName: string,
  attachment: File | null
): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");

  let attachmentUrl: string | null = null;
  let attachmentPath: string | null = null;
  let attachmentName: string | null = null;

  if (attachment) {
    if (!storage) throw new Error("Firebase Storage isn't configured.");
    attachmentPath = `weeklySpending/${facility}/${Date.now()}_${submittedByUid}_${attachment.name}`;
    const storageRef = ref(storage, attachmentPath);
    await uploadBytes(storageRef, attachment);
    attachmentUrl = await getDownloadURL(storageRef);
    attachmentName = attachment.name;
  }

  await addDoc(collection(db, "weeklySpending"), {
    facility,
    department,
    platform,
    amount,
    attachmentUrl,
    attachmentPath,
    attachmentName,
    submittedByUid,
    submittedByName,
    createdAt: Timestamp.fromDate(date),
  });
}

export async function deleteSpendingEntry(entry: SpendingEntry): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  await deleteDoc(doc(db, "weeklySpending", entry.id));
  if (entry.attachmentPath && storage) {
    await deleteObject(ref(storage, entry.attachmentPath)).catch(() => {});
  }
}
