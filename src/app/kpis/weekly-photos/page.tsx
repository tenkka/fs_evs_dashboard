"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { RequireRole } from "@/components/auth/RequireRole";
import { WeeklyPhotoLog } from "@/components/kpis/WeeklyPhotoLog";
import { useAuthedUser } from "@/lib/UserContext";
import { facilityScopeName } from "@/lib/facilities";

export default function WeeklyPhotosPage() {
  const { persona, facilityScope } = useAuthedUser();
  const canUpload = persona.role === "manager" || persona.role === "admin";

  return (
    <>
      <Header title="Weekly Photo Log" description={`Walkthrough photos — ${facilityScopeName(facilityScope)}`} />

      <RequireRole roles={["manager", "admin"]}>
        <main className="flex-1 space-y-6 p-5">
          <Link href="/kpis" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
            <ChevronLeft className="h-4 w-4" />
            Back to KPIs
          </Link>

          <WeeklyPhotoLog facilityScope={facilityScope} canUpload={canUpload} />
        </main>
      </RequireRole>
    </>
  );
}
