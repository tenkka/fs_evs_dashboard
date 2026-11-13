"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, TriangleAlert, Users, Clock } from "lucide-react";

type Employee = { id: string; name: string; employeeId: string };
type LoadState = { employees: Employee[] } | { error: string } | null;

/** The facility's active UKG Ready employees, each linking to their timesheet. Manager/admin view. */
export function EmployeeRoster() {
  const [state, setState] = useState<LoadState>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ukg/employees")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ error: data.error ?? "Something went wrong." });
          return;
        }
        setState({ employees: data.employees });
      })
      .catch(() => {
        if (!cancelled) setState({ error: "Couldn't reach the server." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-series-1" />
        <h2 className="text-sm font-medium text-text-primary">Employees</h2>
      </div>

      {state === null ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : "error" in state ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline px-6 py-10 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load employees</p>
          <p className="max-w-md text-sm text-text-muted">{state.error}</p>
        </div>
      ) : state.employees.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">No employees returned.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Employee ID</th>
              <th className="w-20 py-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {state.employees.map((employee) => (
              <tr key={employee.id} className="border-b border-border-hairline last:border-0">
                <td className="py-2 text-text-primary">{employee.name}</td>
                <td className="py-2 text-text-secondary">{employee.employeeId}</td>
                <td className="py-2">
                  <Link
                    href={`/timesheet/${encodeURIComponent(employee.employeeId)}`}
                    className="inline-flex items-center gap-1 text-series-1 hover:underline"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
