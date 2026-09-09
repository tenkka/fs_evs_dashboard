"use client";

import Link from "next/link";
import { ChevronLeft, ShieldCheck, ListChecks, AlertTriangle, CalendarDays } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { StatTile } from "@/components/ui/StatTile";
import { FoodSafetySectionChart } from "@/components/charts/FoodSafetySectionChart";
import { FoodSafetyChecklist } from "@/components/kpis/FoodSafetyChecklist";
import { auditMeta, auditTotals, openFindings } from "@/lib/foodSafetyAudit";
import { useAuthedUser } from "@/lib/UserContext";

export default function FoodSafetyAuditPage() {
  const { facilityScope } = useAuthedUser();
  const totals = auditTotals();
  const findings = openFindings();
  const auditDate = new Date(`${auditMeta.date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <Header title="Food Safety Audit" description={`Conducted ${auditDate} by ${auditMeta.auditor}`} />

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
            <p className="mt-1 max-w-sm text-sm text-text-muted">No food safety audit has been logged for this facility yet.</p>
          </div>
        ) : (
        <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Overall score" value={`${totals.pct}%`} icon={ShieldCheck} />
          <StatTile label="Items reviewed" value={String(totals.total)} icon={ListChecks} />
          <StatTile label="Non-compliant items" value={String(totals.nonCompliant)} icon={AlertTriangle} goodDirection="down" />
          <StatTile label="Last audit" value={auditDate} icon={CalendarDays} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-border-hairline bg-surface-1 p-4 lg:col-span-2">
            <div className="mb-1">
              <h2 className="text-sm font-medium text-text-primary">Compliance by category</h2>
              <p className="text-xs text-text-muted">Share of checklist items marked compliant, per section</p>
            </div>
            <FoodSafetySectionChart />
          </div>

          <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
            <div className="mb-3">
              <h2 className="text-sm font-medium text-text-primary">Open findings</h2>
              <p className="text-xs text-text-muted">From the corrective action log</p>
            </div>
            {findings.length === 0 ? (
              <p className="text-sm text-text-secondary">No open findings from this audit.</p>
            ) : (
              <ul className="space-y-4">
                {findings.map((f, i) => (
                  <li key={i} className="rounded-md border border-border-hairline p-3">
                    <p className="text-xs font-medium text-text-muted">{f.section}</p>
                    <p className="mt-1 text-sm text-text-primary">{f.item.text}</p>
                    {f.item.note && <p className="mt-2 text-sm text-status-critical">{f.item.note}</p>}
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <dt className="text-text-muted">Who&apos;s responsible</dt>
                      <dd className="text-text-secondary">Facilities / Maintenance</dd>
                      <dt className="text-text-muted">Time frame</dt>
                      <dd className="text-text-secondary">TBD</dd>
                      <dt className="text-text-muted">Date completed</dt>
                      <dd className="text-text-secondary">Pending</dd>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3">
            <h2 className="text-sm font-medium text-text-primary">Full checklist</h2>
            <p className="text-xs text-text-muted">All {totals.total} items, grouped by category</p>
          </div>
          <FoodSafetyChecklist />
        </div>
        </>
        )}
      </main>
      </RequireRole>
    </>
  );
}
