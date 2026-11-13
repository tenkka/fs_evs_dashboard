"use client";

import type { PeriodType } from "@/lib/budgets";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthValueOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function parseMonthValue(value: string): Date {
  const [y, m] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1);
}

export type SlotPickerState = { weekDate: string; monthValue: string; year: number; quarter: number };

/** A slot picker initialized to today's instance of every period type. */
export function defaultSlotPickerState(): SlotPickerState {
  const now = new Date();
  return { weekDate: dateKeyOf(now), monthValue: monthValueOf(now), year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
}

/** A slot picker initialized so its relevant field (for `period`) points at `date`. */
export function slotPickerStateFor(period: PeriodType, date: Date): SlotPickerState {
  const state = defaultSlotPickerState();
  if (period === "weekly") return { ...state, weekDate: dateKeyOf(date) };
  if (period === "monthly") return { ...state, monthValue: monthValueOf(date) };
  if (period === "quarterly") return { ...state, year: date.getFullYear(), quarter: Math.floor(date.getMonth() / 3) + 1 };
  return { ...state, year: date.getFullYear() };
}

/** The reference date represented by a slot picker's state, for the given period type. */
export function referenceDateFor(period: PeriodType, state: SlotPickerState): Date {
  if (period === "weekly") return parseDateKey(state.weekDate);
  if (period === "monthly") return parseMonthValue(state.monthValue);
  if (period === "quarterly") return new Date(state.year, (state.quarter - 1) * 3, 15);
  return new Date(state.year, 0, 15);
}

const inputClass = "rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary";

/** Lets the viewer pick any specific instance of a period type — a week, a month, a quarter, or a year. */
export function SlotPicker({ period, state, onChange }: { period: PeriodType; state: SlotPickerState; onChange: (next: SlotPickerState) => void }) {
  if (period === "weekly") {
    return <input type="date" value={state.weekDate} onChange={(e) => onChange({ ...state, weekDate: e.target.value })} className={inputClass} />;
  }
  if (period === "monthly") {
    return <input type="month" value={state.monthValue} onChange={(e) => onChange({ ...state, monthValue: e.target.value })} className={inputClass} />;
  }
  if (period === "quarterly") {
    return (
      <>
        <select value={state.quarter} onChange={(e) => onChange({ ...state, quarter: Number(e.target.value) })} className={inputClass}>
          <option value={1}>Q1</option>
          <option value={2}>Q2</option>
          <option value={3}>Q3</option>
          <option value={4}>Q4</option>
        </select>
        <input type="number" value={state.year} onChange={(e) => onChange({ ...state, year: Number(e.target.value) })} className={`w-24 ${inputClass}`} />
      </>
    );
  }
  return <input type="number" value={state.year} onChange={(e) => onChange({ ...state, year: Number(e.target.value) })} className={`w-28 ${inputClass}`} />;
}
