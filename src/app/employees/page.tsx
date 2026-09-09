"use client";

import { useMemo } from "react";
import { Users, User, UserCog } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { StatTile } from "@/components/ui/StatTile";
import { EmployeeDirectory } from "@/components/employees/EmployeeDirectory";
import { facilityScopeName } from "@/lib/facilities";
import { useFacilityUsers } from "@/lib/firestoreUsers";
import { useAuthedUser } from "@/lib/UserContext";

export default function EmployeesPage() {
  const { facilityScope } = useAuthedUser();
  const { users: allUsers, error } = useFacilityUsers(facilityScope);

  // Admins aren't shown on this page — it's a staff directory, not a system-user list.
  const users = useMemo(() => allUsers?.filter((u) => u.role !== "admin") ?? null, [allUsers]);
  const loading = !error && users === null;

  const total = users?.length ?? 0;
  const employeeCount = users?.filter((u) => u.role === "employee").length ?? 0;
  const managerCount = users?.filter((u) => u.role === "manager").length ?? 0;

  return (
    <>
      <Header title="Employees" description={`All registered staff — ${facilityScopeName(facilityScope)}`} />

      <RequireRole roles={["manager", "admin"]}>
        <main className="flex-1 space-y-6 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile label="Total Staff" value={String(total)} icon={Users} />
            <StatTile label="Employees" value={String(employeeCount)} icon={User} />
            <StatTile label="Managers" value={String(managerCount)} icon={UserCog} />
          </div>

          <EmployeeDirectory users={users} loading={loading} error={error} facilityScope={facilityScope} />
        </main>
      </RequireRole>
    </>
  );
}
