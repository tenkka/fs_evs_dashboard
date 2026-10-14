"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { assignForm, WEEKDAY_NAMES, type KpiForm, type RecurrenceType } from "@/lib/kpiForms";
import { useAuthedUser } from "@/lib/UserContext";
import { useFacilityUsers } from "@/lib/firestoreUsers";

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: "once", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function AssignFormModal({
  form,
  facilityScope,
  onClose,
  onAssigned,
}: {
  form: KpiForm;
  facilityScope: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { persona } = useAuthedUser();
  const { users } = useFacilityUsers(facilityScope);
  const employees = useMemo(() => (users ?? []).filter((u) => u.role === "employee"), [users]);
  const [selectedUid, setSelectedUid] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("once");
  const [dueDateInput, setDueDateInput] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1); // default Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAssign = selectedUid.length > 0 && !saving;

  const handleAssign = async () => {
    const employee = employees.find((e) => e.id === selectedUid);
    if (!canAssign || !employee) return;
    setSaving(true);
    setError(null);
    try {
      await assignForm(form.id, form.title, employee.facility, employee.id, employee.name, persona.name, recurrence, {
        dueDate: recurrence === "once" && dueDateInput ? parseDateInput(dueDateInput) : null,
        dayOfWeek: recurrence === "weekly" || recurrence === "biweekly" ? dayOfWeek : null,
        dayOfMonth: recurrence === "monthly" ? dayOfMonth : null,
      });
      onAssigned();
    } catch {
      setError("Couldn't assign — check your Firestore permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border-hairline bg-surface-1 p-4 shadow-lg">
        <div className="mb-1 flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-text-primary">Assign &ldquo;{form.title}&rdquo;</p>
          <button onClick={onClose} className="shrink-0 text-text-muted hover:text-text-primary" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Employee</span>
            <select
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              className="w-full rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
            >
              <option value="" disabled>
                Select employee
              </option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {employees.length === 0 && <p className="mt-1 text-xs text-text-muted">No employees found for this facility.</p>}
          </label>

          <div>
            <span className="mb-1 block text-xs text-text-muted">Recurrence</span>
            <div className="flex flex-wrap gap-1 rounded-md border border-border-hairline p-1">
              {RECURRENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRecurrence(opt.value)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    recurrence === opt.value ? "bg-series-1 text-white" : "text-text-secondary hover:bg-surface-2"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {recurrence === "once" && (
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Due date (optional)</span>
              <input
                type="date"
                value={dueDateInput}
                onChange={(e) => setDueDateInput(e.target.value)}
                className="w-full rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
              />
            </label>
          )}

          {(recurrence === "weekly" || recurrence === "biweekly") && (
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Day of week</span>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
              >
                {WEEKDAY_NAMES.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {recurrence === "monthly" && (
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Day of month</span>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value))))}
                className="w-full rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
              />
            </label>
          )}

          {recurrence !== "once" && (
            <p className="text-xs text-text-muted">
              A new pending occurrence will appear automatically every {recurrence === "biweekly" ? "two weeks" : recurrence}.
            </p>
          )}
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
            disabled={!canAssign}
            onClick={handleAssign}
            className="rounded-md bg-series-1 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
