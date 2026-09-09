export type FacilityId = "riverside" | "lakeside";

export const facilities: { id: FacilityId; name: string; short: string }[] = [
  { id: "riverside", name: "Riverside Medical Center", short: "Riverside" },
  { id: "lakeside", name: "Lakeside Medical Center", short: "Lakeside" },
];

export function facilityName(id: string): string {
  return facilities.find((f) => f.id === id)?.name ?? id;
}

export function facilityScopeName(scope: string): string {
  return scope === "all" ? "All Facilities" : facilityName(scope);
}
