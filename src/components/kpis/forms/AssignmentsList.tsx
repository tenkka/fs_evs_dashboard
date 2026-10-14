"use client";

import { ClipboardCheck, Loader2, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { useAssignmentsForFacility, useSubmissionsForFacility, isAssignmentDoneForCurrentPeriod, recurrenceLabel } from "@/lib/kpiForms";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AssignmentsList({ facilityScope }: { facilityScope: string }) {
  const { assignments, error } = useAssignmentsForFacility(facilityScope);
  const { submissions } = useSubmissionsForFacility(facilityScope);
  const loading = !error && assignments === null;

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-series-1" />
        <h2 className="text-sm font-medium text-text-primary">Assigned Forms</h2>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline px-6 py-10 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load assignments</p>
          <p className="max-w-sm text-sm text-text-muted">Error: {error}</p>
        </div>
      ) : loading || !assignments ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : assignments.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">No forms assigned yet.</p>
      ) : (
        <ul className="divide-y divide-border-hairline">
          {assignments.map((a) => {
            const done = isAssignmentDoneForCurrentPeriod(a, submissions ?? []);
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-primary">{a.formTitle}</p>
                  <p className="truncate text-xs text-text-muted">
                    {a.assignedToName} · {recurrenceLabel(a)} · assigned by {a.assignedByName}
                    {a.dueDate ? ` · due ${formatDate(a.dueDate)}` : ""}
                  </p>
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                    done ? "bg-status-good/10 text-status-good" : "bg-status-warning/15 text-[#8a5a00]"
                  )}
                >
                  {done ? "Completed" : "Pending"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
