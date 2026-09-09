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

export type WeeklyPhoto = {
  id: string;
  facility: string;
  uploaderUid: string;
  uploaderName: string;
  imageUrl: string;
  storagePath: string;
  comment: string;
  createdAt: Date;
};

const MAX_PHOTOS = 100;

export function subscribeToWeeklyPhotos(
  facilityScope: string,
  onData: (photos: WeeklyPhoto[]) => void,
  onError: (err: FirestoreError) => void
): () => void {
  if (!db) return () => {};

  const photosCollection = collection(db, "weeklyPhotos");
  const q = facilityScope === "all" ? photosCollection : query(photosCollection, where("facility", "==", facilityScope));

  return onSnapshot(
    q,
    (snap) => {
      const photos: WeeklyPhoto[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            facility: data.facility,
            uploaderUid: data.uploaderUid,
            uploaderName: data.uploaderName,
            imageUrl: data.imageUrl,
            storagePath: data.storagePath,
            comment: data.comment ?? "",
            // A just-written doc reads back with a pending (null) server timestamp until confirmed.
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, MAX_PHOTOS);
      onData(photos);
    },
    onError
  );
}

// Tags a fetched result with the scope it was fetched for, so a stale result from a
// just-changed facility filter is never mistaken for the current one.
type LoadState = { scope: string; photos: WeeklyPhoto[] } | { scope: string; error: string };

export function useWeeklyPhotos(facilityScope: string): { photos: WeeklyPhoto[] | null; error: string | null } {
  const [loadState, setLoadState] = useState<LoadState | null>(null);

  useEffect(() => {
    return subscribeToWeeklyPhotos(
      facilityScope,
      (photos) => setLoadState({ scope: facilityScope, photos }),
      (err) => setLoadState({ scope: facilityScope, error: err.code })
    );
  }, [facilityScope]);

  const current = loadState?.scope === facilityScope ? loadState : null;
  return {
    photos: current && "photos" in current ? current.photos : null,
    error: current && "error" in current ? current.error : null,
  };
}

export async function uploadWeeklyPhoto(
  file: File,
  facility: string,
  uploaderUid: string,
  uploaderName: string,
  comment: string
): Promise<void> {
  if (!db || !storage) throw new Error("Firebase isn't configured.");
  const storagePath = `weeklyPhotos/${facility}/${Date.now()}_${uploaderUid}_${file.name}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const imageUrl = await getDownloadURL(storageRef);
  await addDoc(collection(db, "weeklyPhotos"), {
    facility,
    uploaderUid,
    uploaderName,
    imageUrl,
    storagePath,
    comment,
    createdAt: serverTimestamp(),
  });
}

export async function deleteWeeklyPhoto(photo: WeeklyPhoto): Promise<void> {
  if (!db || !storage) throw new Error("Firebase isn't configured.");
  await deleteDoc(doc(db, "weeklyPhotos", photo.id));
  await deleteObject(ref(storage, photo.storagePath)).catch(() => {});
}
