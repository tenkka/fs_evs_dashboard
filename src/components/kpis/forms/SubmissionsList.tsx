"use client";

import { useMemo, useState } from "react";
import { FileCheck, Loader2, TriangleAlert, ChevronDown, ChevronUp } from "lucide-react";
import { useSubmissionsForFacility, useKpiForms, type AnswerValue } from "@/lib/kpiForms";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatAnswer(value: AnswerValue): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function SubmissionsList({ facilityScope }: { facilityScope: string }) {
  const { submissions, error } = useSubmissionsForFacility(facilityScope);
  const { forms } = useKpiForms();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fieldLabelsByForm = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const form of forms ?? []) {
      map.set(form.id, new Map(form.fields.map((f) => [f.id, f.label])));
    }
    return map;
  }, [forms]);

  const loading = !error && submissions === null;

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileCheck className="h-4 w-4 text-series-1" />
        <h2 className="text-sm font-medium text-text-primary">Recent Submissions</h2>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline px-6 py-10 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load submissions</p>
          <p className="max-w-sm text-sm text-text-muted">Error: {error}</p>
        </div>
      ) : loading || !submissions ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : submissions.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">No submissions yet.</p>
      ) : (
        <ul className="divide-y divide-border-hairline">
          {submissions.map((sub) => {
            const expanded = expandedId === sub.id;
            const labels = fieldLabelsByForm.get(sub.formId);
            return (
              <li key={sub.id} className="py-2.5">
                <button
                  onClick={() => setExpandedId(expanded ? null : sub.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text-primary">{sub.formTitle}</p>
                    <p className="truncate text-xs text-text-muted">
                      {sub.submittedByName} · {formatDate(sub.submittedAt)}
                    </p>
                  </div>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
                  )}
                </button>
                {expanded && (
                  <dl className="mt-2 space-y-1 rounded-md bg-surface-2/50 p-2.5">
                    {Object.entries(sub.answers).map(([fieldId, value]) => (
                      <div key={fieldId} className="flex justify-between gap-3 text-xs">
                        <dt className="text-text-muted">{labels?.get(fieldId) ?? fieldId}</dt>
                        <dd className="text-right text-text-primary">{formatAnswer(value)}</dd>
                      </div>
                    ))}
                    {Object.keys(sub.answers).length === 0 && <p className="text-xs text-text-muted">No answers recorded.</p>}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
