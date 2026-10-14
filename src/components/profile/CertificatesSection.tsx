"use client";

import { useRef, useState } from "react";
import { Award, Upload, Loader2, TriangleAlert, Trash2, FileText } from "lucide-react";
import { useCertificates, uploadCertificate, deleteCertificate, type Certificate } from "@/lib/certificates";
import { toDateKey } from "@/lib/timeFormat";

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function statusFor(expirationDate: Date | null): { label: string; className: string } {
  if (!expirationDate) return { label: "No expiration", className: "bg-surface-2 text-text-secondary" };
  const daysLeft = Math.ceil((expirationDate.getTime() - Date.now()) / DAY_MS);
  if (daysLeft < 0) return { label: "Expired", className: "bg-status-critical/10 text-status-critical" };
  if (daysLeft <= 30) return { label: "Expiring soon", className: "bg-status-warning/15 text-[#8a5a00]" };
  return { label: "Valid", className: "bg-status-good/10 text-status-good" };
}

export function CertificatesSection({ uid }: { uid: string }) {
  const { certificates, error } = useCertificates(uid);
  const [name, setName] = useState("");
  const [validFrom, setValidFrom] = useState(() => toDateKey(new Date()));
  const [hasExpiration, setHasExpiration] = useState(true);
  const [expiration, setExpiration] = useState(() => toDateKey(new Date()));
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loading = !error && certificates === null;
  const canSubmit = name.trim().length > 0 && validFrom.length > 0 && !!file && (!hasExpiration || expiration.length > 0) && !uploading;

  const handleUpload = async () => {
    if (!canSubmit || !file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadCertificate(
        uid,
        file,
        name.trim(),
        parseDateInput(validFrom),
        hasExpiration ? parseDateInput(expiration) : null
      );
      setName("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadError("Couldn't upload the certificate — check your Firebase Storage & Firestore permissions.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (cert: Certificate) => {
    setDeletingId(cert.id);
    try {
      await deleteCertificate(cert);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Award className="h-4 w-4 text-series-1" />
        <h2 className="text-sm font-medium text-text-primary">Certificates</h2>
      </div>

      <div className="space-y-3 rounded-md border border-border-hairline p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Certificate name"
            className="flex-1 rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="flex-1 rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-secondary file:mr-3 file:rounded file:border-0 file:bg-series-1/10 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-series-1"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-text-muted">
            Valid from
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-text-muted">
            <input type="checkbox" checked={hasExpiration} onChange={(e) => setHasExpiration(e.target.checked)} className="accent-[var(--series-1)]" />
            Has expiration
          </label>
          {hasExpiration && (
            <input
              type="date"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              className="rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
            />
          )}
          <button
            onClick={handleUpload}
            disabled={!canSubmit}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Add certificate"}
          </button>
        </div>
        {uploadError && <p className="text-xs text-status-critical">{uploadError}</p>}
      </div>

      <div className="mt-4">
        {error ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline px-6 py-10 text-center">
            <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
            <p className="text-sm font-medium text-text-primary">Couldn&apos;t load certificates</p>
            <p className="max-w-sm text-sm text-text-muted">
              {error === "permission-denied"
                ? "Firestore denied reading the certificates collection. Make sure it allows read access to signed-in users."
                : `Error: ${error}`}
            </p>
          </div>
        ) : loading || !certificates ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : certificates.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">No certificates uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-border-hairline">
            {certificates.map((cert) => {
              const status = statusFor(cert.expirationDate);
              return (
                <li key={cert.id} className="flex items-center justify-between gap-3 py-3">
                  <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-series-1/10 text-series-1">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{cert.name}</p>
                      <p className="truncate text-xs text-text-muted">
                        Valid {formatDate(cert.validFrom)}
                        {cert.expirationDate ? ` – ${formatDate(cert.expirationDate)}` : " · No expiration"}
                      </p>
                    </div>
                  </a>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                  <button
                    onClick={() => handleDelete(cert)}
                    disabled={deletingId === cert.id}
                    className="shrink-0 text-text-muted hover:text-status-critical disabled:opacity-50"
                    aria-label="Delete certificate"
                  >
                    {deletingId === cert.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
