"use client";

import { Mail, Building2, ShieldCheck } from "lucide-react";
import { useAuthedUser } from "@/lib/UserContext";
import { useFacilityDocs } from "@/lib/firestoreFacilities";
import { roleLabels } from "@/lib/auth";
import { facilityScopeName } from "@/lib/facilities";

export function PersonalInfoCard() {
  const { persona } = useAuthedUser();
  const facilityDocs = useFacilityDocs();
  const facilityName = persona.facility !== "all" ? facilityDocs?.[persona.facility]?.name ?? facilityScopeName(persona.facility) : "All Facilities";

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-series-7 text-lg font-semibold text-white">
          {persona.initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-text-primary">{persona.name}</p>
          <p className="truncate text-sm text-text-muted">{roleLabels[persona.role]}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-border-hairline pt-4 sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-text-muted" />
          <div className="min-w-0">
            <dt className="text-xs text-text-muted">Email</dt>
            <dd className="truncate text-sm text-text-primary">{persona.email}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-text-muted" />
          <div className="min-w-0">
            <dt className="text-xs text-text-muted">Role</dt>
            <dd className="truncate text-sm text-text-primary">{roleLabels[persona.role]}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-text-muted" />
          <div className="min-w-0">
            <dt className="text-xs text-text-muted">Facility</dt>
            <dd className="truncate text-sm text-text-primary">{facilityName}</dd>
          </div>
        </div>
      </dl>
    </div>
  );
}
