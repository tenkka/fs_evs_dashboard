// Shared department metadata used by the KPI category list and a few charts.

export type Department = "FS" | "EVS";

export const departments: Record<Department, { label: string; short: string; color: string }> = {
  FS: { label: "Food Service", short: "FS", color: "var(--series-1)" },
  EVS: { label: "Environmental Services", short: "EVS", color: "var(--series-2)" },
};
