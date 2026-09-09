"use client";

import { Header } from "@/components/layout/Header";
import { FacilityAttendanceTable } from "@/components/attendance/FacilityAttendanceTable";
import { MyAttendanceHistory } from "@/components/attendance/MyAttendanceHistory";
import { facilityScopeName } from "@/lib/facilities";
import { useAuthedUser } from "@/lib/UserContext";

export default function AttendancePage() {
  const { persona, facilityScope } = useAuthedUser();

  if (persona.role === "employee") {
    return (
      <>
        <Header title="My Attendance" description="Your clock-in history — you only" />
        <main className="flex-1 space-y-6 p-5">
          <MyAttendanceHistory />
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Attendance" description={`Clock-in records — ${facilityScopeName(facilityScope)}`} />

      <main className="flex-1 space-y-6 p-5">
        <FacilityAttendanceTable facilityScope={facilityScope} />
      </main>
    </>
  );
}
