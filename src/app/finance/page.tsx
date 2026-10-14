"use client";

import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { WeeklySpendingLog } from "@/components/finance/WeeklySpendingLog";
import { SpendAnalytics } from "@/components/finance/SpendAnalytics";
import { useAuthedUser } from "@/lib/UserContext";
import { facilityScopeName } from "@/lib/facilities";

export default function FinancePage() {
  const { persona, facilityScope } = useAuthedUser();
  const canSubmit = persona.role === "manager" || persona.role === "admin";

  return (
    <>
      <Header title="Finance" description={`Weekly spending — ${facilityScopeName(facilityScope)}`} />

      <RequireRole roles={["manager", "admin"]}>
        <main className="flex-1 space-y-6 p-5">
          <SpendAnalytics facilityScope={facilityScope} />
          <WeeklySpendingLog facilityScope={facilityScope} canSubmit={canSubmit} />
        </main>
      </RequireRole>
    </>
  );
}
