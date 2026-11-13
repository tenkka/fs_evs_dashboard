"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useBudgetHistory, BUDGET_SECTIONS } from "@/lib/budgets";

const SECTION_LABEL = Object.fromEntries(BUDGET_SECTIONS.map((s) => [s.value, s.label]));

function formatValue(value: number, section: string): string {
  return section === "hours" ? `${value} hrs` : value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** A chronological log of every change made to this facility's budget targets. */
export function BudgetHistoryList({ facility }: { facility: string }) {
  const { history, error } = useBudgetHistory(facility, 30);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-10 text-center">
        <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
        <p className="text-sm font-medium text-text-primary">Couldn&apos;t load budget history</p>
        <p className="max-w-sm text-sm text-text-muted">
          {error === "permission-denied" ? "Firestore denied reading the budget history." : `Error: ${error}`}
        </p>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-10">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Section</th>
              <th className="px-4 py-2.5 font-medium">Time Slot</th>
              <th className="px-4 py-2.5 font-medium">New Target</th>
              <th className="px-4 py-2.5 font-medium">Changed By</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry) => (
              <tr key={entry.id} className="border-b border-border-hairline last:border-0">
                <td className="px-4 py-2.5 text-text-secondary">
                  {entry.changedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
                  {entry.changedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </td>
                <td className="px-4 py-2.5 text-text-primary">{SECTION_LABEL[entry.section] ?? entry.section}</td>
                <td className="px-4 py-2.5 text-text-secondary">{entry.slotLabel}</td>
                <td className="px-4 py-2.5 text-text-secondary">{formatValue(entry.value, entry.section)}</td>
                <td className="px-4 py-2.5 text-text-muted">{entry.changedBy ?? "—"}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No budget changes recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
