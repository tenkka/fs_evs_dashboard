"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  ClipboardList,
  CalendarRange,
  Gauge,
  Users,
  UtensilsCrossed,
  DollarSign,
  BookOpen,
  IdCard,
} from "lucide-react";
import clsx from "clsx";
import { useAuthedUser } from "@/lib/UserContext";
import type { Role } from "@/lib/auth";
import { AccountMenu } from "./AccountMenu";

const navItems: { href: string; label: string; employeeLabel?: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, roles: ["manager", "admin"] },
  { href: "/employees", label: "Employees", icon: Users, roles: ["manager", "admin"] },
  {
    href: "/attendance",
    label: "Attendance",
    employeeLabel: "My Attendance",
    icon: ClipboardCheck,
    roles: ["employee", "manager", "admin"],
  },
  { href: "/scheduling", label: "Scheduling", icon: CalendarRange, roles: ["employee", "manager", "admin"] },
  { href: "/facility-forms", label: "Facility Forms", icon: ClipboardList, roles: ["employee", "manager", "admin"] },
  { href: "/kpis", label: "KPIs", icon: Gauge, roles: ["manager", "admin"] },
  { href: "/finance", label: "Finance", icon: DollarSign, roles: ["manager", "admin"] },
  { href: "/manuals", label: "Manuals", icon: BookOpen, roles: ["employee", "manager", "admin"] },
  { href: "/profile", label: "My Profile", icon: IdCard, roles: ["employee", "manager", "admin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { persona } = useAuthedUser();
  const visibleItems = navItems.filter((item) => item.roles.includes(persona.role));

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 border-r border-border-hairline bg-surface-1">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border-hairline">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-series-1 text-white">
          <UtensilsCrossed className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-text-primary">FS &amp; EVS</p>
          <p className="text-xs text-text-muted">Operations Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          const label = persona.role === "employee" && item.employeeLabel ? item.employeeLabel : item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-series-1/10 text-series-1 font-medium"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <AccountMenu />
    </aside>
  );
}
