"use client";

import { TriangleAlert } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useAuthedUser } from "@/lib/UserContext";
import { TimesheetView } from "@/components/timesheet/TimesheetView";
import { EmployeeRoster } from "@/components/timesheet/EmployeeRoster";

export default function TimesheetPage() {
  const { persona } = useAuthedUser();
  const isStaffView = persona.role === "manager" || persona.role === "admin";

  return (
    <>
      <Header
        title="Timesheet"
        description={isStaffView ? "Active employees — UKG Ready" : "Your hours — UKG Ready"}
      />

      <main className="flex-1 space-y-4 p-5">
        {isStaffView ? (
          <EmployeeRoster />
        ) : persona.employeeId ? (
          <TimesheetView employeeCode={persona.employeeId} />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
            <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
            <p className="text-sm font-medium text-text-primary">Not linked to UKG yet</p>
            <p className="max-w-sm text-sm text-text-muted">
              Your account doesn&apos;t have a UKG Ready employee ID on file. Ask your administrator to add one.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
