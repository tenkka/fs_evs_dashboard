"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { kpiCategories } from "@/lib/kpiCategories";
import { departments } from "@/lib/data";
import { useAuthedUser } from "@/lib/UserContext";
import { facilityScopeName } from "@/lib/facilities";

export default function KpisPage() {
  const { facilityScope } = useAuthedUser();
  const hasData = facilityScope !== "lakeside";

  return (
    <>
      <Header title="KPIs" description={`Performance metrics — ${facilityScopeName(facilityScope)}`} />

      <RequireRole roles={["manager", "admin"]}>
        <main className="flex-1 p-5">
          {!hasData && (
            <div className="mb-4 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-4 py-3 text-sm text-text-muted">
              No KPI data has been recorded for Lakeside Medical Center yet.
            </div>
          )}
          <div className="rounded-lg border border-border-hairline bg-surface-1">
            <ul className="divide-y divide-border-hairline">
              {kpiCategories.map((cat) => {
                const Icon = cat.icon;
                const active = cat.status === "active" && (cat.dataSource === "live" || hasData);
                const content = (
                  <div className="flex items-center gap-4 px-4 py-4">
                    <div
                      className={clsx(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                        active ? "bg-series-1/10 text-series-1" : "bg-surface-2 text-text-muted"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={clsx("text-sm font-medium", active ? "text-text-primary" : "text-text-secondary")}>
                          {cat.label}
                        </p>
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: departments[cat.department].color }}
                          title={departments[cat.department].label}
                        />
                      </div>
                      <p className="truncate text-xs text-text-muted">{cat.description}</p>
                    </div>
                    {active ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                    ) : (
                      <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-muted">
                        {hasData ? "Coming soon" : "No data"}
                      </span>
                    )}
                  </div>
                );

                return (
                  <li key={cat.slug}>
                    {active ? (
                      <Link href={`/kpis/${cat.slug}`} className="block transition-colors hover:bg-surface-2/60">
                        {content}
                      </Link>
                    ) : (
                      <div className="cursor-not-allowed opacity-70">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </main>
      </RequireRole>
    </>
  );
}
