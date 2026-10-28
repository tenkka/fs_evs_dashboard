"use client";

import { CalendarRange } from "lucide-react";
import clsx from "clsx";

export type DateRange = "week" | "month" | "year" | "all";

export const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: "Past Week", value: "week" },
  { label: "Past Month", value: "month" },
  { label: "Past Year", value: "year" },
  { label: "All Time", value: "all" },
];

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  week: "Past Week",
  month: "Past Month",
  year: "Past Year",
  all: "All Time",
};

/** The cutoff a record's date must be >= to fall in range — null means no cutoff (all time). */
export function rangeCutoff(range: DateRange, now: Date = new Date()): Date | null {
  if (range === "all") return null;
  const cutoff = new Date(now);
  if (range === "week") cutoff.setDate(cutoff.getDate() - 7);
  else if (range === "month") cutoff.setMonth(cutoff.getMonth() - 1);
  else if (range === "year") cutoff.setFullYear(cutoff.getFullYear() - 1);
  return cutoff;
}

export function inRange(date: Date, range: DateRange, now: Date = new Date()): boolean {
  const cutoff = rangeCutoff(range, now);
  return cutoff === null || date >= cutoff;
}

export function DateRangeSelect({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <CalendarRange className="h-3.5 w-3.5 shrink-0 text-text-muted" />
      <div className="flex flex-wrap gap-1 rounded-md border border-border-hairline p-1">
        {DATE_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={clsx(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              value === opt.value ? "bg-series-1 text-white" : "text-text-secondary hover:bg-surface-2"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
