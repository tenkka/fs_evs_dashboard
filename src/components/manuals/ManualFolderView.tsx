"use client";

import { useRef, useState } from "react";
import { ArrowLeft, FileText, Upload, Loader2, TriangleAlert, Trash2 } from "lucide-react";
import { useManualFiles, uploadManualFile, deleteManualFile, type ManualFile, type ManualFolder } from "@/lib/manuals";
import { useAuthedUser } from "@/lib/UserContext";

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatFileDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ManualFolderView({
  folder,
  canManage,
  onBack,
}: {
  folder: ManualFolder;
  canManage: boolean;
  onBack: () => void;
}) {
  const { persona } = useAuthedUser();
  const { files, error } = useManualFiles(folder.id);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loading = !error && files === null;

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(fileList)) {
        await uploadManualFile(folder.id, file, persona.id, persona.name);
      }
    } catch {
      setUploadError("Couldn't upload one or more files — check your Firebase Storage & Firestore permissions.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (file: ManualFile) => {
    setDeletingId(file.id);
    try {
      await deleteManualFile(file);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to folders
        </button>

        {canManage && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading…" : "Upload PDFs"}
            </button>
          </div>
        )}
      </div>
      {uploadError && <p className="text-xs text-status-critical">{uploadError}</p>}

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load files</p>
          <p className="max-w-sm text-sm text-text-muted">
            {error === "permission-denied"
              ? "Firestore denied reading the manualFiles collection. Make sure it allows read access to signed-in users."
              : `Error: ${error}`}
          </p>
        </div>
      ) : loading || !files ? (
        <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
          <FileText className="h-6 w-6 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">No files in this folder yet</p>
          <p className="max-w-sm text-sm text-text-muted">
            {canManage ? "Upload PDFs above." : "Check back once a manager adds files here."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border-hairline bg-surface-1">
          <ul className="divide-y divide-border-hairline">
            {files.map((file) => {
              const canDelete = canManage && (file.uploadedByUid === persona.id || persona.role === "admin");
              return (
                <li key={file.id} className="flex items-center justify-between gap-3 p-4">
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-series-1/10 text-series-1">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
                      <p className="truncate text-xs text-text-muted">
                        {formatFileSize(file.sizeBytes)} · {formatFileDate(file.createdAt)}
                      </p>
                    </div>
                  </a>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={deletingId === file.id}
                      className="shrink-0 text-text-muted hover:text-status-critical disabled:opacity-50"
                      aria-label="Delete file"
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
