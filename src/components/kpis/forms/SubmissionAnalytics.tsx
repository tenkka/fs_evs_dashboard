"use client";

import { useMemo, useState } from "react";
import { BarChart3, Loader2, TriangleAlert, FileCheck } from "lucide-react";
import { useSubmissionsForFacility, useKpiForms, type KpiForm, type FormFieldDef, type AnswerValue } from "@/lib/kpiForms";
import { StatTile } from "@/components/ui/StatTile";
import { FieldTrendChart } from "@/components/charts/FieldTrendChart";
import { FieldDistributionChart } from "@/components/charts/FieldDistributionChart";

const CHOOSABLE_TYPES = new Set<FormFieldDef["type"]>(["boolean", "compliance", "rating", "select"]);
const INDIVIDUAL_CHART_LIMIT = 8;

const COLOR_RAMP = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
];

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Fixed option order per field type, so a given answer always gets the same color/position
// regardless of how many submissions picked it.
function optionsFor(field: FormFieldDef): string[] {
  if (field.type === "boolean") return ["Yes", "No"];
  if (field.type === "compliance") return ["Compliant", "Non-Compliant", "N/A"];
  if (field.type === "rating") return ["1", "2", "3", "4", "5"];
  if (field.type === "select") return field.options ?? [];
  return [];
}

function answerLabel(field: FormFieldDef, value: AnswerValue): string {
  if (field.type === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function SubmissionAnalytics({ facilityScope }: { facilityScope: string }) {
  const { submissions, error } = useSubmissionsForFacility(facilityScope);
  const { forms } = useKpiForms();
  const [selectedFormId, setSelectedFormId] = useState("");

  const formsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sub of submissions ?? []) counts.set(sub.formId, (counts.get(sub.formId) ?? 0) + 1);
    return (forms ?? [])
      .map((form) => ({ form, count: counts.get(form.id) ?? 0 }))
      .filter((f) => f.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [forms, submissions]);

  const effectiveFormId = selectedFormId || formsWithCounts[0]?.form.id || "";
  const form: KpiForm | undefined = formsWithCounts.find((f) => f.form.id === effectiveFormId)?.form;

  const formSubmissions = useMemo(
    () => (submissions ?? []).filter((s) => s.formId === effectiveFormId).sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()),
    [submissions, effectiveFormId]
  );

  const numberFields = useMemo(() => (form?.fields ?? []).filter((f) => f.type === "number"), [form]);
  const choosableFields = useMemo(() => (form?.fields ?? []).filter((f) => CHOOSABLE_TYPES.has(f.type)), [form]);
  const useAggregate = choosableFields.length > INDIVIDUAL_CHART_LIMIT;

  const trendData = useMemo(() => {
    const byField = new Map<string, { label: string; value: number }[]>();
    for (const field of numberFields) {
      byField.set(
        field.id,
        formSubmissions
          .filter((s) => typeof s.answers[field.id] === "number")
          .map((s) => ({ label: formatDate(s.submittedAt), value: s.answers[field.id] as number }))
      );
    }
    return byField;
  }, [formSubmissions, numberFields]);

  const distributionData = useMemo(() => {
    const byField = new Map<string, { label: string; count: number; color: string }[]>();
    for (const field of choosableFields) {
      const options = optionsFor(field);
      const counts = new Map<string, number>();
      for (const sub of formSubmissions) {
        const raw = sub.answers[field.id];
        if (raw === undefined) continue;
        const key = answerLabel(field, raw);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      byField.set(
        field.id,
        options.filter((opt) => counts.has(opt)).map((opt) => ({ label: opt, count: counts.get(opt)!, color: COLOR_RAMP[options.indexOf(opt) % COLOR_RAMP.length] }))
      );
    }
    return byField;
  }, [formSubmissions, choosableFields]);

  const aggregateDistribution = useMemo(() => {
    if (!useAggregate || choosableFields.length === 0) return [];
    const options = optionsFor(choosableFields[0]);
    const counts = new Map<string, number>();
    for (const field of choosableFields) {
      for (const sub of formSubmissions) {
        const raw = sub.answers[field.id];
        if (raw === undefined) continue;
        const key = answerLabel(field, raw);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return options
      .filter((opt) => counts.has(opt))
      .map((opt) => ({ label: opt, count: counts.get(opt)!, color: COLOR_RAMP[options.indexOf(opt) % COLOR_RAMP.length] }));
  }, [useAggregate, choosableFields, formSubmissions]);

  const loading = !error && submissions === null;

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-series-1" />
          <h2 className="text-sm font-medium text-text-primary">Submission Insights</h2>
        </div>
        {formsWithCounts.length > 0 && (
          <select
            value={effectiveFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            className="rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
          >
            {formsWithCounts.map(({ form, count }) => (
              <option key={form.id} value={form.id}>
                {form.title} ({count})
              </option>
            ))}
          </select>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline px-6 py-10 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load submissions</p>
          <p className="max-w-sm text-sm text-text-muted">Error: {error}</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : formsWithCounts.length === 0 || !form ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline px-6 py-10 text-center">
          <FileCheck className="h-6 w-6 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">No submissions yet</p>
          <p className="max-w-sm text-sm text-text-muted">Charts will appear here once a form has been filled out.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Total Submissions" value={String(formSubmissions.length)} icon={FileCheck} />
            <StatTile
              label="First Submission"
              value={formSubmissions.length ? formatDate(formSubmissions[0].submittedAt) : "—"}
              icon={FileCheck}
            />
            <StatTile
              label="Most Recent"
              value={formSubmissions.length ? formatDate(formSubmissions[formSubmissions.length - 1].submittedAt) : "—"}
              icon={FileCheck}
            />
          </div>

          {numberFields.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {numberFields.map((field) => {
                const data = trendData.get(field.id) ?? [];
                return (
                  <div key={field.id} className="rounded-md border border-border-hairline p-3">
                    <h3 className="mb-1 text-xs font-medium text-text-primary">{field.label}</h3>
                    {data.length === 0 ? (
                      <p className="py-8 text-center text-xs text-text-muted">No data yet</p>
                    ) : (
                      <FieldTrendChart data={data} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {choosableFields.length > 0 &&
            (useAggregate ? (
              <div className="rounded-md border border-border-hairline p-3">
                <h3 className="mb-1 text-xs font-medium text-text-primary">
                  Overall response summary ({choosableFields.length} checklist items)
                </h3>
                <p className="mb-2 text-xs text-text-muted">Combined across all checklist items in this form</p>
                {aggregateDistribution.length === 0 ? (
                  <p className="py-8 text-center text-xs text-text-muted">No data yet</p>
                ) : (
                  <FieldDistributionChart data={aggregateDistribution} />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {choosableFields.map((field) => {
                  const data = distributionData.get(field.id) ?? [];
                  return (
                    <div key={field.id} className="rounded-md border border-border-hairline p-3">
                      <h3 className="mb-1 text-xs font-medium text-text-primary">{field.label}</h3>
                      {data.length === 0 ? (
                        <p className="py-8 text-center text-xs text-text-muted">No data yet</p>
                      ) : (
                        <FieldDistributionChart data={data} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
