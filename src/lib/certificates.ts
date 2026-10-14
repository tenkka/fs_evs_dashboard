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
  Timestamp,
  where,
  type FirestoreError,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";

export type Certificate = {
  id: string;
  uid: string;
  name: string;
  fileUrl: string;
  filePath: string;
  fileName: string;
  validFrom: Date;
  expirationDate: Date | null;
  createdAt: Date;
};

function toDate(ts: { toDate?: () => Date } | null | undefined): Date | null {
  return ts?.toDate?.() ?? null;
}

// Tags a fetched result with the uid it was fetched for, so a stale result from a
// just-switched account is never mistaken for the current one.
type CertState = { uid: string; certificates: Certificate[] } | { uid: string; error: string };

export function useCertificates(uid: string): { certificates: Certificate[] | null; error: string | null } {
  const [state, setState] = useState<CertState | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(collection(db, "certificates"), where("uid", "==", uid)),
      (snap) => {
        const certificates: Certificate[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              uid: data.uid,
              name: data.name,
              fileUrl: data.fileUrl,
              filePath: data.filePath,
              fileName: data.fileName,
              validFrom: toDate(data.validFrom) ?? new Date(),
              expirationDate: toDate(data.expirationDate),
              createdAt: toDate(data.createdAt) ?? new Date(),
            };
          })
          .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());
        setState({ uid, certificates });
      },
      (err: FirestoreError) => setState({ uid, error: err.code })
    );
  }, [uid]);

  const current = state?.uid === uid ? state : null;
  return {
    certificates: current && "certificates" in current ? current.certificates : null,
    error: current && "error" in current ? current.error : null,
  };
}

export async function uploadCertificate(
  uid: string,
  file: File,
  name: string,
  validFrom: Date,
  expirationDate: Date | null
): Promise<void> {
  if (!db || !storage) throw new Error("Firebase isn't configured.");
  const filePath = `certificates/${uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file);
  const fileUrl = await getDownloadURL(storageRef);
  await addDoc(collection(db, "certificates"), {
    uid,
    name,
    fileUrl,
    filePath,
    fileName: file.name,
    validFrom: Timestamp.fromDate(validFrom),
    expirationDate: expirationDate ? Timestamp.fromDate(expirationDate) : null,
    createdAt: serverTimestamp(),
  });
}

export async function deleteCertificate(cert: Certificate): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  await deleteDoc(doc(db, "certificates", cert.id));
  if (storage) {
    await deleteObject(ref(storage, cert.filePath)).catch(() => {});
  }
}
