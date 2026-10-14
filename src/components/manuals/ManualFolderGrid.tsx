"use client";

import { useState } from "react";
import { Folder, FolderPlus, Loader2, TriangleAlert, ChevronRight } from "lucide-react";
import { useManualFolders, createManualFolder, type ManualFolder } from "@/lib/manuals";
import { useAuthedUser } from "@/lib/UserContext";

export function ManualFolderGrid({
  canManage,
  onOpenFolder,
}: {
  canManage: boolean;
  onOpenFolder: (folder: ManualFolder) => void;
}) {
  const { persona } = useAuthedUser();
  const { folders, error } = useManualFolders();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loading = !error && folders === null;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setCreateError(null);
    try {
      await createManualFolder(name, persona.id, persona.name);
      setNewName("");
      setCreating(false);
    } catch {
      setCreateError("Couldn't create the folder — check your Firestore permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          {creating ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Folder name"
                className="rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || saving}
                className="rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
                className="rounded-md border border-border-hairline px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              <FolderPlus className="h-4 w-4" />
              New Folder
            </button>
          )}
        </div>
      )}
      {createError && <p className="text-xs text-status-critical">{createError}</p>}

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
          <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
          <p className="text-sm font-medium text-text-primary">Couldn&apos;t load folders</p>
          <p className="max-w-sm text-sm text-text-muted">
            {error === "permission-denied"
              ? "Firestore denied reading the manualFolders collection. Make sure it allows read access to signed-in users."
              : `Error: ${error}`}
          </p>
        </div>
      ) : loading || !folders ? (
        <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : folders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
          <Folder className="h-6 w-6 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">No manual folders yet</p>
          <p className="max-w-sm text-sm text-text-muted">
            {canManage ? "Create a folder above to start uploading manuals." : "Check back once a manager adds reference manuals."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onOpenFolder(folder)}
              className="flex items-center gap-3 rounded-lg border border-border-hairline bg-surface-1 p-4 text-left transition-colors hover:bg-surface-2/60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-series-1/10 text-series-1">
                <Folder className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{folder.name}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
