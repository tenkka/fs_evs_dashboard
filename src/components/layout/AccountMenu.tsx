"use client";

import { LogOut } from "lucide-react";
import { useAuthedUser } from "@/lib/UserContext";
import { roleLabels } from "@/lib/auth";

export function AccountMenu() {
  const { persona, signOutUser } = useAuthedUser();

  return (
    <div className="space-y-2 px-5 py-4 border-t border-border-hairline">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Signed in as</p>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-series-7 text-xs font-medium text-white">
          {persona.initials}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium text-text-primary">{persona.name}</p>
          <p className="truncate text-xs text-text-muted">{roleLabels[persona.role]}</p>
        </div>
      </div>
      <button
        onClick={() => signOutUser()}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border-hairline px-2 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-2"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </div>
  );
}
