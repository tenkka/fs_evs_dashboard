import { UtensilsCrossed, ShieldCheck, Camera, type LucideIcon } from "lucide-react";

export type KpiCategory = {
  slug: string;
  label: string;
  description: string;
  icon: LucideIcon;
  department: "FS" | "EVS";
  status: "active" | "coming-soon";
  /** "live" categories read real Firestore data and aren't subject to the demo-data facility gate. */
  dataSource?: "demo" | "live";
};

export const kpiCategories: KpiCategory[] = [
  {
    slug: "patient-count",
    label: "Patient Meal Counts",
    description: "Daily tray counts by meal — breakfast, lunch, dinner, and more",
    icon: UtensilsCrossed,
    department: "FS",
    status: "active",
  },
  {
    slug: "food-safety-audit",
    label: "Food Safety Audit",
    description: "Checklist audit covering storage, cleaning, hygiene, and food prep safety",
    icon: ShieldCheck,
    department: "FS",
    status: "active",
  },
  {
    slug: "weekly-photos",
    label: "Weekly Photo Log",
    description: "Manager-posted walkthrough photos with comments, by week",
    icon: Camera,
    department: "EVS",
    status: "active",
    dataSource: "live",
  },
];
