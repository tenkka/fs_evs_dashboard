"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type FirestoreError,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";

export type ManualFolder = {
  id: string;
  name: string;
  createdByName: string;
  createdAt: Date;
};

export type ManualFile = {
  id: string;
  folderId: string;
  name: string;
  storagePath: string;
  downloadUrl: string;
  sizeBytes: number;
  uploadedByUid: string;
  uploadedByName: string;
  createdAt: Date;
};

function toDate(ts: { toDate?: () => Date } | null | undefined): Date {
  return ts?.toDate?.() ?? new Date();
}

export function useManualFolders(): { folders: ManualFolder[] | null; error: string | null } {
  const [state, setState] = useState<{ folders: ManualFolder[] } | { error: string } | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, "manualFolders"),
      (snap) => {
        const folders: ManualFolder[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name ?? "Untitled",
              createdByName: data.createdByName ?? "",
              createdAt: toDate(data.createdAt),
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        setState({ folders });
      },
      (err: FirestoreError) => setState({ error: err.code })
    );
  }, []);

  return {
    folders: state && "folders" in state ? state.folders : null,
    error: state && "error" in state ? state.error : null,
  };
}

export async function createManualFolder(name: string, uid: string, uploaderName: string): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  await addDoc(collection(db, "manualFolders"), {
    name,
    createdByUid: uid,
    createdByName: uploaderName,
    createdAt: serverTimestamp(),
  });
}

// Tags a fetched result with the folder it was fetched for, so a stale result from a
// just-changed folder is never mistaken for the current one.
type FilesState = { folderId: string; files: ManualFile[] } | { folderId: string; error: string };

export function useManualFiles(folderId: string | null): { files: ManualFile[] | null; error: string | null } {
  const [state, setState] = useState<FilesState | null>(null);

  useEffect(() => {
    if (!db || !folderId) return;
    return onSnapshot(
      query(collection(db, "manualFiles"), where("folderId", "==", folderId)),
      (snap) => {
        const files: ManualFile[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              folderId: data.folderId,
              name: data.name,
              storagePath: data.storagePath,
              downloadUrl: data.downloadUrl,
              sizeBytes: data.sizeBytes ?? 0,
              uploadedByUid: data.uploadedByUid,
              uploadedByName: data.uploadedByName,
              createdAt: toDate(data.createdAt),
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        setState({ folderId, files });
      },
      (err: FirestoreError) => setState({ folderId, error: err.code })
    );
  }, [folderId]);

  const current = state?.folderId === folderId ? state : null;
  return {
    files: current && "files" in current ? current.files : null,
    error: current && "error" in current ? current.error : null,
  };
}

export async function uploadManualFile(
  folderId: string,
  file: File,
  uploaderUid: string,
  uploaderName: string
): Promise<void> {
  if (!db || !storage) throw new Error("Firebase isn't configured.");
  const storagePath = `manuals/${folderId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  await addDoc(collection(db, "manualFiles"), {
    folderId,
    name: file.name,
    storagePath,
    downloadUrl,
    sizeBytes: file.size,
    uploadedByUid: uploaderUid,
    uploadedByName: uploaderName,
    createdAt: serverTimestamp(),
  });
}

export async function deleteManualFile(file: ManualFile): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  await deleteDoc(doc(db, "manualFiles", file.id));
  if (storage) {
    await deleteObject(ref(storage, file.storagePath)).catch(() => {});
  }
}
