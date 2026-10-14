import { Camera, ClipboardList, type LucideIcon } from "lucide-react";

export type KpiCategory = {
  slug: string;
  label: string;
  description: string;
  icon: LucideIcon;
  department: "FS" | "EVS";
};

export const kpiCategories: KpiCategory[] = [
  {
    slug: "weekly-photos",
    label: "Weekly Photo Log",
    description: "Manager-posted walkthrough photos with comments, by week",
    icon: Camera,
    department: "EVS",
  },
  {
    slug: "forms",
    label: "KPI Forms",
    description: "Fill out, submit, and assign KPI forms to employees",
    icon: ClipboardList,
    department: "FS",
  },
];
