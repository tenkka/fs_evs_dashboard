"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Loader2, TriangleAlert } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { PersonalInfoCard } from "@/components/profile/PersonalInfoCard";
import { CertificatesSection } from "@/components/profile/CertificatesSection";
import { useUserById } from "@/lib/firestoreUsers";

export default function EmployeeProfilePage() {
  const params = useParams<{ employeeId: string }>();
  const uid = params.employeeId;
  const { user, loading, error } = useUserById(uid);

  return (
    <>
      <Header title="Employee Profile" description={user ? user.name : "Personal information and certificates"} />

      <RequireRole roles={["manager", "admin"]}>
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
          ) : (
            <div className="space-y-6">
              <PersonalInfoCard persona={user} />
              <CertificatesSection uid={user.id} />
            </div>
          )}
        </main>
      </RequireRole>
    </>
  );
}
