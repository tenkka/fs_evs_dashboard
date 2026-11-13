"use client";

import { useState } from "react";
import clsx from "clsx";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { BudgetEditor } from "@/components/budget/BudgetEditor";
import { BudgetOverview } from "@/components/budget/BudgetOverview";
import { BudgetVsActualSection } from "@/components/budget/BudgetVsActualSection";
import { BudgetHistoryList } from "@/components/budget/BudgetHistoryList";
import { BUDGET_SECTIONS, type BudgetSection } from "@/lib/budgets";
import { useAuthedUser } from "@/lib/UserContext";
import { facilityScopeName } from "@/lib/facilities";

export default function BudgetPage() {
  const { facilityScope, setFacilityScope } = useAuthedUser();
  const [section, setSection] = useState<BudgetSection>("spending");

  return (
    <>
      <Header title="Budget" description={`Weekly, monthly, quarterly, and yearly budget targets — ${facilityScopeName(facilityScope)}`} />

      <RequireRole roles={["admin"]}>
        <main className="flex-1 space-y-6 p-5">
          {facilityScope === "all" ? (
            <BudgetOverview onSelectFacility={setFacilityScope} />
          ) : (
            <>
              <div className="flex w-fit gap-1 rounded-md border border-border-hairline p-1">
                {BUDGET_SECTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSection(s.value)}
                    className={clsx(
                      "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                      section === s.value ? "bg-series-1 text-white" : "text-text-secondary hover:bg-surface-2"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <BudgetVsActualSection facility={facilityScope} section={section} />

              <div className="border-t border-border-hairline pt-6">
                <h2 className="mb-3 text-sm font-medium text-text-primary">Budget Targets</h2>
                <BudgetEditor facility={facilityScope} section={section} />
              </div>

              <div className="border-t border-border-hairline pt-6">
                <h2 className="mb-3 text-sm font-medium text-text-primary">Budget Change History</h2>
                <BudgetHistoryList facility={facilityScope} />
              </div>
            </>
          )}
        </main>
      </RequireRole>
    </>
  );
}
