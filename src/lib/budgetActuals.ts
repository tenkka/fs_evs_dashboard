"use client";

import { useEffect, useMemo, useState } from "react";
import { toDateKey, currentWeekDates } from "./timeFormat";
import { useSpendingEntries } from "./weeklySpending";
import { useFacilityUsers } from "./firestoreUsers";
import type { PeriodType } from "./budgets";

export type DateRangeKeys = { start: string; end: string; label: string; axisLabel: string };

export type LaborBreakdownEntry = {
  employeeCode: string;
  employeeName: string;
  payrollId: string;
  payrollName: string;
  periodStart: string;
  periodEnd: string;
  grossPay: number;
  proratedGrossPay: number;
};

export type HoursBreakdownEntry = { employeeCode: string; employeeName: string; totalMinutes: number };

/** On-demand per-employee/per-payroll detail behind one Labor total — fetched only when a UI asks to drill into a specific bar/point. */
export async function fetchLaborCostBreakdown(codes: string[], start: string, end: string): Promise<LaborBreakdownEntry[]> {
  if (codes.length === 0) return [];
  const res = await fetch(`/api/ukg/labor-cost?codes=${encodeURIComponent(codes.join(","))}&start=${start}&end=${end}`);
  const data = (await res.json()) as { breakdown?: LaborBreakdownEntry[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data.breakdown ?? [];
}

/** On-demand per-employee detail behind one Hours total — fetched only when a UI asks to drill into a specific bar/point. */
export async function fetchHoursBreakdown(codes: string[], start: string, end: string): Promise<HoursBreakdownEntry[]> {
  if (codes.length === 0) return [];
  const res = await fetch(`/api/ukg/hours?codes=${encodeURIComponent(codes.join(","))}&start=${start}&end=${end}`);
  const data = (await res.json()) as { breakdown?: HoursBreakdownEntry[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data.breakdown ?? [];
}

/** The calendar-aligned date range for the instance of a period type that contains `reference`. */
export function periodDateRange(period: PeriodType, reference: Date = new Date()): DateRangeKeys {
  if (period === "weekly") {
    const week = currentWeekDates(reference);
    return {
      start: week[0].date,
      end: week[6].date,
      label: `Week of ${week[0].dateLabel} – ${week[6].dateLabel}`,
      axisLabel: week[0].dateLabel,
    };
  }
  if (period === "monthly") {
    const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
    return {
      start: toDateKey(start),
      end: toDateKey(end),
      label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      axisLabel: start.toLocaleDateString("en-US", { month: "short" }),
    };
  }
  if (period === "quarterly") {
    const quarter = Math.floor(reference.getMonth() / 3);
    const start = new Date(reference.getFullYear(), quarter * 3, 1);
    const end = new Date(reference.getFullYear(), quarter * 3 + 3, 0);
    return {
      start: toDateKey(start),
      end: toDateKey(end),
      label: `Q${quarter + 1} ${reference.getFullYear()}`,
      axisLabel: `Q${quarter + 1} '${String(reference.getFullYear()).slice(-2)}`,
    };
  }
  const start = new Date(reference.getFullYear(), 0, 1);
  const end = new Date(reference.getFullYear(), 11, 31);
  return { start: toDateKey(start), end: toDateKey(end), label: String(reference.getFullYear()), axisLabel: String(reference.getFullYear()) };
}

/** A date `count` whole periods away from `reference` (negative = earlier) — day-of-month-safe. */
function shiftByPeriods(period: PeriodType, reference: Date, count: number): Date {
  if (period === "weekly") {
    const d = new Date(reference);
    d.setDate(d.getDate() + count * 7);
    return d;
  }
  if (period === "monthly") return new Date(reference.getFullYear(), reference.getMonth() + count, 1);
  if (period === "quarterly") return new Date(reference.getFullYear(), reference.getMonth() + count * 3, 1);
  return new Date(reference.getFullYear() + count, 0, 1);
}

/** How many trailing instances of each period type the trend curve plots. */
export const SERIES_LENGTH: Record<PeriodType, number> = { weekly: 8, monthly: 6, quarterly: 4, yearly: 3 };

/** The date ranges for the trailing `count` instances of a period type, oldest first, ending with the current one. */
export function periodSeriesRanges(period: PeriodType, count: number, reference: Date = new Date()): DateRangeKeys[] {
  return Array.from({ length: count }, (_, i) => periodDateRange(period, shiftByPeriods(period, reference, i - (count - 1))));
}

/** Runs async work over items with at most `limit` in flight at once. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function sumMoneyInRange(entries: { createdAt: Date; amount: number }[], start: string, end: string): number {
  const total = entries
    .filter((e) => {
      const key = toDateKey(e.createdAt);
      return key >= start && key <= end;
    })
    .reduce((sum, e) => sum + e.amount, 0);
  return Math.round(total * 100) / 100;
}

export type SeriesPoint = { value: number; label: string; axisLabel: string };

/** Actual money spent per trailing period instance, for the trend curve — no network call, derived client-side. */
export function useActualMoneySeries(facility: string, period: PeriodType): SeriesPoint[] | null {
  const { entries } = useSpendingEntries(facility);
  return useMemo(() => {
    if (!entries) return null;
    return periodSeriesRanges(period, SERIES_LENGTH[period]).map((range) => ({
      value: sumMoneyInRange(entries, range.start, range.end),
      label: range.label,
      axisLabel: range.axisLabel,
    }));
  }, [entries, period]);
}

function facilityEmployeeCodes(users: { employeeId?: string | null }[] | null): string[] {
  return (users ?? []).filter((u) => u.employeeId).map((u) => u.employeeId as string);
}

/** Actual hours worked per trailing period instance, for the trend curve — one `/api/ukg/hours` call per point. */
export function useActualHoursSeries(
  facility: string,
  period: PeriodType,
  enabled: boolean
): { series: SeriesPoint[] | null; loading: boolean; error: string | null } {
  const { users, error: usersError } = useFacilityUsers(facility);
  const [series, setSeries] = useState<SeriesPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const ranges = periodSeriesRanges(period, SERIES_LENGTH[period]);
  const rangeKey = ranges.map((r) => `${r.start}:${r.end}`).join(",");

  useEffect(() => {
    if (!enabled || !users) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setFetchError(null);
      }
    });

    const codes = facilityEmployeeCodes(users);

    (codes.length === 0
      ? Promise.resolve(ranges.map(() => 0))
      : mapWithConcurrency(ranges, 4, async (range) => {
          const res = await fetch(`/api/ukg/hours?codes=${encodeURIComponent(codes.join(","))}&start=${range.start}&end=${range.end}`);
          const data = (await res.json()) as { totalMinutes?: number };
          return Math.round(((data.totalMinutes ?? 0) / 60) * 10) / 10;
        })
    )
      .then((values) => {
        if (cancelled) return;
        setSeries(ranges.map((r, i) => ({ value: values[i], label: r.label, axisLabel: r.axisLabel })));
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : "Couldn't reach the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rangeKey captures what `ranges` would otherwise unstably re-trigger on
  }, [enabled, users, period, rangeKey]);

  return { series, loading, error: usersError ?? fetchError };
}

/** Actual labor cost per trailing period instance, for the trend curve — one `/api/ukg/labor-cost` call per point. */
export function useActualLaborCostSeries(
  facility: string,
  period: PeriodType,
  enabled: boolean
): { series: SeriesPoint[] | null; loading: boolean; error: string | null } {
  const { users, error: usersError } = useFacilityUsers(facility);
  const [series, setSeries] = useState<SeriesPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const ranges = periodSeriesRanges(period, SERIES_LENGTH[period]);
  const rangeKey = ranges.map((r) => `${r.start}:${r.end}`).join(",");

  useEffect(() => {
    if (!enabled || !users) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setFetchError(null);
      }
    });

    const codes = facilityEmployeeCodes(users);

    (codes.length === 0
      ? Promise.resolve(ranges.map(() => 0))
      : mapWithConcurrency(ranges, 4, async (range) => {
          const res = await fetch(`/api/ukg/labor-cost?codes=${encodeURIComponent(codes.join(","))}&start=${range.start}&end=${range.end}`);
          const data = (await res.json()) as { laborCost?: number };
          return data.laborCost ?? 0;
        })
    )
      .then((values) => {
        if (cancelled) return;
        setSeries(ranges.map((r, i) => ({ value: values[i], label: r.label, axisLabel: r.axisLabel })));
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : "Couldn't reach the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rangeKey captures what `ranges` would otherwise unstably re-trigger on
  }, [enabled, users, period, rangeKey]);

  return { series, loading, error: usersError ?? fetchError };
}
