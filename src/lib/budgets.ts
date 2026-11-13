"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, setDoc, where, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { toDateKey, currentWeekDates } from "./timeFormat";

export type PeriodType = "weekly" | "monthly" | "quarterly" | "yearly";

export const PERIOD_TYPES: { label: string; value: PeriodType }[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Yearly", value: "yearly" },
];

export type BudgetSection = "spending" | "labor" | "hours";

export const BUDGET_SECTIONS: { label: string; value: BudgetSection; description: string }[] = [
  { label: "Spending", value: "spending", description: "Logged purchases vs. the spending budget" },
  { label: "Labor", value: "labor", description: "Actual UKG payroll cost vs. the labor budget" },
  { label: "Hours", value: "hours", description: "Actual UKG clock time vs. the hours budget" },
];

export type BudgetTarget = { spending: number; labor: number; hours: number };
export type FacilityBudget = Record<PeriodType, BudgetTarget>;
export type AllFacilityBudgets = Record<string, FacilityBudget>;

const EMPTY_TARGET: BudgetTarget = { spending: 0, labor: 0, hours: 0 };
const EMPTY_BUDGET: FacilityBudget = { weekly: EMPTY_TARGET, monthly: EMPTY_TARGET, quarterly: EMPTY_TARGET, yearly: EMPTY_TARGET };

// A budget target is scoped to one specific instance of a period type (e.g. "the week of Nov 2",
// not just "weekly" in general) — `slotKey` is that instance's start date, which doubles as a
// stable, sortable id when combined with period + section.
function slotDocId(period: PeriodType, section: BudgetSection, slotKey: string): string {
  return `${period}_${section}_${slotKey}`;
}

function currentSlotKey(period: PeriodType, now: Date): string {
  if (period === "weekly") return currentWeekDates(now)[0].date;
  if (period === "monthly") return toDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  if (period === "quarterly") return toDateKey(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1));
  return toDateKey(new Date(now.getFullYear(), 0, 1));
}

export type BudgetSlotTarget = {
  id: string;
  period: PeriodType;
  section: BudgetSection;
  slotKey: string;
  slotLabel: string;
  value: number;
  updatedAt: Date;
  updatedBy: string | null;
};

type TargetsLoadState = { facility: string; targets: Map<string, BudgetSlotTarget> } | { facility: string; error: string };

/** Live set of every dated budget target an Admin has configured for one facility, keyed by `period_section_slotKey`. */
export function useBudgetTargets(facility: string): { targets: Map<string, BudgetSlotTarget> | null; error: string | null } {
  const [loadState, setLoadState] = useState<TargetsLoadState | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, "budgets", facility, "targets"),
      (snap) => {
        const targets = new Map<string, BudgetSlotTarget>();
        for (const d of snap.docs) {
          const data = d.data() as {
            period: PeriodType;
            section: BudgetSection;
            slotKey: string;
            slotLabel?: string;
            value?: number;
            updatedAt?: Timestamp;
            updatedBy?: string | null;
          };
          targets.set(d.id, {
            id: d.id,
            period: data.period,
            section: data.section,
            slotKey: data.slotKey,
            slotLabel: data.slotLabel ?? data.slotKey,
            value: typeof data.value === "number" ? data.value : 0,
            updatedAt: data.updatedAt?.toDate() ?? new Date(0),
            updatedBy: data.updatedBy ?? null,
          });
        }
        setLoadState({ facility, targets });
      },
      (err) => setLoadState({ facility, error: err.code })
    );
  }, [facility]);

  const current = loadState?.facility === facility ? loadState : null;
  return {
    targets: current && "targets" in current ? current.targets : null,
    error: current && "error" in current ? current.error : null,
  };
}

/** The configured target for one specific period instance, or 0 if nothing was ever set for that slot. */
export function targetFor(
  targets: Map<string, BudgetSlotTarget> | null,
  period: PeriodType,
  section: BudgetSection,
  slotKey: string
): number {
  return targets?.get(slotDocId(period, section, slotKey))?.value ?? 0;
}

/** Sets (or replaces) the budget target for one specific period instance, and logs the change. */
export async function saveBudgetTarget(
  facility: string,
  period: PeriodType,
  section: BudgetSection,
  slotKey: string,
  slotLabel: string,
  value: number,
  changedBy: string | null
): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  const id = slotDocId(period, section, slotKey);
  // Firestore rejects `undefined` field values outright — the Persona type claims `email` is
  // always a string, but a users/{uid} doc missing that field would make it undefined at
  // runtime, so coerce defensively rather than trust the caller's type.
  const by = changedBy ?? null;
  await setDoc(doc(db, "budgets", facility, "targets", id), {
    period,
    section,
    slotKey,
    slotLabel,
    value,
    updatedAt: Timestamp.now(),
    updatedBy: by,
  });
  await addDoc(collection(db, "budgets", facility, "history"), {
    period,
    section,
    slotKey,
    slotLabel,
    value,
    changedBy: by,
    changedAt: Timestamp.now(),
  });
}

export type BudgetHistoryEntry = {
  id: string;
  period: PeriodType;
  section: BudgetSection;
  slotKey: string;
  slotLabel: string;
  value: number;
  changedBy: string | null;
  changedAt: Date;
};

type HistoryLoadState = { facility: string; history: BudgetHistoryEntry[] } | { facility: string; error: string };

/** Live log of every budget target change for a facility, most recent first. */
export function useBudgetHistory(facility: string, max = 200): { history: BudgetHistoryEntry[] | null; error: string | null } {
  const [loadState, setLoadState] = useState<HistoryLoadState | null>(null);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "budgets", facility, "history"), orderBy("changedAt", "desc"), limit(max));
    return onSnapshot(
      q,
      (snap) => {
        const history = snap.docs.map((d) => {
          const data = d.data() as {
            period: PeriodType;
            section: BudgetSection;
            slotKey: string;
            slotLabel?: string;
            value: number;
            changedBy?: string | null;
            changedAt?: Timestamp;
          };
          return {
            id: d.id,
            period: data.period,
            section: data.section,
            slotKey: data.slotKey,
            slotLabel: data.slotLabel ?? data.slotKey,
            value: data.value,
            changedBy: data.changedBy ?? null,
            changedAt: data.changedAt?.toDate() ?? new Date(0),
          };
        });
        setLoadState({ facility, history });
      },
      (err) => setLoadState({ facility, error: err.code })
    );
  }, [facility, max]);

  const current = loadState?.facility === facility ? loadState : null;
  return {
    history: current && "history" in current ? current.history : null,
    error: current && "error" in current ? current.error : null,
  };
}

/**
 * Live "current instance" target per period type, across every facility — used for the "All
 * Facilities" overview. Queries each facility's own `targets` subcollection individually (one
 * listener per facility) rather than a `collectionGroup` query, so it works with Firestore's
 * automatic per-collection indexing and never needs a manually-created index.
 */
export function useAllBudgets(facilityIds: string[]): { budgets: AllFacilityBudgets | null; error: string | null } {
  const [budgets, setBudgets] = useState<AllFacilityBudgets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idsKey = facilityIds.slice().sort().join(",");

  useEffect(() => {
    const firestore = db;
    if (!firestore) return;
    if (facilityIds.length === 0) {
      Promise.resolve().then(() => {
        setBudgets({});
        setError(null);
      });
      return;
    }

    Promise.resolve().then(() => setError(null));
    const now = new Date();
    const slotKeys = PERIOD_TYPES.map((p) => currentSlotKey(p.value, now));

    const unsubscribes = facilityIds.map((facilityId) => {
      const q = query(collection(firestore, "budgets", facilityId, "targets"), where("slotKey", "in", slotKeys));
      return onSnapshot(
        q,
        (snap) => {
          const facilityBudget = { ...EMPTY_BUDGET };
          for (const d of snap.docs) {
            const data = d.data() as { period: PeriodType; section: BudgetSection; value: number; slotKey: string };
            // The "in" filter only guarantees the slotKey string matches one of the current slots —
            // different period types can share the same start date (e.g. Jan 1 for monthly/quarterly/yearly),
            // so confirm this doc's own period type considers its slotKey the current one before counting it.
            if (data.slotKey !== currentSlotKey(data.period, now)) continue;
            facilityBudget[data.period] = { ...facilityBudget[data.period], [data.section]: data.value };
          }
          setBudgets((prev) => ({ ...(prev ?? {}), [facilityId]: facilityBudget }));
        },
        (err) => setError(err.code)
      );
    });

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey captures what facilityIds would otherwise unstably re-trigger on
  }, [idsKey]);

  return { budgets, error };
}
