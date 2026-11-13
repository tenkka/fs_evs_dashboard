"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { BudgetSection } from "@/lib/budgets";
import {
  fetchLaborCostBreakdown,
  fetchHoursBreakdown,
  type DateRangeKeys,
  type LaborBreakdownEntry,
  type HoursBreakdownEntry,
} from "@/lib/budgetActuals";
import { useFacilityUsers } from "@/lib/firestoreUsers";
import { useSpendingEntries } from "@/lib/weeklySpending";
import { toDateKey } from "@/lib/timeFormat";

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const SECTION_TITLE: Record<BudgetSection, string> = { spending: "Spending", labor: "Labor", hours: "Hours" };

/** The breakdown behind one clicked Actual bar — spending entries, payroll statements, or per-employee hours, depending on the section. */
export function BudgetBarDetail({
  facility,
  section,
  range,
  onClose,
}: {
  facility: string;
  section: BudgetSection;
  range: DateRangeKeys;
  onClose: () => void;
}) {
  const { users } = useFacilityUsers(facility);
  const { entries } = useSpendingEntries(facility);
  const [laborBreakdown, setLaborBreakdown] = useState<LaborBreakdownEntry[] | null>(null);
  const [hoursBreakdown, setHoursBreakdown] = useState<HoursBreakdownEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (section === "spending" || !users) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });

    const codes = users.filter((u) => u.employeeId).map((u) => u.employeeId as string);

    const request =
      section === "labor"
        ? fetchLaborCostBreakdown(codes, range.start, range.end).then((breakdown) => {
            if (!cancelled) setLaborBreakdown(breakdown);
          })
        : fetchHoursBreakdown(codes, range.start, range.end).then((breakdown) => {
            if (!cancelled) setHoursBreakdown(breakdown);
          });

    request
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't reach the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [section, users, range.start, range.end]);

  const spendingEntries = (entries ?? []).filter((e) => {
    const key = toDateKey(e.createdAt);
    return key >= range.start && key <= range.end;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border-hairline bg-surface-1 p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-primary">{SECTION_TITLE[section]} Detail</p>
            <p className="text-xs text-text-muted">{range.label}</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-text-muted hover:text-text-primary" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {section === "spending" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Department</th>
                <th className="py-2 pr-3 font-medium">Platform</th>
                <th className="py-2 pr-3 font-medium">Submitted By</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {spendingEntries.map((e) => (
                <tr key={e.id} className="border-b border-border-hairline last:border-0">
                  <td className="py-2 pr-3 text-text-secondary">
                    {e.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-2 pr-3 text-text-primary">{e.department}</td>
                  <td className="py-2 pr-3 text-text-secondary">{e.platform}</td>
                  <td className="py-2 pr-3 text-text-secondary">{e.submittedByName}</td>
                  <td className="py-2 pr-3 text-text-secondary">{formatMoney(e.amount)}</td>
                </tr>
              ))}
              {spendingEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-text-muted">
                    No spending logged in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {section === "labor" &&
          (error ? (
            <p className="py-8 text-center text-sm text-text-muted">Couldn&apos;t load detail from UKG.</p>
          ) : loading || laborBreakdown === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
                  <th className="py-2 pr-3 font-medium">Employee</th>
                  <th className="py-2 pr-3 font-medium">Payroll #</th>
                  <th className="py-2 pr-3 font-medium">Pay Period</th>
                  <th className="py-2 pr-3 font-medium">Gross Pay</th>
                  <th className="py-2 pr-3 font-medium">Counted</th>
                </tr>
              </thead>
              <tbody>
                {laborBreakdown.map((b, i) => (
                  <tr key={`${b.payrollId}-${b.employeeCode}-${i}`} className="border-b border-border-hairline last:border-0">
                    <td className="py-2 pr-3 text-text-primary">{b.employeeName}</td>
                    <td className="py-2 pr-3 text-text-secondary">
                      #{b.payrollId} — {b.payrollName}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">
                      {b.periodStart} – {b.periodEnd}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">{formatMoney(b.grossPay)}</td>
                    <td className="py-2 pr-3 text-text-secondary">{formatMoney(b.proratedGrossPay)}</td>
                  </tr>
                ))}
                {laborBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-text-muted">
                      No payroll found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ))}

        {section === "hours" &&
          (error ? (
            <p className="py-8 text-center text-sm text-text-muted">Couldn&apos;t load detail from UKG.</p>
          ) : loading || hoursBreakdown === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
                  <th className="py-2 pr-3 font-medium">Employee</th>
                  <th className="py-2 pr-3 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {hoursBreakdown.map((b) => (
                  <tr key={b.employeeCode} className="border-b border-border-hairline last:border-0">
                    <td className="py-2 pr-3 text-text-primary">{b.employeeName}</td>
                    <td className="py-2 pr-3 text-text-secondary">{Math.round((b.totalMinutes / 60) * 10) / 10} hrs</td>
                  </tr>
                ))}
                {hoursBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-text-muted">
                      No hours found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ))}
      </div>
    </div>
  );
}
