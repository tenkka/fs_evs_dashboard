"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Loader2, TriangleAlert } from "lucide-react";
import type { Persona, Role } from "@/lib/auth";
import { roleLabels } from "@/lib/auth";
import { facilityScopeName } from "@/lib/facilities";
import { useFacilityDocs } from "@/lib/firestoreFacilities";

// Admins are filtered out before this component ever sees them (see employees/page.tsx) —
// this is a staff directory, not a system-user list — so only these two roles are selectable.
type StaffRole = Exclude<Role, "admin">;

const filters: { label: string; value: StaffRole | "All" }[] = [
  { label: "All roles", value: "All" },
  { label: "Employee", value: "employee" },
  { label: "Manager", value: "manager" },
];

const roleBadgeClass: Record<Role, string> = {
  employee: "bg-series-1/10 text-series-1",
  manager: "bg-series-3/10 text-series-3",
  admin: "bg-series-7/10 text-series-7",
};

export function EmployeeDirectory({
  users,
  loading,
  error,
  facilityScope,
}: {
  users: Persona[] | null;
  loading: boolean;
  error: string | null;
  facilityScope: string;
}) {
  const [filter, setFilter] = useState<StaffRole | "All">("All");
  const facilityDocs = useFacilityDocs();

  const rows = useMemo(() => {
    return (users ?? []).filter((u) => filter === "All" || u.role === filter);
  }, [users, filter]);

  const showFacilityColumn = facilityScope === "all";

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
        <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
        <p className="text-sm font-medium text-text-primary">Couldn&apos;t load the staff directory</p>
        <p className="max-w-sm text-sm text-text-muted">
          {error === "permission-denied"
            ? "Firestore denied reading the users collection. Managers and Admins need broader read access than the default \"read your own doc only\" rule — see below."
            : `Error: ${error}`}
        </p>
        {error === "permission-denied" && (
          <pre className="mt-2 max-w-sm overflow-x-auto rounded-md bg-surface-2 p-3 text-left text-xs text-text-secondary">
{`match /users/{userId} {
  allow read: if request.auth != null;
}`}
          </pre>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-hairline p-4">
        <div>
          <h2 className="text-sm font-medium text-text-primary">Staff directory</h2>
          <p className="text-xs text-text-muted">{rows.length} users · from Firestore</p>
        </div>
        <div className="flex gap-1 rounded-md border border-border-hairline p-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.value ? "bg-series-1 text-white" : "text-text-secondary hover:bg-surface-2"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              {showFacilityColumn && <th className="px-4 py-2.5 font-medium">Facility</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-border-hairline last:border-0 hover:bg-surface-2/60">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-series-1/10 text-xs font-medium text-series-1">
                      {u.initials}
                    </span>
                    <span className="text-text-primary">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-text-secondary">{u.email}</td>
                <td className="px-4 py-2.5">
                  <span className={clsx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", roleBadgeClass[u.role])}>
                    {roleLabels[u.role]}
                  </span>
                </td>
                {showFacilityColumn && (
                  <td className="px-4 py-2.5 text-text-secondary">
                    {facilityDocs?.[u.facility]?.name ?? facilityScopeName(u.facility)}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={showFacilityColumn ? 4 : 3} className="px-4 py-6 text-center text-text-muted">
                  No users match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
