"use client";

import { useMemo, useState } from "react";
import { ListChecks, Loader2, TriangleAlert, Send } from "lucide-react";
import { useFacilityKpiForms, useKpiForms, type KpiForm } from "@/lib/kpiForms";
import { FillFormModal } from "@/components/kpis/forms/FillFormModal";
import { useAuthedUser } from "@/lib/UserContext";

export function FacilityFormsLog() {
  const { facilityScope } = useAuthedUser();
  const { facilityForms, error } = useFacilityKpiForms(facilityScope);
  const { forms } = useKpiForms();
  const [fillTarget, setFillTarget] = useState<KpiForm | null>(null);

  const formsById = useMemo(() => new Map((forms ?? []).map((f) => [f.id, f])), [forms]);
  const loading = !error && facilityForms === null;

  // Admins browsing "All Facilities" have no single facility's form list to show.
  if (facilityScope === "all") return null;

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-series-1" />
        <h2 className="text-sm font-medium text-text-primary">Browse &amp; Log Forms</h2>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline px-6 py-10 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load forms</p>
          <p className="max-w-sm text-sm text-text-muted">Error: {error}</p>
        </div>
      ) : loading || !facilityForms ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : facilityForms.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">No forms have been added for this facility yet.</p>
      ) : (
        <ul className="divide-y divide-border-hairline">
          {facilityForms.map((ff) => {
            const form = formsById.get(ff.formId);
            if (!form) return null;
            return (
              <li key={ff.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{form.title}</p>
                  <p className="truncate text-xs text-text-muted">{form.description || `${form.fields.length} fields`}</p>
                </div>
                <button
                  onClick={() => setFillTarget(form)}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-series-1 px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  <Send className="h-3.5 w-3.5" />
                  Log
                </button>
              </li>
            );
          })}
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
    </div>
  );
}
