"use client";

import { useState } from "react";
import clsx from "clsx";
import { Loader2, TriangleAlert, Check } from "lucide-react";
import { useBudgetTargets, saveBudgetTarget, targetFor, PERIOD_TYPES, type PeriodType, type BudgetSection } from "@/lib/budgets";
import { periodDateRange } from "@/lib/budgetActuals";
import { useAuthedUser } from "@/lib/UserContext";
import { SlotPicker, defaultSlotPickerState, referenceDateFor } from "@/components/budget/SlotPicker";

const SECTION_FIELD_LABEL: Record<BudgetSection, string> = {
  spending: "Spending Budget ($)",
  labor: "Labor Budget ($)",
  hours: "Budgeted Hours",
};

// Remounts with fresh initial state whenever the selected slot changes, instead of an effect
// that would have to resync a controlled input every time the admin picks a different instance.
function SlotValueEditor({
  facility,
  period,
  section,
  slotKey,
  slotLabel,
  initialValue,
  changedBy,
}: {
  facility: string;
  period: PeriodType;
  section: BudgetSection;
  slotKey: string;
  slotLabel: string;
  initialValue: number;
  changedBy: string;
}) {
  const [value, setValue] = useState(String(initialValue));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = Number(value) !== initialValue;
  const canSave = value.trim() !== "" && !Number.isNaN(Number(value)) && dirty;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveBudgetTarget(facility, period, section, slotKey, slotLabel, Number(value), changedBy);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="text-xs text-text-muted">{SECTION_FIELD_LABEL[section]}</span>
        <input
          type="number"
          min="0"
          step={section === "hours" ? "0.5" : "0.01"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-40 rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
        />
      </label>
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="flex items-center justify-center gap-1.5 rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saving ? "Saving…" : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}

/** Lets an Admin pick a period type, a specific instance of it (a time slot), and set that one instance's budget target. */
export function BudgetEditor({ facility, section }: { facility: string; section: BudgetSection }) {
  const { persona } = useAuthedUser();
  const { targets, error } = useBudgetTargets(facility);

  const [period, setPeriod] = useState<PeriodType>("weekly");
  const [slotState, setSlotState] = useState(defaultSlotPickerState());

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
        <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
        <p className="text-sm font-medium text-text-primary">Couldn&apos;t load budgets</p>
        <p className="max-w-sm text-sm text-text-muted">
          {error === "permission-denied" ? "Firestore denied reading the budget targets." : `Error: ${error}`}
        </p>
      </div>
    );
  }

  if (!targets) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  const range = periodDateRange(period, referenceDateFor(period, slotState));
  const currentValue = targetFor(targets, period, section, range.start);

  return (
    <div className="space-y-4 rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border border-border-hairline p-1">
          {PERIOD_TYPES.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={clsx(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                period === p.value ? "bg-series-1 text-white" : "text-text-secondary hover:bg-surface-2"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <SlotPicker period={period} state={slotState} onChange={setSlotState} />
      </div>

      <p className="text-sm text-text-secondary">{range.label}</p>

      <SlotValueEditor
        key={`${facility}-${section}-${period}-${range.start}`}
        facility={facility}
        period={period}
        section={section}
        slotKey={range.start}
        slotLabel={range.label}
        initialValue={currentValue}
        changedBy={persona.email}
      />
    </div>
  );
}
