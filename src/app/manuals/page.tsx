"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ManualFolderGrid } from "@/components/manuals/ManualFolderGrid";
import { ManualFolderView } from "@/components/manuals/ManualFolderView";
import { useAuthedUser } from "@/lib/UserContext";
import type { ManualFolder } from "@/lib/manuals";

export default function ManualsPage() {
  const { persona } = useAuthedUser();
  const canManage = persona.role === "manager" || persona.role === "admin";
  const [selectedFolder, setSelectedFolder] = useState<ManualFolder | null>(null);

  return (
    <>
      <Header title="Manuals" description={selectedFolder ? selectedFolder.name : "Reference documents and procedures"} />

      <main className="flex-1 space-y-6 p-5">
        {selectedFolder ? (
          <ManualFolderView folder={selectedFolder} canManage={canManage} onBack={() => setSelectedFolder(null)} />
        ) : (
          <ManualFolderGrid canManage={canManage} onOpenFolder={setSelectedFolder} />
        )}
      </main>
    </>
  );
}
