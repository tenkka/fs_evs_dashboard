"use client";

import Link from "next/link";
import { ChevronLeft, UtensilsCrossed, TrendingUp, CalendarRange, Gauge } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { StatTile } from "@/components/ui/StatTile";
import { PatientMealsChart } from "@/components/charts/PatientMealsChart";
import { PatientMealsTable } from "@/components/kpis/PatientMealsTable";
import { patientMealCounts, patientMealDayTotal } from "@/lib/data";
import { useAuthedUser } from "@/lib/UserContext";

export default function PatientCountKpiPage() {
  const { facilityScope } = useAuthedUser();
  const totals = patientMealCounts.map(patientMealDayTotal);
  const weekTotal = totals.reduce((a, b) => a + b, 0);
  const avgPerDay = Math.round((weekTotal / totals.length) * 10) / 10;
  const peakIndex = totals.indexOf(Math.max(...totals));
  const peakDay = patientMealCounts[peakIndex];

  return (
    <>
      <Header title="Patient Meal Counts" description="Tray counts by meal, Aug 2 – Aug 8, 2026" />

      <RequireRole roles={["manager", "admin"]}>
      <main className="flex-1 space-y-6 p-5">
        <Link
          href="/kpis"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to KPIs
        </Link>

        {facilityScope === "lakeside" ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
            <p className="text-sm font-medium text-text-primary">No data for Lakeside Medical Center</p>
            <p className="mt-1 max-w-sm text-sm text-text-muted">Patient meal counts haven&apos;t been recorded for this facility yet.</p>
          </div>
        ) : (
        <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total trays this week" value={String(weekTotal)} icon={UtensilsCrossed} />
          <StatTile label="Avg. meals / day" value={String(avgPerDay)} icon={TrendingUp} />
          <StatTile
            label="Peak day"
            value={`${peakDay.weekday.slice(0, 3)} · ${totals[peakIndex]}`}
            icon={CalendarRange}
          />
          <StatTile label="Days tracked" value={String(patientMealCounts.length)} icon={Gauge} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-border-hairline bg-surface-1 p-4 lg:col-span-2">
            <div className="mb-1">
              <h2 className="text-sm font-medium text-text-primary">Meal composition by day</h2>
              <p className="text-xs text-text-muted">Breakfast, lunch, and dinner trays served to patients</p>
            </div>
            <PatientMealsChart />
          </div>

          <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
            <div className="mb-3">
              <h2 className="text-sm font-medium text-text-primary">Notes</h2>
            </div>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>Dr Meals and Guest Meals were 0 for every day this week.</li>
              <li>Thursday was the highest-volume day at 98 total trays.</li>
              <li>Sunday was the lowest at 37 total trays.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-border-hairline bg-surface-1">
          <PatientMealsTable />
        </div>
        </>
        )}
      </main>
      </RequireRole>
    </>
  );
}
