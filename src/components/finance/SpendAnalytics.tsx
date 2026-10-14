"use client";

import { useMemo, useState } from "react";
import { DollarSign, UtensilsCrossed, SprayCan, Receipt } from "lucide-react";
import clsx from "clsx";
import { useSpendingEntries, COMMON_PLATFORMS } from "@/lib/weeklySpending";
import { useFacilityDocs } from "@/lib/firestoreFacilities";
import { currentWeekDates } from "@/lib/timeFormat";
import { StatTile } from "@/components/ui/StatTile";
import { SpendTrendChart, type SpendTrendMode } from "@/components/charts/SpendTrendChart";
import { SpendByCategoryChart } from "@/components/charts/SpendByCategoryChart";

const trendModes: { label: string; value: SpendTrendMode }[] = [
  { label: "Total", value: "total" },
  { label: "FS / EVS", value: "department" },
];

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Colors are assigned once per entity, in a fixed order, so a bar's color never
// shifts just because the current filter changes which entities are present.
const CATEGORY_COLOR_RAMP = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
];

function colorFor(name: string, fixedOrder: string[]): string {
  const i = fixedOrder.indexOf(name);
  return CATEGORY_COLOR_RAMP[i >= 0 ? i % CATEGORY_COLOR_RAMP.length : CATEGORY_COLOR_RAMP.length - 1];
}

export function SpendAnalytics({ facilityScope }: { facilityScope: string }) {
  const { entries } = useSpendingEntries(facilityScope);
  const facilityDocs = useFacilityDocs();
  const [trendMode, setTrendMode] = useState<SpendTrendMode>("department");

  const trendData = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    const byWeek = new Map<string, { label: string; FS: number; EVS: number }>();
    for (const e of entries) {
      const week = currentWeekDates(e.createdAt)[0];
      const existing = byWeek.get(week.date) ?? { label: week.dateLabel, FS: 0, EVS: 0 };
      existing[e.department] += e.amount;
      byWeek.set(week.date, existing);
    }
    return Array.from(byWeek.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => {
        const FS = Math.round(v.FS * 100) / 100;
        const EVS = Math.round(v.EVS * 100) / 100;
        return { week: v.label, FS, EVS, total: Math.round((FS + EVS) * 100) / 100 };
      });
  }, [entries]);

  const platformData = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    const totals = new Map<string, number>();
    for (const e of entries) {
      totals.set(e.platform, (totals.get(e.platform) ?? 0) + e.amount);
    }
    return Array.from(totals.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100, color: colorFor(name, COMMON_PLATFORMS) }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries]);

  const facilityOrder = useMemo(
    () => Object.values(facilityDocs ?? {}).map((f) => f.id).sort((a, b) => (facilityDocs?.[a]?.name ?? a).localeCompare(facilityDocs?.[b]?.name ?? b)),
    [facilityDocs]
  );

  const facilityData = useMemo(() => {
    if (!entries || entries.length === 0 || facilityScope !== "all") return [];
    const totals = new Map<string, number>();
    for (const e of entries) {
      totals.set(e.facility, (totals.get(e.facility) ?? 0) + e.amount);
    }
    return Array.from(totals.entries())
      .map(([id, amount]) => ({
        name: facilityDocs?.[id]?.name ?? id,
        amount: Math.round(amount * 100) / 100,
        color: colorFor(id, facilityOrder),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries, facilityDocs, facilityOrder, facilityScope]);

  if (!entries || entries.length === 0) return null;

  const allTimeTotal = entries.reduce((sum, e) => sum + e.amount, 0);
  const fsTotal = entries.filter((e) => e.department === "FS").reduce((sum, e) => sum + e.amount, 0);
  const evsTotal = entries.filter((e) => e.department === "EVS").reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="All-Time Total" value={formatCurrency(allTimeTotal)} icon={DollarSign} />
        <StatTile label="Food Service" value={formatCurrency(fsTotal)} icon={UtensilsCrossed} />
        <StatTile label="Environmental Services" value={formatCurrency(evsTotal)} icon={SprayCan} />
        <StatTile label="Logged Entries" value={String(entries.length)} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border-hairline bg-surface-1 p-4 lg:col-span-2">
          <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-text-primary">Spend by week</h2>
              <p className="text-xs text-text-muted">
                {trendMode === "total" ? "Combined total, by week logged" : "Food Service vs. Environmental Services, by week logged"}
              </p>
            </div>
            <div className="flex gap-1 rounded-md border border-border-hairline p-1">
              {trendModes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setTrendMode(m.value)}
                  className={clsx(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    trendMode === m.value ? "bg-series-1 text-white" : "text-text-secondary hover:bg-surface-2"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <SpendTrendChart data={trendData} mode={trendMode} />
        </div>

        <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
          <div className="mb-1">
            <h2 className="text-sm font-medium text-text-primary">Spend by platform</h2>
            <p className="text-xs text-text-muted">Total logged per vendor</p>
          </div>
          <SpendByCategoryChart data={platformData} />
        </div>
      </div>

      {facilityData.length > 0 && (
        <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
          <div className="mb-1">
            <h2 className="text-sm font-medium text-text-primary">Spend by facility</h2>
            <p className="text-xs text-text-muted">Total logged across all facilities</p>
          </div>
          <SpendByCategoryChart data={facilityData} />
        </div>
      )}
    </div>
  );
}
