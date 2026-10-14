"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { FacilityFormsManager } from "@/components/kpis/forms/FacilityFormsManager";
import { FormLibrary } from "@/components/kpis/forms/FormLibrary";
import { AssignmentsList } from "@/components/kpis/forms/AssignmentsList";
import { SubmissionsList } from "@/components/kpis/forms/SubmissionsList";
import { SubmissionAnalytics } from "@/components/kpis/forms/SubmissionAnalytics";
import { useAuthedUser } from "@/lib/UserContext";
import { facilityScopeName } from "@/lib/facilities";

export default function KpiFormsPage() {
  const { facilityScope } = useAuthedUser();

  return (
    <>
      <Header title="KPI Forms" description={`Form library, assignments, and submissions — ${facilityScopeName(facilityScope)}`} />

      <RequireRole roles={["manager", "admin"]}>
        <main className="flex-1 space-y-6 p-5">
          <Link href="/kpis" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
            <ChevronLeft className="h-4 w-4" />
            Back to KPIs
          </Link>

          <FacilityFormsManager facilityScope={facilityScope} />

          <FormLibrary facilityScope={facilityScope} />

          <SubmissionAnalytics facilityScope={facilityScope} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AssignmentsList facilityScope={facilityScope} />
            <SubmissionsList facilityScope={facilityScope} />
          </div>
        </main>
      </RequireRole>
    </>
  );
}
