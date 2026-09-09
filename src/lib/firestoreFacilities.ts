"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, type FirestoreError } from "firebase/firestore";
import { db } from "./firebase";

// Firestore "facility" collection — doc id matches the app's FacilityId ("riverside", "lakeside")
// so it lines up with the facility already stamped on employees/shifts/attendance/KPI data.
export type FacilityDoc = {
  id: string;
  name: string;
  address: string;
  type: string;
};

export function subscribeToFacilities(
  onData: (facilities: FacilityDoc[]) => void,
  onError: (err: FirestoreError) => void
): () => void {
  if (!db) return () => {};

  return onSnapshot(
    collection(db, "facility"),
    (snap) => {
      const facilities: FacilityDoc[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? d.id,
          address: data.address ?? "",
          type: data.type ?? "",
        };
      });
      onData(facilities);
    },
    onError
  );
}

/** Live map of facility id -> Firestore facility doc (name/address/type). Null while loading. */
export function useFacilityDocs(): Record<string, FacilityDoc> | null {
  const [byId, setById] = useState<Record<string, FacilityDoc> | null>(null);

  useEffect(() => {
    return subscribeToFacilities(
      (facilities) => setById(Object.fromEntries(facilities.map((f) => [f.id, f]))),
      () => setById({})
    );
  }, []);

  return byId;
}
