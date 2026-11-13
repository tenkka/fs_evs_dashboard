"use client";

import { useMemo } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { useAllBudgets, PERIOD_TYPES } from "@/lib/budgets";
import { useFacilityDocs } from "@/lib/firestoreFacilities";
import { facilityScopeName } from "@/lib/facilities";

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Read-only summary of every facility's budget targets — shown when "All Facilities" is selected. */
export function BudgetOverview({ onSelectFacility }: { onSelectFacility: (facility: string) => void }) {
  const facilityDocs = useFacilityDocs();

  const facilityIds = useMemo(() => {
    return Object.keys(facilityDocs ?? {}).sort((a, b) => facilityScopeName(a).localeCompare(facilityScopeName(b)));
  }, [facilityDocs]);

  const { budgets, error } = useAllBudgets(facilityIds);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
        <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
        <p className="text-sm font-medium text-text-primary">Couldn&apos;t load budgets</p>
        <p className="max-w-sm text-sm text-text-muted">
          {error === "permission-denied" ? "Firestore denied reading the budget targets." : `Error: ${error}`}
        </p>
      </div>
    );
  }

  if (!budgets || !facilityDocs) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1">
      <div className="border-b border-border-hairline p-4">
        <h2 className="text-sm font-medium text-text-primary">Facility Budget Summary</h2>
        <p className="text-xs text-text-muted">Select a facility to view or edit its targets.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
              <th className="px-4 py-2.5 font-medium">Facility</th>
              {PERIOD_TYPES.map(({ label, value }) => (
                <th key={value} className="px-4 py-2.5 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facilityIds.map((id) => {
              const budget = budgets[id];
              return (
                <tr
                  key={id}
                  onClick={() => onSelectFacility(id)}
                  className="cursor-pointer border-b border-border-hairline last:border-0 hover:bg-surface-2/60"
                >
                  <td className="px-4 py-2.5 text-text-primary">{facilityScopeName(id)}</td>
                  {PERIOD_TYPES.map(({ value }) => (
                    <td key={value} className="px-4 py-2.5 text-text-secondary">
                      {budget
                        ? `${formatMoney(budget[value].spending)} spend / ${formatMoney(budget[value].labor)} labor / ${budget[value].hours} hrs`
                        : "—"}
                    </td>
                  ))}
                </tr>
              );
            })}
            {facilityIds.length === 0 && (
              <tr>
                <td colSpan={1 + PERIOD_TYPES.length} className="px-4 py-6 text-center text-text-muted">
                  No facilities found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
