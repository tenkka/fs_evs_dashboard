"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { TimesheetView } from "@/components/timesheet/TimesheetView";

export default function EmployeeTimesheetPage() {
  const params = useParams<{ employeeId: string }>();
  const employeeCode = params.employeeId;
  const [employeeName, setEmployeeName] = useState(employeeCode);

  return (
    <>
      <Header title="Timesheet" description={`${employeeName} — UKG Ready`} />

      <RequireRole roles={["manager", "admin"]}>
        <main className="flex-1 space-y-4 p-5">
          <Link href="/timesheet" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
            <ChevronLeft className="h-4 w-4" />
            Back to Timesheet
          </Link>

          <TimesheetView employeeCode={employeeCode} onEmployeeName={setEmployeeName} />
        </main>
      </RequireRole>
    </>
  );
}
