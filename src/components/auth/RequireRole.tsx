"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuthedUser } from "@/lib/UserContext";
import { roleLabels, type Role } from "@/lib/auth";

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { persona } = useAuthedUser();

  if (roles.includes(persona.role)) {
    return <>{children}</>;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-critical/10 text-status-critical">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h2 className="text-sm font-medium text-text-primary">You don&apos;t have access to this page</h2>
      <p className="max-w-sm text-sm text-text-muted">
        {persona.name} is signed in as {roleLabels[persona.role]}. This section is only available to{" "}
        {roles.map((r) => roleLabels[r]).join(" and ")}.
      </p>
      <Link
        href="/attendance"
        className="mt-2 rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
      >
        Go to Attendance
      </Link>
    </main>
  );
}
