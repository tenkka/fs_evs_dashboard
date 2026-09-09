// Hardcoded demo data for KPI pages that don't yet have a real Firestore-backed source.

export type Department = "FS" | "EVS";

export const departments: Record<Department, { label: string; short: string; color: string }> = {
  FS: { label: "Food Service", short: "FS", color: "var(--series-1)" },
  EVS: { label: "Environmental Services", short: "EVS", color: "var(--series-2)" },
};

// Patient meal tray counts — one week, Aug 2 – Aug 8, 2026
export type PatientMealDay = {
  date: string;
  weekday: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  drMeals: number;
  guestMeals: number;
};

export const patientMealCounts: PatientMealDay[] = [
  { date: "8/2/2026", weekday: "Sunday", breakfast: 12, lunch: 12, dinner: 13, drMeals: 0, guestMeals: 0 },
  { date: "8/3/2026", weekday: "Monday", breakfast: 23, lunch: 21, dinner: 20, drMeals: 0, guestMeals: 0 },
  { date: "8/4/2026", weekday: "Tuesday", breakfast: 22, lunch: 29, dinner: 26, drMeals: 0, guestMeals: 0 },
  { date: "8/5/2026", weekday: "Wednesday", breakfast: 28, lunch: 27, dinner: 18, drMeals: 0, guestMeals: 0 },
  { date: "8/6/2026", weekday: "Thursday", breakfast: 27, lunch: 37, dinner: 34, drMeals: 0, guestMeals: 0 },
  { date: "8/7/2026", weekday: "Friday", breakfast: 32, lunch: 29, dinner: 24, drMeals: 0, guestMeals: 0 },
  { date: "8/8/2026", weekday: "Saturday", breakfast: 18, lunch: 20, dinner: 11, drMeals: 0, guestMeals: 0 },
];

export function patientMealDayTotal(d: PatientMealDay): number {
  return d.breakfast + d.lunch + d.dinner + d.drMeals + d.guestMeals;
}
