"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, TriangleAlert, Clock } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { formatClock, formatDuration, currentWeekDates } from "@/lib/timeFormat";

type TimeEntry = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  totalMinutes: number;
  type: string;
  approvalStatus: string;
};

type Timesheet = {
  employeeName: string;
  employeeCode: string;
  startDate: string;
  endDate: string;
  entries: TimeEntry[];
  totalMinutes: number;
};
// Tags a fetched result with the key it was fetched for, so a stale response from a
// just-changed week is never mistaken for the current one.
type LoadState = { key: string; timesheet: Timesheet } | { key: string; error: string } | null;

function formatDateCell(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/**
 * One employee's weekly UKG Ready timesheet — stat tiles, prev/next-week navigation (capped
 * at the current week), and the entries table. Used both for an employee viewing their own
 * timesheet and for a manager/admin viewing someone else's.
 */
export function TimesheetView({ employeeCode, onEmployeeName }: { employeeCode: string; onEmployeeName?: (name: string) => void }) {
  // 0 = the current week; negative = that many weeks in the past. Timesheets can't be
  // viewed for weeks that haven't happened yet, so navigating forward stops at 0.
  const [weekOffset, setWeekOffset] = useState(0);
  const [state, setState] = useState<LoadState>(null);

  const week = useMemo(() => {
    const reference = new Date();
    reference.setDate(reference.getDate() + weekOffset * 7);
    return currentWeekDates(reference);
  }, [weekOffset]);
  const startDate = week[0].date;
  const endDate = week[6].date;
  const fetchKey = `${employeeCode}|${startDate}|${endDate}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ukg/timesheet/${employeeCode}?start=${startDate}&end=${endDate}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ key: fetchKey, error: data.error ?? "Something went wrong." });
          return;
        }
        setState({ key: fetchKey, timesheet: data });
        onEmployeeName?.(data.employeeName);
      })
      .catch(() => {
        if (!cancelled) setState({ key: fetchKey, error: "Couldn't reach the server." });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEmployeeName is a stable setter prop, not fetch-key data
  }, [employeeCode, startDate, endDate, fetchKey]);

  const current = state?.key === fetchKey ? state : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border-hairline bg-surface-1 p-3">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="flex items-center gap-1 rounded-md border border-border-hairline px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous week
        </button>
        <p className="text-sm font-medium text-text-primary">
          Week of {week[0].dateLabel} – {week[6].dateLabel}
          {weekOffset === 0 && <span className="ml-1.5 text-xs font-normal text-text-muted">(current)</span>}
        </p>
        <button
          onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
          disabled={weekOffset >= 0}
          className="flex items-center gap-1 rounded-md border border-border-hairline px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-2 disabled:opacity-40"
        >
          Next week
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {current === null ? (
        <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : "error" in current ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load the timesheet</p>
          <p className="max-w-md text-sm text-text-muted">{current.error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile label="Total Hours" value={formatDuration(current.timesheet.totalMinutes)} icon={Clock} />
            <StatTile label="Entries" value={String(current.timesheet.entries.length)} icon={Clock} />
          </div>

          <div className="rounded-lg border border-border-hairline bg-surface-1">
            {current.timesheet.entries.length === 0 ? (
              <p className="p-4 text-sm text-text-muted">No time entries for this week.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium">Start</th>
                      <th className="px-4 py-2.5 font-medium">End</th>
                      <th className="px-4 py-2.5 font-medium">Duration</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.timesheet.entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-border-hairline last:border-0">
                        <td className="px-4 py-2.5 text-text-primary">{formatDateCell(entry.date)}</td>
                        <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                          {entry.startTime ? formatClock(new Date(entry.startTime)) : "—"}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                          {entry.endTime ? formatClock(new Date(entry.endTime)) : "—"}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text-secondary">{formatDuration(entry.totalMinutes)}</td>
                        <td className="px-4 py-2.5 text-text-secondary">{entry.approvalStatus || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
