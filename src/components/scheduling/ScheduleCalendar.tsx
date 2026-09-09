"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, TriangleAlert, Users, CalendarClock, Clock, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useFacilityUsers } from "@/lib/firestoreUsers";
import { useAllShifts, setShift, deleteShift, shiftDurationMinutes } from "@/lib/shifts";
import { currentWeekDates, formatDuration, formatTimeOfDay } from "@/lib/timeFormat";
import type { Persona } from "@/lib/auth";
import { StatTile } from "@/components/ui/StatTile";

type ShiftBlock = {
  date: string;
  start: string;
  end: string;
  station: string;
  employeeIds: string[];
};

type EditTarget = { date: string; dayLabel: string; original: ShiftBlock | null };

function blockKey(date: string, start: string, end: string, station: string): string {
  return `${date}|${start}|${end}|${station}`;
}

export function ScheduleCalendar({ facilityScope, canEdit }: { facilityScope: string; canEdit: boolean }) {
  const { users, error: usersError } = useFacilityUsers(facilityScope);
  const { shifts, error: shiftsError } = useAllShifts();
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const week = useMemo(() => {
    const reference = new Date();
    reference.setDate(reference.getDate() + weekOffset * 7);
    return currentWeekDates(reference);
  }, [weekOffset]);

  // Admins aren't part of the schedulable roster, but managers can be assigned shifts too.
  const staff = useMemo(
    () => (users ?? []).filter((u) => u.role === "employee" || u.role === "manager").sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );
  const staffById = useMemo(() => new Map(staff.map((u) => [u.id, u])), [staff]);

  const blocksByDate = useMemo(() => {
    const staffIds = new Set(staff.map((u) => u.id));
    const map = new Map<string, ShiftBlock>();
    for (const s of shifts ?? []) {
      if (!staffIds.has(s.uid)) continue;
      const key = blockKey(s.date, s.start, s.end, s.station);
      if (!map.has(key)) map.set(key, { date: s.date, start: s.start, end: s.end, station: s.station, employeeIds: [] });
      map.get(key)!.employeeIds.push(s.uid);
    }
    const byDate = new Map<string, ShiftBlock[]>();
    for (const day of week) byDate.set(day.date, []);
    for (const block of map.values()) {
      byDate.get(block.date)?.push(block);
    }
    for (const blocks of byDate.values()) blocks.sort((a, b) => a.start.localeCompare(b.start));
    return byDate;
  }, [shifts, staff, week]);

  const dailyMinutes = useMemo(() => {
    const staffIds = new Set(staff.map((u) => u.id));
    return week.map((day) => {
      let minutes = 0;
      for (const s of shifts ?? []) {
        if (s.date === day.date && staffIds.has(s.uid)) minutes += shiftDurationMinutes(s.start, s.end);
      }
      return minutes;
    });
  }, [shifts, staff, week]);

  const weekTotalMinutes = dailyMinutes.reduce((sum, m) => sum + m, 0);
  const weekShiftCount = useMemo(() => {
    const staffIds = new Set(staff.map((u) => u.id));
    const weekDates = new Set(week.map((d) => d.date));
    return (shifts ?? []).filter((s) => staffIds.has(s.uid) && weekDates.has(s.date)).length;
  }, [shifts, staff, week]);
  const avgMinutesPerEmployee = staff.length === 0 ? 0 : Math.round(weekTotalMinutes / staff.length);

  const error = usersError ?? shiftsError;
  const loading = !error && (users === null || shifts === null);

  const handleSave = async (form: { start: string; end: string; station: string; selected: Set<string> }) => {
    if (!editTarget) return;
    setSaving(true);
    setActionError(null);
    const previousIds = new Set(editTarget.original?.employeeIds ?? []);
    const toAssign = [...form.selected];
    const toUnassign = [...previousIds].filter((id) => !form.selected.has(id));
    try {
      await Promise.all([
        ...toAssign.map((uid) => setShift(uid, editTarget.date, form.start, form.end, form.station || "General")),
        ...toUnassign.map((uid) => deleteShift(uid, editTarget.date)),
      ]);
      setEditTarget(null);
    } catch {
      setActionError("Couldn't save the shift — check your Firestore write permissions.");
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
        <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
        <p className="text-sm font-medium text-text-primary">Couldn&apos;t load the schedule</p>
        <p className="max-w-sm text-sm text-text-muted">
          {error === "permission-denied"
            ? "Firestore denied reading the users or shifts collection. Make sure both allow read access to signed-in users."
            : `Error: ${error}`}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Staff Scheduled" value={String(staff.length)} icon={Users} />
        <StatTile label="Shifts This Week" value={String(weekShiftCount)} icon={CalendarClock} />
        <StatTile label="Total Hours This Week" value={formatDuration(weekTotalMinutes)} icon={Clock} />
        <StatTile label="Avg. Hours / Employee" value={formatDuration(avgMinutesPerEmployee)} icon={TrendingUp} />
      </div>

      <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setWeekOffset((o) => o - 1)}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border-hairline text-text-muted hover:bg-surface-2"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <h2 className="text-sm font-medium text-text-primary">
                Week of {week[0].dateLabel} – {week[6].dateLabel}
              </h2>
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border-hairline text-text-muted hover:bg-surface-2"
                aria-label="Next week"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="ml-1 rounded-md border border-border-hairline px-2 py-0.5 text-xs text-text-secondary hover:bg-surface-2"
                >
                  This week
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted">
              {canEdit ? "Click a shift to edit it, or add a new time slot for a day" : "Read-only — ask a manager to make changes"}
            </p>
            {actionError && <p className="mt-1 text-xs text-status-critical">{actionError}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-semibold text-text-primary">{formatDuration(weekTotalMinutes)}</p>
            <p className="text-xs text-text-muted">total this week</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {week.map((day, dayIndex) => {
            const blocks = blocksByDate.get(day.date) ?? [];
            const minutesToday = dailyMinutes[dayIndex];
            return (
              <div key={day.date} className="rounded-md border border-border-hairline">
                <div className="border-b border-border-hairline bg-surface-2/40 px-2.5 py-2">
                  <p className="text-xs font-medium text-text-primary">
                    {day.dayLabel} <span className="font-normal text-text-muted">{day.dateLabel}</span>
                  </p>
                  <p className="text-sm font-semibold text-text-primary">
                    {minutesToday > 0 ? `${formatDuration(minutesToday)} scheduled` : "Nothing scheduled"}
                  </p>
                </div>
                <div className="space-y-2 p-2">
                  {blocks.map((block) => (
                    <button
                      key={blockKey(block.date, block.start, block.end, block.station)}
                      disabled={!canEdit}
                      onClick={() => setEditTarget({ date: day.date, dayLabel: day.dayLabel, original: block })}
                      className="w-full rounded-md bg-series-1/10 p-2 text-left transition-opacity hover:opacity-80 disabled:cursor-default"
                    >
                      <p className="text-xs font-medium tabular-nums text-series-1">
                        {formatTimeOfDay(block.start)} – {formatTimeOfDay(block.end)}
                      </p>
                      {block.station && <p className="truncate text-[11px] text-text-muted">{block.station}</p>}
                      <div className="mt-1.5 space-y-1">
                        {block.employeeIds.map((uid) => (
                          <div key={uid} className="flex items-center gap-1.5">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-series-1/20 text-[9px] font-medium text-series-1">
                              {staffById.get(uid)?.initials ?? "?"}
                            </span>
                            <span className="truncate text-xs text-text-primary">
                              {staffById.get(uid)?.name ?? "Unknown"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                  {blocks.length === 0 && <p className="px-1 py-1 text-xs text-text-muted">Off</p>}
                  {canEdit && (
                    <button
                      onClick={() => setEditTarget({ date: day.date, dayLabel: day.dayLabel, original: null })}
                      className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border-hairline py-1.5 text-xs text-text-muted hover:border-series-1 hover:text-series-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add shift
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editTarget && (
        <ShiftSlotEditor
          dayLabel={editTarget.dayLabel}
          original={editTarget.original}
          staff={staff}
          saving={saving}
          onCancel={() => setEditTarget(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ShiftSlotEditor({
  dayLabel,
  original,
  staff,
  saving,
  onCancel,
  onSave,
}: {
  dayLabel: string;
  original: ShiftBlock | null;
  staff: Persona[];
  saving: boolean;
  onCancel: () => void;
  onSave: (form: { start: string; end: string; station: string; selected: Set<string> }) => void;
}) {
  const [start, setStart] = useState(original?.start ?? "06:00");
  const [end, setEnd] = useState(original?.end ?? "14:00");
  const [station, setStation] = useState(original?.station ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(original?.employeeIds ?? []));

  const toggle = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border-hairline bg-surface-1 p-4 shadow-lg">
        <p className="text-sm font-medium text-text-primary">{dayLabel}</p>
        <p className="mb-4 text-xs text-text-muted">{original ? "Edit time slot" : "New time slot"}</p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Start</span>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-md border border-border-hairline bg-surface-1 px-2 py-1.5 text-sm text-text-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">End</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-md border border-border-hairline bg-surface-1 px-2 py-1.5 text-sm text-text-primary"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Station</span>
            <input
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="e.g. Kitchen"
              className="w-full rounded-md border border-border-hairline bg-surface-1 px-2 py-1.5 text-sm text-text-primary"
            />
          </label>

          <div>
            <span className="mb-1 block text-xs text-text-muted">Assign employees</span>
            <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-md border border-border-hairline p-1.5">
              {staff.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                    className="h-3.5 w-3.5 accent-[var(--series-1)]"
                  />
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-series-1/10 text-[10px] font-medium text-series-1">
                    {u.initials}
                  </span>
                  <span className="truncate text-sm text-text-primary">{u.name}</span>
                </label>
              ))}
              {staff.length === 0 && <p className="px-1.5 py-2 text-xs text-text-muted">No employees to assign.</p>}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-border-hairline px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={() => onSave({ start, end, station, selected })}
            className="rounded-md bg-series-1 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
