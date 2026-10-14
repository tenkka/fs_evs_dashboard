"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Loader2, TriangleAlert, CheckCircle2, Clock, Send } from "lucide-react";
import {
  useAssignmentsForUser,
  useSubmissionsForUser,
  useKpiForms,
  isAssignmentDoneForCurrentPeriod,
  recurrenceLabel,
  type FormAssignment,
} from "@/lib/kpiForms";
import { FillFormModal } from "@/components/kpis/forms/FillFormModal";
import { useAuthedUser } from "@/lib/UserContext";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function MyFormsList() {
  const { persona } = useAuthedUser();
  const { assignments, error } = useAssignmentsForUser(persona.id);
  const { submissions } = useSubmissionsForUser(persona.id);
  const { forms } = useKpiForms();
  const [fillTarget, setFillTarget] = useState<FormAssignment | null>(null);

  const formsById = useMemo(() => new Map((forms ?? []).map((f) => [f.id, f])), [forms]);

  const loading = !error && assignments === null;
  const pending = (assignments ?? []).filter((a) => !isAssignmentDoneForCurrentPeriod(a, submissions ?? []));
  const completed = (assignments ?? []).filter((a) => isAssignmentDoneForCurrentPeriod(a, submissions ?? []));

  const fillForm = fillTarget ? formsById.get(fillTarget.formId) : null;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load your forms</p>
          <p className="max-w-sm text-sm text-text-muted">
            {error === "permission-denied"
              ? "Firestore denied reading the kpiFormAssignments collection. Make sure it allows read access to signed-in users."
              : `Error: ${error}`}
          </p>
        </div>
      ) : loading || !assignments ? (
        <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
          <ClipboardList className="h-6 w-6 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">No forms assigned</p>
          <p className="max-w-sm text-sm text-text-muted">Forms a manager assigns to you will show up here.</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#8a5a00]" />
              <h2 className="text-sm font-medium text-text-primary">Pending</h2>
            </div>
            {pending.length === 0 ? (
              <p className="text-sm text-text-muted">Nothing pending — you&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y divide-border-hairline">
                {pending.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{a.formTitle}</p>
                      <p className="truncate text-xs text-text-muted">
                        {recurrenceLabel(a)} · assigned by {a.assignedByName}
                        {a.dueDate ? ` · due ${formatDate(a.dueDate)}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => setFillTarget(a)}
                      className="flex shrink-0 items-center gap-1 rounded-md bg-series-1 px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Fill out
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {completed.length > 0 && (
            <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-status-good" />
                <h2 className="text-sm font-medium text-text-primary">Completed</h2>
              </div>
              <ul className="divide-y divide-border-hairline">
                {completed.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text-primary">{a.formTitle}</p>
                      <p className="truncate text-xs text-text-muted">
                        {recurrenceLabel(a)} · assigned by {a.assignedByName}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-status-good/10 px-2.5 py-1 text-xs font-medium text-status-good">Completed</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {fillTarget && fillForm && (
        <FillFormModal
          form={fillForm}
          facility={fillTarget.facility}
          assignment={fillTarget}
          onClose={() => setFillTarget(null)}
          onSubmitted={() => setFillTarget(null)}
        />
      )}
    </div>
  );
}
