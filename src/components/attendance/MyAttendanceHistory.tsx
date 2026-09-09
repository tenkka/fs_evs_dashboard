"use client";

import { useEffect, useMemo, useState } from "react";
import { LogIn, LogOut, Clock, Loader2, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { subscribeToAttendance, clockIn, clockOutSession, type AttendanceSession } from "@/lib/attendance";
import { formatClock, formatDuration, formatDateLabel, formatWeekday, isSameDay, sessionMinutes } from "@/lib/timeFormat";
import { useAuthedUser } from "@/lib/UserContext";

type Period = "today" | "week";

// A clock in/out punch must stand for at least this long before the next punch is allowed.
const MIN_PUNCH_GAP_MS = 60_000;

type LoadState = { uid: string; sessions: AttendanceSession[] } | { uid: string; error: string };

export function MyAttendanceHistory() {
  const { firebaseUser } = useAuthedUser();
  const uid = firebaseUser.uid;
  const [loadState, setLoadState] = useState<LoadState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [period, setPeriod] = useState<Period>("today");

  useEffect(() => {
    return subscribeToAttendance(
      uid,
      (data) => setLoadState({ uid, sessions: data }),
      (err) => setLoadState({ uid, error: err.code })
    );
  }, [uid]);

  // Only trust loadState once it's confirmed to be for the current uid — avoids a stale
  // result flashing if this component were ever reused for a different signed-in account.
  const current = loadState?.uid === uid ? loadState : null;
  const sessions = current && "sessions" in current ? current.sessions : null;
  const loadError = current && "error" in current ? current.error : null;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // sessions is ordered newest-first by clock_in.
  const lastSession = sessions?.[0] ?? null;
  const isClockedIn = lastSession !== null && lastSession.clockOut === null;

  const todaySessions = useMemo(() => (sessions ?? []).filter((s) => isSameDay(s.clockIn, now)), [sessions, now]);
  const weekSessions = useMemo(() => {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return (sessions ?? []).filter((s) => s.clockIn >= cutoff);
  }, [sessions, now]);

  const todayMinutes = todaySessions.reduce((sum, s) => sum + sessionMinutes(s.clockIn, s.clockOut, now), 0);
  const weekMinutes = weekSessions.reduce((sum, s) => sum + sessionMinutes(s.clockIn, s.clockOut, now), 0);
  const totalLabel = period === "today" ? formatDuration(todayMinutes) : formatDuration(weekMinutes);

  // The next punch must wait at least a minute after the last one.
  const lastActionAt = lastSession ? (lastSession.clockOut ?? lastSession.clockIn) : null;
  const msSinceLastAction = lastActionAt ? now.getTime() - lastActionAt.getTime() : Infinity;
  const canPunch = msSinceLastAction >= MIN_PUNCH_GAP_MS;
  const cooldownSeconds = canPunch ? 0 : Math.ceil((MIN_PUNCH_GAP_MS - msSinceLastAction) / 1000);

  // Every individual clock-in/out record, newest first — one row per session, not per day.
  const allRecords = sessions ?? [];

  const handleClockIn = async () => {
    if (!canPunch) return;
    setActionError(null);
    try {
      await clockIn(uid);
    } catch {
      setActionError("Couldn't clock in — check your Firestore write permissions.");
    }
  };

  const handleClockOut = async () => {
    if (!canPunch || !lastSession) return;
    setActionError(null);
    try {
      await clockOutSession(lastSession.id);
    } catch {
      setActionError("Couldn't clock out — check your Firestore write permissions.");
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
        <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
        <p className="text-sm font-medium text-text-primary">Couldn&apos;t load your attendance</p>
        <p className="max-w-sm text-sm text-text-muted">
          {loadError === "permission-denied"
            ? "Firestore denied reading the attendance collection. Allow signed-in users to read it in your security rules."
            : loadError === "failed-precondition"
              ? "This query needs a Firestore index that doesn't exist yet. Check the browser console for a link to create it, or simplify the query."
              : `Error: ${loadError}`}
        </p>
      </div>
    );
  }

  if (!sessions) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text-primary">
              {isClockedIn ? "Clocked in" : todaySessions.length > 0 ? "Clocked out" : "Not clocked in yet"}
            </p>
            <p className="text-xs text-text-muted">
              {isClockedIn
                ? `Since ${formatClock(lastSession!.clockIn)} · ${formatDuration(sessionMinutes(lastSession!.clockIn, lastSession!.clockOut, now))} elapsed this session`
                : todaySessions.length > 0
                  ? `${todaySessions.length} session${todaySessions.length > 1 ? "s" : ""} today · ${formatDuration(todayMinutes)} worked so far`
                  : "Tap Clock In to start your shift"}
              {!canPunch && <span className="text-text-muted"> · next punch available in {cooldownSeconds}s</span>}
            </p>
            {actionError && <p className="mt-1 text-xs text-status-critical">{actionError}</p>}
          </div>

          {isClockedIn ? (
            <button
              onClick={handleClockOut}
              disabled={!canPunch}
              className={clsx(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white",
                canPunch ? "bg-status-critical hover:opacity-90" : "cursor-not-allowed bg-status-critical/40"
              )}
            >
              <LogOut className="h-4 w-4" />
              {canPunch ? "Clock Out" : `Wait ${cooldownSeconds}s`}
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={!canPunch}
              className={clsx(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white",
                canPunch ? "bg-status-good hover:opacity-90" : "cursor-not-allowed bg-status-good/40"
              )}
            >
              <LogIn className="h-4 w-4" />
              {canPunch ? "Clock In" : `Wait ${cooldownSeconds}s`}
            </button>
          )}
        </div>

        {todaySessions.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-border-hairline pt-3">
            {[...todaySessions]
              .sort((a, b) => a.clockIn.getTime() - b.clockIn.getTime())
              .map((s, i) => (
                <li key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">
                    Session {i + 1} · {formatClock(s.clockIn)} – {s.clockOut ? formatClock(s.clockOut) : "now"}
                  </span>
                  <span className="tabular-nums text-text-muted">
                    {formatDuration(sessionMinutes(s.clockIn, s.clockOut, now))}
                    {!s.clockOut && " (in progress)"}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-series-1/10 text-series-1">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <p className="text-lg font-semibold tabular-nums text-text-primary">{totalLabel}</p>
              <p className="text-xs text-text-muted">Total time — {period === "today" ? "today" : "last 7 days"}</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-md border border-border-hairline p-1">
            {(["today", "week"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={clsx(
                  "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                  period === p ? "bg-series-1 text-white" : "text-text-secondary hover:bg-surface-2"
                )}
              >
                {p === "today" ? "Today" : "Last 7 days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border-hairline bg-surface-1">
        <div className="border-b border-border-hairline p-4">
          <h2 className="text-sm font-medium text-text-primary">Your attendance history</h2>
          <p className="text-xs text-text-muted">From Firestore · every clock-in/out record</p>
        </div>

        {allRecords.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No attendance recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Clock in</th>
                  <th className="px-4 py-2.5 font-medium">Clock out</th>
                  <th className="px-4 py-2.5 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {allRecords.map((record) => (
                  <tr key={record.id} className="border-b border-border-hairline last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="text-text-primary">{formatDateLabel(record.clockIn)}</span>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
