"use client";

import { useMemo, useRef, useState } from "react";
import { DollarSign, Receipt, Loader2, TriangleAlert, Trash2, Paperclip, UtensilsCrossed, SprayCan } from "lucide-react";
import {
  useSpendingEntries,
  addSpendingEntry,
  deleteSpendingEntry,
  COMMON_PLATFORMS,
  spendGroupKeyFor,
  SPEND_GRANULARITY_OPTIONS,
  type SpendingEntry,
  type SpendGranularity,
} from "@/lib/weeklySpending";
import { useAuthedUser } from "@/lib/UserContext";
import { useFacilityDocs } from "@/lib/firestoreFacilities";
import { departments, type Department } from "@/lib/data";
import { currentWeekDates, toDateKey } from "@/lib/timeFormat";
import { StatTile } from "@/components/ui/StatTile";
import { DateRangeSelect, inRange, type DateRange } from "@/components/ui/DateRangeFilter";
import clsx from "clsx";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatEntryDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function weekKeyFor(d: Date): { key: string; label: string } {
  const week = currentWeekDates(d);
  return { key: week[0].date, label: `Week of ${week[0].dateLabel} – ${week[6].dateLabel}` };
}

export function WeeklySpendingLog({ facilityScope, canSubmit }: { facilityScope: string; canSubmit: boolean }) {
  const { persona } = useAuthedUser();
  const { entries, error } = useSpendingEntries(facilityScope);
  const facilityDocs = useFacilityDocs();
  const facilityOptions = useMemo(
    () => Object.values(facilityDocs ?? {}).sort((a, b) => a.name.localeCompare(b.name)),
    [facilityDocs]
  );
  const isAdmin = persona.role === "admin";
  const [department, setDepartment] = useState<Department>("FS");
  const [platform, setPlatform] = useState("");
  const [dateInput, setDateInput] = useState(() => toDateKey(new Date()));
  const [amountInput, setAmountInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedFacility, setSelectedFacility] = useState(facilityScope !== "all" ? facilityScope : "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>("month");
  const [granularity, setGranularity] = useState<SpendGranularity>("week");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loading = !error && entries === null;
  const targetFacility = isAdmin ? selectedFacility : facilityScope;

  const thisWeekKey = useMemo(() => weekKeyFor(new Date()).key, []);
  const thisWeekEntries = useMemo(
    () => (entries ?? []).filter((e) => weekKeyFor(e.createdAt).key === thisWeekKey),
    [entries, thisWeekKey]
  );
  const weekTotal = thisWeekEntries.reduce((sum, e) => sum + e.amount, 0);
  const weekFsTotal = thisWeekEntries.filter((e) => e.department === "FS").reduce((sum, e) => sum + e.amount, 0);
  const weekEvsTotal = thisWeekEntries.filter((e) => e.department === "EVS").reduce((sum, e) => sum + e.amount, 0);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; entries: SpendingEntry[] }>();
    for (const entry of entries ?? []) {
      if (!inRange(entry.createdAt, range)) continue;
      const { key, label } = spendGroupKeyFor(entry.createdAt, granularity);
      if (!map.has(key)) map.set(key, { label, entries: [] });
      map.get(key)!.entries.push(entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, g]) => ({ key, ...g }));
  }, [entries, range, granularity]);

  const amount = Number(amountInput);
  const canSubmitForm =
    Number.isFinite(amount) &&
    amount > 0 &&
    platform.trim().length > 0 &&
    dateInput.length > 0 &&
    targetFacility.length > 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmitForm) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await addSpendingEntry(
        targetFacility,
        department,
        platform.trim(),
        amount,
        parseDateInput(dateInput),
        persona.id,
        persona.name,
        file
      );
      setPlatform("");
      setAmountInput("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setSubmitError("Couldn't log this entry — check your Firestore & Storage permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entry: SpendingEntry) => {
    setDeletingId(entry.id);
    try {
      await deleteSpendingEntry(entry);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {canSubmit && (
        <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
          <div className="mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-series-1" />
            <h2 className="text-sm font-medium text-text-primary">Log spending</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {isAdmin && (
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
              >
                <option value="" disabled>
                  Select facility
                </option>
                {facilityOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
              className="rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
            >
              <option value="FS">{departments.FS.label}</option>
              <option value="EVS">{departments.EVS.label}</option>
            </select>
            <input
              type="text"
              list="platform-suggestions"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Platform (e.g. Western Paper, Staples)"
              className="flex-1 rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
            />
            <datalist id="platform-suggestions">
              {COMMON_PLATFORMS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
            />
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Total price"
                className="w-full rounded-md border border-border-hairline bg-surface-1 py-1.5 pl-6 pr-2.5 text-sm text-text-primary"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="flex-1 rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-secondary file:mr-3 file:rounded file:border-0 file:bg-series-1/10 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-series-1"
            />
            <button
              onClick={handleSubmit}
              disabled={!canSubmitForm}
              className="flex items-center justify-center gap-1.5 rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              {submitting ? "Logging…" : "Log"}
            </button>
          </div>
          {submitError && <p className="mt-2 text-xs text-status-critical">{submitError}</p>}
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load spending</p>
          <p className="max-w-sm text-sm text-text-muted">
            {error === "permission-denied"
              ? "Firestore denied reading the weeklySpending collection. Make sure it allows read access to signed-in users."
              : `Error: ${error}`}
          </p>
        </div>
      ) : loading || !entries ? (
        <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="This Week Total" value={formatCurrency(weekTotal)} icon={DollarSign} />
            <StatTile label="Food Service" value={formatCurrency(weekFsTotal)} icon={UtensilsCrossed} />
            <StatTile label="Environmental Services" value={formatCurrency(weekEvsTotal)} icon={SprayCan} />
            <StatTile label="Entries This Week" value={String(thisWeekEntries.length)} icon={Receipt} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-text-primary">Spending Log</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-md border border-border-hairline p-1">
                {SPEND_GRANULARITY_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGranularity(g.value)}
                    className={clsx(
                      "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                      granularity === g.value ? "bg-series-1 text-white" : "text-text-secondary hover:bg-surface-2"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <DateRangeSelect value={range} onChange={setRange} />
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
              <Receipt className="h-6 w-6 text-text-muted" />
              <p className="text-sm font-medium text-text-primary">No spending logged{entries && entries.length > 0 ? " in this range" : " yet"}</p>
              <p className="max-w-sm text-sm text-text-muted">
                {entries && entries.length > 0
                  ? "Try a wider date range."
                  : canSubmit
                    ? "Log this week's spending above."
                    : "Check back once a manager logs this week's spending."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const groupTotal = group.entries.reduce((sum, e) => sum + e.amount, 0);
                return (
                  <div key={group.key} className="rounded-lg border border-border-hairline bg-surface-1 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium text-text-primary">{group.label}</h3>
                      <span className="text-sm font-semibold text-text-primary">{formatCurrency(groupTotal)}</span>
                    </div>
                    <ul className="divide-y divide-border-hairline">
                      {group.entries.map((entry) => {
                        const canDelete = canSubmit && (entry.submittedByUid === persona.id || persona.role === "admin");
                        return (
                          <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ background: departments[entry.department].color }}
                                title={departments[entry.department].label}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-text-primary">{formatCurrency(entry.amount)}</p>
                                <p className="truncate text-xs text-text-muted">
                                  {isAdmin && <>{facilityDocs?.[entry.facility]?.name ?? entry.facility} · </>}
                                  {departments[entry.department].label} · {entry.platform} · {entry.submittedByName} ·{" "}
                                  {formatEntryDate(entry.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              {entry.attachmentUrl && (
                                <a
                                  href={entry.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-series-1 hover:underline"
                                >
                                  <Paperclip className="h-3.5 w-3.5" />
                                  Attachment
                                </a>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(entry)}
                                  disabled={deletingId === entry.id}
                                  className="text-text-muted hover:text-status-critical disabled:opacity-50"
                                  aria-label="Delete entry"
                                >
                                  {deletingId === entry.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
