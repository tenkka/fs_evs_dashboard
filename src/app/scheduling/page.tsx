"use client";

import { Header } from "@/components/layout/Header";
import { ScheduleCalendar } from "@/components/scheduling/ScheduleCalendar";
import { facilityScopeName } from "@/lib/facilities";
import { useAuthedUser } from "@/lib/UserContext";

export default function SchedulingPage() {
  const { persona, facilityScope } = useAuthedUser();
  const canEdit = persona.role === "manager" || persona.role === "admin";

  return (
    <>
      <Header title="Scheduling" description={`Weekly shift assignments — ${facilityScopeName(facilityScope)}`} />

      <main className="flex-1 space-y-6 p-5">
        <ScheduleCalendar facilityScope={facilityScope} canEdit={canEdit} />
      </main>
    </>
  );
}
