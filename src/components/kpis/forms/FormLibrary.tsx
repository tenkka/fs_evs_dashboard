"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Loader2, TriangleAlert, UserPlus, Send } from "lucide-react";
import { useKpiForms, useFacilityKpiForms, type KpiForm } from "@/lib/kpiForms";
import { FillFormModal } from "./FillFormModal";
import { AssignFormModal } from "./AssignFormModal";

export function FormLibrary({ facilityScope }: { facilityScope: string }) {
  const { forms, error } = useKpiForms();
  const { facilityForms, error: facilityFormsError } = useFacilityKpiForms(facilityScope);
  const [fillTarget, setFillTarget] = useState<KpiForm | null>(null);
  const [assignTarget, setAssignTarget] = useState<KpiForm | null>(null);

  const activeFormIds = useMemo(() => new Set((facilityForms ?? []).map((f) => f.formId)), [facilityForms]);
  const facilityForms_ = useMemo(() => (forms ?? []).filter((f) => activeFormIds.has(f.id)), [forms, activeFormIds]);

  const loading = facilityScope !== "all" && !error && !facilityFormsError && (forms === null || facilityForms === null);
  const combinedError = error ?? facilityFormsError;

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-series-1" />
        <h2 className="text-sm font-medium text-text-primary">Form Library</h2>
      </div>

      {facilityScope === "all" ? (
        <p className="py-4 text-center text-sm text-text-muted">Select a specific facility above to fill out or assign its forms.</p>
      ) : combinedError ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline px-6 py-10 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load forms</p>
          <p className="max-w-sm text-sm text-text-muted">
            {combinedError === "permission-denied"
              ? "Firestore denied reading forms. Make sure kpiForms and facilityKpiForms allow read access to signed-in users."
              : `Error: ${combinedError}`}
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : facilityForms_.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">
          No forms added for this facility yet — use Facility Forms below to add the ones you need.
        </p>
      ) : (
        <ul className="divide-y divide-border-hairline">
          {facilityForms_.map((form) => (
            <li key={form.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{form.title}</p>
                <p className="truncate text-xs text-text-muted">{form.description || `${form.fields.length} fields`}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setAssignTarget(form)}
                  className="flex items-center gap-1 rounded-md border border-border-hairline px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-2"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Assign
                </button>
                <button
                  onClick={() => setFillTarget(form)}
                  className="flex items-center gap-1 rounded-md bg-series-1 px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  <Send className="h-3.5 w-3.5" />
                  Fill out
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {fillTarget && (
        <FillFormModal
          form={fillTarget}
          facility={facilityScope}
          onClose={() => setFillTarget(null)}
          onSubmitted={() => setFillTarget(null)}
        />
      )}
      {assignTarget && (
        <AssignFormModal
          form={assignTarget}
          facilityScope={facilityScope}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}
