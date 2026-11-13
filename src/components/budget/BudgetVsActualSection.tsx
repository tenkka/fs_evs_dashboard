"use client";

import { useState } from "react";
import clsx from "clsx";
import { Loader2, TriangleAlert, DollarSign, Clock, Banknote } from "lucide-react";
import { useBudgetTargets, targetFor, BUDGET_SECTIONS, PERIOD_TYPES, type PeriodType, type BudgetSection } from "@/lib/budgets";
import {
  useActualMoneySeries,
  useActualLaborCostSeries,
  useActualHoursSeries,
  periodSeriesRanges,
  SERIES_LENGTH,
  type DateRangeKeys,
} from "@/lib/budgetActuals";
import { StatTile } from "@/components/ui/StatTile";
import { BudgetVsActualChart, type BudgetVsActualPoint } from "@/components/charts/BudgetVsActualChart";
import { BudgetBarDetail } from "@/components/budget/BudgetBarDetail";
import { SlotPicker, defaultSlotPickerState, slotPickerStateFor, referenceDateFor } from "@/components/budget/SlotPicker";

const SECTION_ICON: Record<BudgetSection, typeof DollarSign> = { spending: DollarSign, labor: Banknote, hours: Clock };

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatVariance(diff: number, isMoney: boolean): string {
  if (diff === 0) return "On budget";
  const magnitude = isMoney ? formatMoney(Math.abs(diff)) : `${Math.abs(diff)} hrs`;
  return `${magnitude} ${diff > 0 ? "over" : "under"}`;
}

/** The Budget page's landing view — a trend curve of the chosen section's target vs. real UKG/logged actuals. A time-slot picker anchors the window: the curve shows that instance plus its lead-up history, and the stat cards below reflect exactly that instance. */
export function BudgetVsActualSection({ facility, section }: { facility: string; section: BudgetSection }) {
  const [periodType, setPeriodType] = useState<PeriodType>("weekly");
  const [slotState, setSlotState] = useState(defaultSlotPickerState());
  const [detailRange, setDetailRange] = useState<DateRangeKeys | null>(null);
  const { targets, error: targetsError } = useBudgetTargets(facility);

  const referenceDate = referenceDateFor(periodType, slotState);
  const moneySeries = useActualMoneySeries(facility, periodType);
  const laborSeries = useActualLaborCostSeries(facility, periodType, section === "labor");
  const hoursSeries = useActualHoursSeries(facility, periodType, section === "hours");

  if (targetsError) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
        <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
        <p className="text-sm font-medium text-text-primary">Couldn&apos;t load budgets</p>
        <p className="max-w-sm text-sm text-text-muted">
          {targetsError === "permission-denied" ? "Firestore denied reading the budget targets." : `Error: ${targetsError}`}
        </p>
      </div>
    );
  }

  if (!targets) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  const active = BUDGET_SECTIONS.find((s) => s.value === section)!;
  const Icon = SECTION_ICON[section];
  const isMoney = section !== "hours";

  const ranges = periodSeriesRanges(periodType, SERIES_LENGTH[periodType], referenceDate);
  const selectedRange = ranges[ranges.length - 1];

  const actualSeries = section === "spending" ? moneySeries : section === "labor" ? laborSeries.series : hoursSeries.series;

  const seriesLoading = section === "labor" ? laborSeries.loading || !actualSeries : section === "hours" ? hoursSeries.loading || !actualSeries : !actualSeries;
  const seriesError = section === "labor" ? laborSeries.error : section === "hours" ? hoursSeries.error : null;

  const chartData: BudgetVsActualPoint[] = ranges.map((range, i) => ({
    name: range.axisLabel,
    budget: targetFor(targets, periodType, section, range.start),
    actual: actualSeries?.[i]?.value ?? 0,
  }));

  const selectedTarget = targetFor(targets, periodType, section, selectedRange.start);
  const selectedActual = actualSeries?.[ranges.length - 1]?.value ?? null;
  const diff = selectedActual !== null ? Math.round((selectedActual - selectedTarget) * 10) / 10 : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-text-primary">Budget vs. Actual Performance</h2>
          <p className="text-xs text-text-muted">{active.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-md border border-border-hairline p-1">
            {PERIOD_TYPES.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setPeriodType(p.value);
                  setSlotState(slotPickerStateFor(p.value, referenceDate));
                }}
                className={clsx(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  periodType === p.value ? "bg-series-1 text-white" : "text-text-secondary hover:bg-surface-2"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <SlotPicker period={periodType} state={slotState} onChange={setSlotState} />
        </div>
      </div>

      <p className="text-xs text-text-muted">Showing {selectedRange.label} and the {ranges.length - 1} periods before it.</p>

      <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
        {seriesError ? (
          <p className="py-16 text-center text-sm text-text-muted">Couldn&apos;t load actuals from UKG.</p>
        ) : seriesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : (
          <BudgetVsActualChart
            data={chartData}
            metric={isMoney ? "money" : "hours"}
            onActualBarClick={(i) => {
              setSlotState(slotPickerStateFor(periodType, new Date(`${ranges[i].start}T00:00:00`)));
              setDetailRange(ranges[i]);
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {seriesError ? (
          <p className="col-span-3 py-4 text-center text-sm text-text-muted">Couldn&apos;t load actuals from UKG.</p>
        ) : seriesLoading ? (
          <div className="col-span-3 flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : (
          <>
            <StatTile label="Budget" value={isMoney ? formatMoney(selectedTarget) : `${selectedTarget} hrs`} icon={Icon} />
            <StatTile label="Actual" value={isMoney ? formatMoney(selectedActual ?? 0) : `${selectedActual ?? 0} hrs`} icon={Icon} />
            <StatTile label="Variance" value={diff === null ? "—" : formatVariance(diff, isMoney)} icon={Icon} />
          </>
        )}
      </div>

      {detailRange && (
        <BudgetBarDetail
          key={`${section}-${detailRange.start}`}
          facility={facility}
          section={section}
          range={detailRange}
          onClose={() => setDetailRange(null)}
        />
      )}
    </div>
  );
}
