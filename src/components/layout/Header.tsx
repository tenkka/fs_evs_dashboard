"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { useAuthedUser } from "@/lib/UserContext";
import { facilityScopeName } from "@/lib/facilities";
import { useFacilityDocs } from "@/lib/firestoreFacilities";

export function Header({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const { persona, facilityScope, setFacilityScope } = useAuthedUser();
  const facilityDocs = useFacilityDocs();
  const facilityList = useMemo(
    () => Object.values(facilityDocs ?? {}).sort((a, b) => a.name.localeCompare(b.name)),
    [facilityDocs]
  );
  const today = new Date();
  const formatted = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="flex flex-col gap-3 border-b border-border-hairline bg-surface-1 px-5 py-4 md:h-16 md:flex-row md:items-center md:justify-between md:py-0">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <CalendarDays className="h-4 w-4 text-text-muted" />
          {formatted}
        </div>

        {persona.role === "admin" ? (
          <select
            value={facilityScope}
            onChange={(e) => setFacilityScope(e.target.value as typeof facilityScope)}
            className="rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-secondary"
          >
            <option value="all">All Facilities</option>
            {facilityList.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        ) : (
          (() => {
            const facilityDoc = persona.facility !== "all" ? facilityDocs?.[persona.facility] : undefined;
            return (
              <div
                className="flex items-center gap-2 rounded-md border border-border-hairline px-2.5 py-1.5 text-sm"
                title={facilityDoc ? `${facilityDoc.type} · ${facilityDoc.address}` : undefined}
              >
                <span className="h-2 w-2 rounded-full bg-status-good" />
                <span className="text-text-secondary">{facilityDoc?.name ?? facilityScopeName(persona.facility)}</span>
              </div>
            );
          })()
        )}

        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-series-7 text-xs font-medium text-white"
          title={persona.name}
        >
          {persona.initials}
        </div>
      </div>
    </header>
  );
}
