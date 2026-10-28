"use client";

import { Header } from "@/components/layout/Header";
import { MyFormsList } from "@/components/myforms/MyFormsList";
import { FacilityFormsLog } from "@/components/myforms/FacilityFormsLog";
import { FacilityFormsManager } from "@/components/kpis/forms/FacilityFormsManager";
import { useAuthedUser } from "@/lib/UserContext";

export default function MyFormsPage() {
  const { persona, facilityScope } = useAuthedUser();
  const canManage = persona.role === "manager" || persona.role === "admin";

  return (
    <>
      <Header title="Facility Forms" description="KPI forms assigned to you and available for your facility" />

      <main className="flex-1 space-y-6 p-5">
        <MyFormsList />
        {canManage && <FacilityFormsManager facilityScope={facilityScope} />}
        <FacilityFormsLog />
      </main>
    </>
  );
}
