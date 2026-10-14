"use client";

import { Header } from "@/components/layout/Header";
import { MyFormsList } from "@/components/myforms/MyFormsList";
import { FacilityFormsLog } from "@/components/myforms/FacilityFormsLog";

export default function MyFormsPage() {
  return (
    <>
      <Header title="My Forms" description="KPI forms assigned to you and available for your facility" />

      <main className="flex-1 space-y-6 p-5">
        <MyFormsList />
        <FacilityFormsLog />
      </main>
    </>
  );
}
