"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, TriangleAlert, Trash2, Camera } from "lucide-react";
import { useWeeklyPhotos, uploadWeeklyPhoto, deleteWeeklyPhoto, type WeeklyPhoto } from "@/lib/weeklyPhotos";
import { useAuthedUser } from "@/lib/UserContext";
import { DateRangeSelect, inRange, type DateRange } from "@/components/ui/DateRangeFilter";

function formatPhotoDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function WeeklyPhotoLog({ facilityScope, canUpload }: { facilityScope: string; canUpload: boolean }) {
  const { persona } = useAuthedUser();
  const { photos: allPhotos, error } = useWeeklyPhotos(facilityScope);
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>("month");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photos = useMemo(() => (allPhotos ?? []).filter((p) => inRange(p.createdAt, range)), [allPhotos, range]);

  const loading = !error && allPhotos === null;

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadWeeklyPhoto(file, facilityScope, persona.id, persona.name, comment.trim());
      setFile(null);
      setComment("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadError("Couldn't upload the photo — check your Firebase Storage & Firestore permissions.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: WeeklyPhoto) => {
    setDeletingId(photo.id);
    try {
      await deleteWeeklyPhoto(photo);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {canUpload && (
        <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4 text-series-1" />
            <h2 className="text-sm font-medium text-text-primary">Post a photo</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="flex-1 rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-secondary file:mr-3 file:rounded file:border-0 file:bg-series-1/10 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-series-1"
            />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment (optional)"
              rows={1}
              className="flex-1 resize-none rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
            />
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center justify-center gap-1.5 rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? "Uploading…" : "Post"}
            </button>
          </div>
          {uploadError && <p className="mt-2 text-xs text-status-critical">{uploadError}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-text-primary">Photo Log</h2>
        <DateRangeSelect value={range} onChange={setRange} />
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load the photo log</p>
          <p className="max-w-sm text-sm text-text-muted">
            {error === "permission-denied"
              ? "Firestore denied reading the weeklyPhotos collection. Make sure it allows read access to signed-in users."
              : `Error: ${error}`}
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
          <Camera className="h-6 w-6 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">
            {(allPhotos?.length ?? 0) > 0 ? "No photos in this range" : "No photos posted yet"}
          </p>
          <p className="max-w-sm text-sm text-text-muted">
            {(allPhotos?.length ?? 0) > 0
              ? "Try a wider date range."
              : canUpload
                ? "Post this week's walkthrough photos above."
                : "Check back once a manager posts this week's photos."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => {
            const canDelete = canUpload && (photo.uploaderUid === persona.id || persona.role === "admin");
            return (
              <div key={photo.id} className="overflow-hidden rounded-lg border border-border-hairline bg-surface-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URLs aren't supported by next/image's default loader without extra config */}
                <img src={photo.imageUrl} alt={photo.comment || "Weekly photo"} className="aspect-video w-full object-cover" />
                <div className="p-3">
                  {photo.comment && <p className="text-sm text-text-primary">{photo.comment}</p>}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-text-muted">
                      {photo.uploaderName} · {formatPhotoDate(photo.createdAt)}
                    </p>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(photo)}
                        disabled={deletingId === photo.id}
                        className="shrink-0 text-text-muted hover:text-status-critical disabled:opacity-50"
                        aria-label="Delete photo"
                      >
                        {deletingId === photo.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
