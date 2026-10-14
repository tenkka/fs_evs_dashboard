"use client";

import { useMemo, useState } from "react";
import { ListChecks, Loader2, TriangleAlert, Check, Plus } from "lucide-react";
import clsx from "clsx";
import { useKpiForms, useFacilityKpiForms, addFacilityKpiForm, removeFacilityKpiForm } from "@/lib/kpiForms";
import { useAuthedUser } from "@/lib/UserContext";
import { useFacilityDocs } from "@/lib/firestoreFacilities";

export function FacilityFormsManager({ facilityScope }: { facilityScope: string }) {
  const { persona } = useAuthedUser();
  const facilityDocs = useFacilityDocs();
  const facilityOptions = useMemo(
    () => Object.values(facilityDocs ?? {}).sort((a, b) => a.name.localeCompare(b.name)),
    [facilityDocs]
  );
  const [pickedFacility, setPickedFacility] = useState("");
  const effectiveFacility = facilityScope !== "all" ? facilityScope : pickedFacility;

  const { forms, error: formsError } = useKpiForms();
  const { facilityForms, error } = useFacilityKpiForms(effectiveFacility);
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeByFormId = useMemo(() => new Map((facilityForms ?? []).map((f) => [f.formId, f])), [facilityForms]);

  const toggle = async (formId: string, formTitle: string) => {
    if (!effectiveFacility) return;
    setBusyId(formId);
    try {
      const existing = activeByFormId.get(formId);
      if (existing) await removeFacilityKpiForm(existing.id);
      else await addFacilityKpiForm(effectiveFacility, formId, formTitle, persona.name);
    } finally {
      setBusyId(null);
    }
  };

  const loading = !!effectiveFacility && !formsError && !error && (forms === null || facilityForms === null);
  const combinedError = formsError ?? error;

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-series-1" />
          <h2 className="text-sm font-medium text-text-primary">Facility Forms</h2>
        </div>
        {facilityScope === "all" && (
          <select
            value={pickedFacility}
            onChange={(e) => setPickedFacility(e.target.value)}
            className="rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
          >
            <option value="">Select facility</option>
            {facilityOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="mb-3 text-xs text-text-muted">
        Choose which forms this facility needs. Added forms become visible to everyone in the facility to log.
      </p>

      {!effectiveFacility ? (
        <p className="py-4 text-center text-sm text-text-muted">Select a facility above to manage its forms.</p>
      ) : combinedError ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline px-6 py-10 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load forms</p>
          <p className="max-w-sm text-sm text-text-muted">Error: {combinedError}</p>
        </div>
      ) : loading || !forms ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : forms.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">No KPI forms exist yet.</p>
      ) : (
        <ul className="divide-y divide-border-hairline">
          {forms.map((form) => {
            const active = activeByFormId.has(form.id);
            return (
              <li key={form.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-primary">{form.title}</p>
                  <p className="truncate text-xs text-text-muted">{form.fields.length} fields</p>
                </div>
                <button
                  onClick={() => toggle(form.id, form.title)}
                  disabled={busyId === form.id}
                  className={clsx(
                    "flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50",
                    active ? "border-series-1 bg-series-1/10 text-series-1" : "border-border-hairline text-text-secondary hover:bg-surface-2"
                  )}
                >
                  {active ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {active ? "Added" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
