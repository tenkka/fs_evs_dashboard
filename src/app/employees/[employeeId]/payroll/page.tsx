"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Loader2, TriangleAlert } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { PayrollHistory } from "@/components/employees/PayrollHistory";
import { useUserById } from "@/lib/firestoreUsers";

export default function EmployeePayrollPage() {
  const params = useParams<{ employeeId: string }>();
  const uid = params.employeeId;
  const { user, loading, error } = useUserById(uid);
  const [employeeName, setEmployeeName] = useState<string | null>(null);

  return (
    <>
      <Header title="Payroll" description={`${employeeName ?? user?.name ?? "Loading…"} — UKG Ready`} />

      <RequireRole roles={["admin"]}>
        <main className="flex-1 space-y-4 p-5">
          <Link href="/employees" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
            <ChevronLeft className="h-4 w-4" />
            Back to Employees
          </Link>

          {loading ? (
            <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
              <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
              <p className="text-sm font-medium text-text-primary">Couldn&apos;t load this employee</p>
              <p className="max-w-sm text-sm text-text-muted">
                {error === "permission-denied" ? "Firestore denied reading this user's profile." : `Error: ${error}`}
              </p>
            </div>
          ) : !user ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
              <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
              <p className="text-sm font-medium text-text-primary">Employee not found</p>
            </div>
          ) : !user.employeeId ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
              <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
              <p className="text-sm font-medium text-text-primary">Not linked to UKG yet</p>
              <p className="max-w-sm text-sm text-text-muted">
                {user.name} doesn&apos;t have a UKG Ready employee ID on file. Add one to view their payroll history.
              </p>
            </div>
          ) : (
            <PayrollHistory employeeCode={user.employeeId} onEmployeeName={setEmployeeName} />
          )}
        </main>
      </RequireRole>
    </>
  );
}
