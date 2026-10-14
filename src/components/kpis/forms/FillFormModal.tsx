"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { submitForm, currentPeriodKey, type KpiForm, type FormAssignment, type FormFieldDef, type AnswerValue } from "@/lib/kpiForms";
import { useAuthedUser } from "@/lib/UserContext";

function CheckboxGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-1.5 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-4 w-4 rounded accent-[var(--series-1)]"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function renderInput(field: FormFieldDef, value: AnswerValue | undefined, onChange: (v: AnswerValue) => void) {
  const inputClass = "w-full rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary";

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={inputClass}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={value === undefined ? "" : String(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className={inputClass}
        />
      );
    case "boolean":
      return (
        <CheckboxGroup
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          value={value === undefined ? undefined : value ? "yes" : "no"}
          onChange={(v) => onChange(v === "yes")}
        />
      );
    case "rating":
      return (
        <CheckboxGroup
          options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
          value={value === undefined ? undefined : String(value)}
          onChange={(v) => onChange(Number(v))}
        />
      );
    case "compliance":
      return (
        <CheckboxGroup
          options={[
            { value: "Compliant", label: "Compliant" },
            { value: "Non-Compliant", label: "Non-Compliant" },
            { value: "N/A", label: "N/A" },
          ]}
          value={value as string | undefined}
          onChange={onChange}
        />
      );
    case "date":
      return <input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
    case "select":
      return (
        <CheckboxGroup
          options={(field.options ?? []).map((opt) => ({ value: opt, label: opt }))}
          value={value as string | undefined}
          onChange={onChange}
        />
      );
    default:
      return <input type="text" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
  }
}

export function FillFormModal({
  form,
  facility,
  assignment = null,
  onClose,
  onSubmitted,
}: {
  form: KpiForm;
  facility: string;
  assignment?: FormAssignment | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { persona } = useAuthedUser();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAnswer = (fieldId: string, value: AnswerValue) => setAnswers((prev) => ({ ...prev, [fieldId]: value }));

  const canSubmit = form.fields.every((f) => !f.required || (answers[f.id] !== undefined && answers[f.id] !== ""));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const periodKey = assignment ? currentPeriodKey(assignment) : null;
      await submitForm(form.id, form.title, facility, persona.id, persona.name, answers, assignment?.id ?? null, periodKey);
      onSubmitted();
    } catch {
      setError("Couldn't submit — check your Firestore permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border border-border-hairline bg-surface-1 p-4 shadow-lg">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-primary">{form.title}</p>
            {form.description && <p className="text-xs text-text-muted">{form.description}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 text-text-muted hover:text-text-primary" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {form.fields.map((field) => (
            <div key={field.id}>
              <span className="mb-1 block text-xs text-text-muted">
                {field.label}
                {field.required && <span className="text-status-critical"> *</span>}
              </span>
              {renderInput(field, answers[field.id], (v) => setAnswer(field.id, v))}
            </div>
          ))}
          {form.fields.length === 0 && <p className="text-sm text-text-muted">This form has no fields.</p>}
        </div>

        {error && <p className="mt-2 text-xs text-status-critical">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border-hairline px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="rounded-md bg-series-1 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
