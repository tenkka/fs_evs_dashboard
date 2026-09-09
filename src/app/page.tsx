"use client";

import { useMemo } from "react";
import { Users, UserCheck, CalendarClock, AlertTriangle, Clock, TriangleAlert, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { StatTile } from "@/components/ui/StatTile";
import { AttendanceTrendChart } from "@/components/charts/AttendanceTrendChart";
import { LaborHoursChart } from "@/components/charts/LaborHoursChart";
import { StaffByRoleChart } from "@/components/charts/StaffByRoleChart";
import { useFacilityUsers } from "@/lib/firestoreUsers";
import { useAllAttendance } from "@/lib/attendance";
import { useAllShifts, shiftDurationMinutes } from "@/lib/shifts";
import { currentWeekDates, toDateKey, formatTimeOfDay } from "@/lib/timeFormat";
import { roleLabels } from "@/lib/auth";
import { useAuthedUser } from "@/lib/UserContext";
import { facilityScopeName } from "@/lib/facilities";

const TREND_DAYS = 14;

export default function OverviewPage() {
  const { facilityScope } = useAuthedUser();
  const { users, error: usersError } = useFacilityUsers(facilityScope);
  const { sessions, error: attendanceError } = useAllAttendance();
  const { shifts, error: shiftsError } = useAllShifts();

  // Admins aren't part of the schedulable/working roster shown here.
  const staff = useMemo(() => (users ?? []).filter((u) => u.role === "employee" || u.role === "manager"), [users]);
  const staffById = useMemo(() => new Map(staff.map((u) => [u.id, u])), [staff]);
  const staffIds = useMemo(() => new Set(staff.map((u) => u.id)), [staff]);

  const scopedSessions = useMemo(() => (sessions ?? []).filter((s) => staffIds.has(s.uid)), [sessions, staffIds]);
  const scopedShifts = useMemo(() => (shifts ?? []).filter((s) => staffIds.has(s.uid)), [shifts, staffIds]);

  const week = useMemo(() => currentWeekDates(), []);
  const todayKey = toDateKey(new Date());

  const workedTodayIds = useMemo(
    () => new Set(scopedSessions.filter((s) => toDateKey(s.clockIn) === todayKey).map((s) => s.uid)),
    [scopedSessions, todayKey]
  );
  const todaysShifts = useMemo(() => scopedShifts.filter((s) => s.date === todayKey), [scopedShifts, todayKey]);
  const scheduledTodayIds = useMemo(() => new Set(todaysShifts.map((s) => s.uid)), [todaysShifts]);
  const notYetClockedIn = useMemo(
    () => todaysShifts.filter((s) => !workedTodayIds.has(s.uid)).sort((a, b) => a.start.localeCompare(b.start)),
    [todaysShifts, workedTodayIds]
  );

  const trendData = useMemo(() => {
    return Array.from({ length: TREND_DAYS }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (TREND_DAYS - 1 - i));
      const key = toDateKey(d);
      const count = new Set(scopedSessions.filter((s) => toDateKey(s.clockIn) === key).map((s) => s.uid)).size;
      return { date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count };
    });
  }, [scopedSessions]);

  const laborData = useMemo(
    () =>
      week.map((day) => {
        const minutes = scopedShifts
          .filter((s) => s.date === day.date)
          .reduce((sum, s) => sum + shiftDurationMinutes(s.start, s.end), 0);
        return { day: day.dayLabel, hours: Math.round((minutes / 60) * 10) / 10 };
      }),
    [scopedShifts, week]
  );

  const roleData = useMemo(
    () => [
      { role: roleLabels.employee, count: staff.filter((u) => u.role === "employee").length },
      { role: roleLabels.manager, count: staff.filter((u) => u.role === "manager").length },
    ],
    [staff]
  );

  const totalStaff = staff.length;
  const onShiftToday = workedTodayIds.size;
  const yesterdayCount = trendData.length >= 2 ? trendData[trendData.length - 2].count : undefined;
  const attendanceRate =
    scheduledTodayIds.size === 0
      ? null
      : Math.round(([...scheduledTodayIds].filter((id) => workedTodayIds.has(id)).length / scheduledTodayIds.size) * 100);
  const weekDateKeys = useMemo(() => new Set(week.map((d) => d.date)), [week]);
  const shiftsThisWeek = useMemo(() => scopedShifts.filter((s) => weekDateKeys.has(s.date)).length, [scopedShifts, weekDateKeys]);

  const error = usersError ?? attendanceError ?? shiftsError;
  const loading = !error && (users === null || sessions === null || shifts === null);

  return (
    <>
      <Header title="Overview" description={`Today at a glance — ${facilityScopeName(facilityScope)}`} />

      <RequireRole roles={["manager", "admin"]}>
        <main className="flex-1 space-y-6 p-5">
          {error ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
              <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
              <p className="text-sm font-medium text-text-primary">Couldn&apos;t load the dashboard</p>
              <p className="max-w-sm text-sm text-text-muted">
                {error === "permission-denied"
                  ? "Firestore denied reading the users, attendance, or shifts collection. Make sure each allows read access to signed-in users."
                  : `Error: ${error}`}
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Total Staff" value={String(totalStaff)} icon={Users} />
                <StatTile
                  label="On Shift Today"
                  value={String(onShiftToday)}
                  icon={UserCheck}
                  delta={yesterdayCount !== undefined ? onShiftToday - yesterdayCount : undefined}
                  deltaLabel="vs. yesterday"
                />
                <StatTile label="Attendance Rate" value={attendanceRate === null ? "—" : `${attendanceRate}%`} icon={UserCheck} />
                <StatTile label="Shifts This Week" value={String(shiftsThisWeek)} icon={CalendarClock} />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-border-hairline bg-surface-1 p-4 lg:col-span-2">
                  <div className="mb-1">
                    <h2 className="text-sm font-medium text-text-primary">Employees clocked in — last 14 days</h2>
                    <p className="text-xs text-text-muted">Distinct staff with an attendance record, per day</p>
                  </div>
                  <AttendanceTrendChart data={trendData} />
                </div>

                <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
                  <div className="mb-3">
                    <h2 className="text-sm font-medium text-text-primary">Needs attention today</h2>
                    <p className="text-xs text-text-muted">Scheduled today but not yet clocked in</p>
                  </div>
                  <ul className="mt-3 space-y-3">
                    {notYetClockedIn.map((shift) => {
                      const person = staffById.get(shift.uid);
                      if (!person) return null;
                      return (
                        <li key={shift.uid} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-text-primary">{person.name}</p>
                            <p className="truncate text-xs text-text-muted">
                              Scheduled {formatTimeOfDay(shift.start)} – {formatTimeOfDay(shift.end)}
                            </p>
                          </div>
                          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-status-warning/15 px-2.5 py-1 text-xs font-medium text-[#8a5a00]">
                            <Clock className="h-3.5 w-3.5" />
                            Not clocked in
                          </span>
                        </li>
                      );
                    })}
                    {notYetClockedIn.length === 0 && (
                      <li className="flex items-center gap-2 text-sm text-text-secondary">
                        <AlertTriangle className="h-4 w-4 text-text-muted" />
                        {scheduledTodayIds.size === 0 ? "No shifts scheduled for today." : "Everyone scheduled today has clocked in."}
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-border-hairline bg-surface-1 p-4 lg:col-span-2">
                  <div className="mb-1">
                    <h2 className="text-sm font-medium text-text-primary">Scheduled labor hours — this week</h2>
                    <p className="text-xs text-text-muted">Planned hours from the schedule, Monday through Sunday</p>
                  </div>
                  <LaborHoursChart data={laborData} />
                </div>

                <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
                  <div className="mb-1">
                    <h2 className="text-sm font-medium text-text-primary">Staff by role</h2>
                    <p className="text-xs text-text-muted">Headcount, {facilityScopeName(facilityScope)}</p>
                  </div>
                  <StaffByRoleChart data={roleData} />
                </div>
              </div>
            </>
          )}
        </main>
      </RequireRole>
    </>
  );
}
