"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, TriangleAlert, Clock, ListChecks, Users, UserCheck } from "lucide-react";
import { useAllAttendance, type AttendanceSession } from "@/lib/attendance";
import { useFacilityUsers } from "@/lib/firestoreUsers";
import { formatClock, formatDuration, formatDateLabel, formatWeekday, sessionMinutes } from "@/lib/timeFormat";
import { StatTile } from "@/components/ui/StatTile";
import { DateRangeSelect, DATE_RANGE_LABELS, inRange, type DateRange } from "@/components/ui/DateRangeFilter";

export function FacilityAttendanceTable({ facilityScope }: { facilityScope: string }) {
  const { users, error: usersError } = useFacilityUsers(facilityScope);
  const { sessions, error: attendanceError } = useAllAttendance();
  const [range, setRange] = useState<DateRange>("week");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const usersById = useMemo(() => new Map((users ?? []).map((u) => [u.id, u])), [users]);

  const rows = useMemo(() => {
    if (!sessions || !users) return [];
    return sessions.filter((s) => usersById.has(s.uid)).filter((s) => inRange(s.clockIn, range, now));
  }, [sessions, users, usersById, range, now]);

  const stats = useMemo(() => {
    const totalMinutes = rows.reduce((sum, s) => sum + sessionMinutes(s.clockIn, s.clockOut, now), 0);
    const staffCount = new Set(rows.map((s) => s.uid)).size;
    const activeCount = rows.filter((s) => s.clockOut === null).length;
    return { totalMinutes, sessionCount: rows.length, staffCount, activeCount };
  }, [rows, now]);

  const error = usersError ?? attendanceError;
  const loading = !error && (users === null || sessions === null);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
        <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
        <p className="text-sm font-medium text-text-primary">Couldn&apos;t load attendance</p>
        <p className="max-w-sm text-sm text-text-muted">
          {error === "permission-denied"
            ? "Firestore denied reading the users or attendance collection. Make sure both allow read access to signed-in users."
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
        <StatTile label={`Total Hours — ${DATE_RANGE_LABELS[range]}`} value={formatDuration(stats.totalMinutes)} icon={Clock} />
        <StatTile label="Sessions" value={String(stats.sessionCount)} icon={ListChecks} />
        <StatTile label="Staff Represented" value={String(stats.staffCount)} icon={Users} />
        <StatTile label="Currently Clocked In" value={String(stats.activeCount)} icon={UserCheck} />
      </div>

      <div className="rounded-lg border border-border-hairline bg-surface-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-hairline p-4">
          <div>
            <h2 className="text-sm font-medium text-text-primary">Attendance</h2>
            <p className="text-xs text-text-muted">{rows.length} records</p>
          </div>
          <DateRangeSelect value={range} onChange={setRange} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
                <th className="px-4 py-2.5 font-medium">Employee</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Clock in</th>
                <th className="px-4 py-2.5 font-medium">Clock out</th>
                <th className="px-4 py-2.5 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((record: AttendanceSession) => {
                const user = usersById.get(record.uid);
                return (
                  <tr key={record.id} className="border-b border-border-hairline last:border-0 hover:bg-surface-2/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-series-1/10 text-xs font-medium text-series-1">
                          {user?.initials ?? "?"}
                        </span>
                        <span className="text-text-primary">{user?.name ?? "Unknown user"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-text-secondary">{formatDateLabel(record.clockIn)}</span>
                      <span className="ml-1.5 text-xs text-text-muted">{formatWeekday(record.clockIn)}</span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-secondary">{formatClock(record.clockIn)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                      {record.clockOut ? formatClock(record.clockOut) : "In progress"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-secondary">
                      {formatDuration(sessionMinutes(record.clockIn, record.clockOut, now))}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                    No attendance records for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
