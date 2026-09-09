"use client";

import { useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { UtensilsCrossed, TriangleAlert } from "lucide-react";
import { useUser } from "@/lib/UserContext";

function friendlyError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "That email or password is incorrect.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/too-many-requests":
        return "Too many attempts — wait a moment and try again.";
      default:
        return "Something went wrong signing in. Please try again.";
    }
  }
  return "Something went wrong signing in. Please try again.";
}

export default function LoginPage() {
  const { isFirebaseConfigured, signIn } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-page-plane p-5">
      <div className="w-full max-w-sm rounded-lg border border-border-hairline bg-surface-1 p-6">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-series-1 text-white">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">FS &amp; EVS</p>
            <p className="text-xs text-text-muted">Operations Dashboard</p>
          </div>
        </div>

        <h1 className="text-lg font-semibold text-text-primary">Sign in</h1>
        <p className="mb-5 text-sm text-text-muted">Use your Firebase account to continue.</p>

        {!isFirebaseConfigured ? (
          <div className="flex items-start gap-2.5 rounded-md border border-dashed border-border-hairline p-3 text-sm text-text-secondary">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#8a5a00]" />
            <span>
              Firebase isn&apos;t configured. Add your web app config to{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">.env.local</code> and restart the dev server.
            </span>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-border-hairline bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-series-1"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-text-muted">Password</span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border-hairline bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-series-1"
                />
              </label>

              {error && <p className="text-xs text-status-critical">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-series-1 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="mt-5 rounded-md border border-dashed border-border-hairline p-3 text-xs text-text-muted">
              Demo accounts (create these in Firebase Authentication first): devon@fsevs.demo (Employee),
              maria@fsevs.demo (Manager), jordan@fsevs.demo (Admin).
            </div>
          </>
        )}
      </div>
    </div>
  );
}
