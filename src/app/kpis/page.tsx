"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { kpiCategories } from "@/lib/kpiCategories";
import { departments } from "@/lib/data";
import { useAuthedUser } from "@/lib/UserContext";
import { facilityScopeName } from "@/lib/facilities";

export default function KpisPage() {
  const { facilityScope } = useAuthedUser();

  return (
    <>
      <Header title="KPIs" description={`Performance metrics — ${facilityScopeName(facilityScope)}`} />

      <RequireRole roles={["manager", "admin"]}>
        <main className="flex-1 p-5">
          <div className="rounded-lg border border-border-hairline bg-surface-1">
            <ul className="divide-y divide-border-hairline">
              {kpiCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <li key={cat.slug}>
                    <Link href={`/kpis/${cat.slug}`} className="block transition-colors hover:bg-surface-2/60">
                      <div className="flex items-center gap-4 px-4 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-series-1/10 text-series-1">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text-primary">{cat.label}</p>
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: departments[cat.department].color }}
                              title={departments[cat.department].label}
                            />
                          </div>
                          <p className="truncate text-xs text-text-muted">{cat.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                      </div>
                    </Link>
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
