"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert, LogOut, TriangleAlert } from "lucide-react";
import { useUser } from "@/lib/UserContext";
import { homePathForRole } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

function FullPageMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 bg-page-plane p-5 text-center">
      {children}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isFirebaseConfigured, authLoading, profileLoading, firebaseUser, persona, profileError, signOutUser } = useUser();

  useEffect(() => {
    if (!isFirebaseConfigured || authLoading) return;
    if (!firebaseUser && pathname !== "/login") {
      router.replace("/login");
    } else if (firebaseUser && pathname === "/login") {
      // Wait for the persona to resolve so each role goes straight to its own home page —
      // Employee -> My Attendance, Manager/Admin -> Overview — instead of always landing on
      // "/" first. If the email isn't a recognized persona, "/" shows the right state (the
      // "account not set up" message) instead of leaving the login form sitting there.
      if (profileLoading) return;
      router.replace(persona ? homePathForRole(persona.role) : "/");
    } else if (persona?.role === "employee" && pathname === "/") {
      // Employees can't see the Overview dashboard — send them straight to their own
      // attendance page instead of the "you don't have access" screen.
      router.replace("/attendance");
    }
  }, [isFirebaseConfigured, authLoading, profileLoading, firebaseUser, persona, pathname, router]);

  // The login page renders full-page, without the dashboard shell, regardless of auth state
  // (the redirect effect above moves an already-signed-in user away from it).
  if (pathname === "/login") {
    if (firebaseUser && profileLoading) {
      // Signed in, resolving which page this role lands on — avoid flashing the login
      // form again for that brief moment.
      return (
        <FullPageMessage>
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </FullPageMessage>
      );
    }
    return <>{children}</>;
  }

  if (!isFirebaseConfigured) {
    return (
      <FullPageMessage>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-warning/15 text-[#8a5a00]">
          <TriangleAlert className="h-6 w-6" />
        </div>
        <h2 className="text-sm font-medium text-text-primary">Firebase isn&apos;t configured yet</h2>
        <p className="max-w-sm text-sm text-text-muted">
          Add your Firebase web app config to <code className="rounded bg-surface-2 px-1 py-0.5">.env.local</code> (see{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5">.env.local.example</code>) and restart the dev server.
        </p>
      </FullPageMessage>
    );
  }

  if (authLoading || !firebaseUser || profileLoading) {
    return (
      <FullPageMessage>
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </FullPageMessage>
    );
  }

  if (profileError === "permission-denied") {
    return (
      <FullPageMessage>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-warning/15 text-[#8a5a00]">
          <TriangleAlert className="h-6 w-6" />
        </div>
        <h2 className="text-sm font-medium text-text-primary">Firestore blocked reading your profile</h2>
        <p className="max-w-sm text-sm text-text-muted">
          {firebaseUser.email} signed in, but reading{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5">users/{firebaseUser.uid}</code> was denied by your
          security rules. Allow a signed-in user to read their own document, e.g.:
        </p>
        <pre className="max-w-sm overflow-x-auto rounded-md bg-surface-2 p-3 text-left text-xs text-text-secondary">
{`match /users/{userId} {
  allow read: if request.auth.uid == userId;
}`}
        </pre>
        <button
          onClick={() => signOutUser()}
          className="mt-2 flex items-center gap-1.5 rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </FullPageMessage>
    );
  }

  if (!persona) {
    return (
      <FullPageMessage>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-critical/10 text-status-critical">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-sm font-medium text-text-primary">This account isn&apos;t set up in the demo</h2>
        <p className="max-w-sm text-sm text-text-muted">
          {firebaseUser.email} signed in successfully, but there&apos;s no matching document in the Firestore{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5">users</code> collection (doc id{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5">{firebaseUser.uid}</code>) with a valid{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5">role</code>.
        </p>
        <button
          onClick={() => signOutUser()}
          className="mt-2 flex items-center gap-1.5 rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </FullPageMessage>
    );
  }

  if (persona.role === "employee" && pathname === "/") {
    // Mid-redirect to /attendance (see the effect above) — avoid flashing the
    // Overview page's "you don't have access" message for a frame first.
    return (
      <FullPageMessage>
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </FullPageMessage>
    );
  }

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  );
}
