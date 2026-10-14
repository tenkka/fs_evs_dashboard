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
  updateDoc,
  where,
  type FirestoreError,
} from "firebase/firestore";
import { db } from "./firebase";

export type FieldType = "text" | "textarea" | "number" | "boolean" | "rating" | "date" | "compliance" | "select";

export type FormFieldDef = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** Only used when type is "select" — the list of choices. */
  options?: string[];
};

export type KpiForm = {
  id: string;
  title: string;
  description: string;
  fields: FormFieldDef[];
  createdByName: string;
  createdAt: Date;
};

export type AnswerValue = string | number | boolean;

export type RecurrenceType = "once" | "weekly" | "biweekly" | "monthly";

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type FormAssignment = {
  id: string;
  formId: string;
  formTitle: string;
  facility: string;
  assignedToUid: string;
  assignedToName: string;
  assignedByName: string;
  recurrence: RecurrenceType;
  /** Weekly/bi-weekly: 0 (Sunday) - 6 (Saturday). */
  dayOfWeek: number | null;
  /** Monthly: 1-31. */
  dayOfMonth: number | null;
  /** Anchor date the recurrence is computed relative to (mainly for bi-weekly). */
  startDate: Date;
  /** Only meaningful for "once" assignments. */
  dueDate: Date | null;
  /** Only meaningful for "once" assignments — recurring status is derived from submissions. */
  status: "pending" | "completed";
  createdAt: Date;
  /** Only meaningful for "once" assignments. */
  submissionId: string | null;
};

export type FormSubmission = {
  id: string;
  formId: string;
  formTitle: string;
  facility: string;
  submittedByUid: string;
  submittedByName: string;
  assignmentId: string | null;
  /** Set when the submission closes out one occurrence of a recurring assignment. */
  periodKey: string | null;
  answers: Record<string, AnswerValue>;
  submittedAt: Date;
};

export type FacilityKpiForm = {
  id: string;
  facility: string;
  formId: string;
  formTitle: string;
  addedByName: string;
  addedAt: Date;
};

function toDate(ts: { toDate?: () => Date } | null | undefined): Date | null {
  return ts?.toDate?.() ?? null;
}

// ---- Recurrence helpers ----

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() + diff);
  return monday;
}

/** The key identifying which recurrence period `today` falls in — null for one-time assignments. */
export function currentPeriodKey(assignment: FormAssignment, today: Date = new Date()): string | null {
  if (assignment.recurrence === "weekly") return dateKey(startOfWeek(today));
  if (assignment.recurrence === "biweekly") {
    const anchorMonday = startOfWeek(assignment.startDate);
    const thisMonday = startOfWeek(today);
    const weeksSince = Math.round((thisMonday.getTime() - anchorMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const biweekIndex = Math.floor(weeksSince / 2);
    return `biweek-${biweekIndex}`;
  }
  if (assignment.recurrence === "monthly") return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  return null;
}

/** Whether this assignment has been fulfilled for the period containing `today`. */
export function isAssignmentDoneForCurrentPeriod(
  assignment: FormAssignment,
  submissions: FormSubmission[],
  today: Date = new Date()
): boolean {
  if (assignment.recurrence === "once") return assignment.status === "completed";
  const key = currentPeriodKey(assignment, today);
  return submissions.some((s) => s.assignmentId === assignment.id && s.periodKey === key);
}

export function recurrenceLabel(a: FormAssignment): string {
  if (a.recurrence === "weekly") return `Weekly · ${WEEKDAY_NAMES[a.dayOfWeek ?? 1]}`;
  if (a.recurrence === "biweekly") return `Bi-weekly · ${WEEKDAY_NAMES[a.dayOfWeek ?? 1]}`;
  if (a.recurrence === "monthly") return `Monthly · Day ${a.dayOfMonth ?? 1}`;
  return "One-time";
}

// ---- Form templates ----

export function useKpiForms(): { forms: KpiForm[] | null; error: string | null } {
  const [state, setState] = useState<{ forms: KpiForm[] } | { error: string } | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, "kpiForms"),
      (snap) => {
        const forms: KpiForm[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title ?? "Untitled form",
              description: data.description ?? "",
              fields: (data.fields ?? []) as FormFieldDef[],
              createdByName: data.createdByName ?? "",
              createdAt: toDate(data.createdAt) ?? new Date(),
            };
          })
          .sort((a, b) => a.title.localeCompare(b.title));
        setState({ forms });
      },
      (err: FirestoreError) => setState({ error: err.code })
    );
  }, []);

  return {
    forms: state && "forms" in state ? state.forms : null,
    error: state && "error" in state ? state.error : null,
  };
}

// ---- Facility form selection ----

type FacilityFormsState = { key: string; facilityForms: FacilityKpiForm[] } | { key: string; error: string };

export function useFacilityKpiForms(facility: string): { facilityForms: FacilityKpiForm[] | null; error: string | null } {
  const [state, setState] = useState<FacilityFormsState | null>(null);

  useEffect(() => {
    if (!db || !facility || facility === "all") return;
    return onSnapshot(
      query(collection(db, "facilityKpiForms"), where("facility", "==", facility)),
      (snap) => {
        const facilityForms: FacilityKpiForm[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              facility: data.facility,
              formId: data.formId,
              formTitle: data.formTitle ?? "",
              addedByName: data.addedByName ?? "",
              addedAt: toDate(data.addedAt) ?? new Date(),
            };
          })
          .sort((a, b) => a.formTitle.localeCompare(b.formTitle));
        setState({ key: facility, facilityForms });
      },
      (err: FirestoreError) => setState({ key: facility, error: err.code })
    );
  }, [facility]);

  const current = state?.key === facility ? state : null;
  return {
    facilityForms: current && "facilityForms" in current ? current.facilityForms : null,
    error: current && "error" in current ? current.error : null,
  };
}

export async function addFacilityKpiForm(facility: string, formId: string, formTitle: string, addedByName: string): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  await addDoc(collection(db, "facilityKpiForms"), {
    facility,
    formId,
    formTitle,
    addedByName,
    addedAt: serverTimestamp(),
  });
}

export async function removeFacilityKpiForm(id: string): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  await deleteDoc(doc(db, "facilityKpiForms", id));
}

// ---- Assignments ----

type AssignState = { key: string; assignments: FormAssignment[] } | { key: string; error: string };

function mapAssignment(id: string, data: Record<string, unknown>): FormAssignment {
  return {
    id,
    formId: data.formId as string,
    formTitle: (data.formTitle as string) ?? "",
    facility: data.facility as string,
    assignedToUid: data.assignedToUid as string,
    assignedToName: (data.assignedToName as string) ?? "",
    assignedByName: (data.assignedByName as string) ?? "",
    recurrence: (data.recurrence as RecurrenceType) ?? "once",
    dayOfWeek: (data.dayOfWeek as number | null) ?? null,
    dayOfMonth: (data.dayOfMonth as number | null) ?? null,
    startDate: toDate(data.startDate as { toDate?: () => Date } | null) ?? toDate(data.createdAt as { toDate?: () => Date } | null) ?? new Date(),
    dueDate: toDate(data.dueDate as { toDate?: () => Date } | null),
    status: (data.status as "pending" | "completed") ?? "pending",
    createdAt: toDate(data.createdAt as { toDate?: () => Date } | null) ?? new Date(),
    submissionId: (data.submissionId as string | null) ?? null,
  };
}

export function useAssignmentsForUser(uid: string): { assignments: FormAssignment[] | null; error: string | null } {
  const [state, setState] = useState<AssignState | null>(null);

  useEffect(() => {
    if (!db || !uid) return;
    return onSnapshot(
      query(collection(db, "kpiFormAssignments"), where("assignedToUid", "==", uid)),
      (snap) => {
        const assignments = snap.docs
          .map((d) => mapAssignment(d.id, d.data()))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setState({ key: uid, assignments });
      },
      (err: FirestoreError) => setState({ key: uid, error: err.code })
    );
  }, [uid]);

  const current = state?.key === uid ? state : null;
  return {
    assignments: current && "assignments" in current ? current.assignments : null,
    error: current && "error" in current ? current.error : null,
  };
}

export function useAssignmentsForFacility(facilityScope: string): { assignments: FormAssignment[] | null; error: string | null } {
  const [state, setState] = useState<AssignState | null>(null);

  useEffect(() => {
    if (!db) return;
    const assignmentsCollection = collection(db, "kpiFormAssignments");
    const q = facilityScope === "all" ? assignmentsCollection : query(assignmentsCollection, where("facility", "==", facilityScope));
    return onSnapshot(
      q,
      (snap) => {
        const assignments = snap.docs
          .map((d) => mapAssignment(d.id, d.data()))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setState({ key: facilityScope, assignments });
      },
      (err: FirestoreError) => setState({ key: facilityScope, error: err.code })
    );
  }, [facilityScope]);

  const current = state?.key === facilityScope ? state : null;
  return {
    assignments: current && "assignments" in current ? current.assignments : null,
    error: current && "error" in current ? current.error : null,
  };
}

export async function assignForm(
  formId: string,
  formTitle: string,
  facility: string,
  assignedToUid: string,
  assignedToName: string,
  assignedByName: string,
  recurrence: RecurrenceType,
  options: { dueDate?: Date | null; dayOfWeek?: number | null; dayOfMonth?: number | null } = {}
): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  await addDoc(collection(db, "kpiFormAssignments"), {
    formId,
    formTitle,
    facility,
    assignedToUid,
    assignedToName,
    assignedByName,
    recurrence,
    dayOfWeek: options.dayOfWeek ?? null,
    dayOfMonth: options.dayOfMonth ?? null,
    startDate: Timestamp.fromDate(new Date()),
    dueDate: options.dueDate ? Timestamp.fromDate(options.dueDate) : null,
    status: "pending",
    submissionId: null,
    createdAt: serverTimestamp(),
  });
}

// ---- Submissions ----

type SubmissionState = { key: string; submissions: FormSubmission[] } | { key: string; error: string };

function mapSubmission(id: string, data: Record<string, unknown>): FormSubmission {
  return {
    id,
    formId: data.formId as string,
    formTitle: (data.formTitle as string) ?? "",
    facility: data.facility as string,
    submittedByUid: data.submittedByUid as string,
    submittedByName: (data.submittedByName as string) ?? "",
    assignmentId: (data.assignmentId as string | null) ?? null,
    periodKey: (data.periodKey as string | null) ?? null,
    answers: (data.answers as Record<string, AnswerValue>) ?? {},
    submittedAt: toDate(data.submittedAt as { toDate?: () => Date } | null) ?? new Date(),
  };
}

export function useSubmissionsForFacility(facilityScope: string): { submissions: FormSubmission[] | null; error: string | null } {
  const [state, setState] = useState<SubmissionState | null>(null);

  useEffect(() => {
    if (!db) return;
    const submissionsCollection = collection(db, "kpiFormSubmissions");
    const q = facilityScope === "all" ? submissionsCollection : query(submissionsCollection, where("facility", "==", facilityScope));
    return onSnapshot(
      q,
      (snap) => {
        const submissions = snap.docs.map((d) => mapSubmission(d.id, d.data())).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
        setState({ key: facilityScope, submissions });
      },
      (err: FirestoreError) => setState({ key: facilityScope, error: err.code })
    );
  }, [facilityScope]);

  const current = state?.key === facilityScope ? state : null;
  return {
    submissions: current && "submissions" in current ? current.submissions : null,
    error: current && "error" in current ? current.error : null,
  };
}

export function useSubmissionsForUser(uid: string): { submissions: FormSubmission[] | null; error: string | null } {
  const [state, setState] = useState<SubmissionState | null>(null);

  useEffect(() => {
    if (!db || !uid) return;
    return onSnapshot(
      query(collection(db, "kpiFormSubmissions"), where("submittedByUid", "==", uid)),
      (snap) => {
        const submissions = snap.docs.map((d) => mapSubmission(d.id, d.data())).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
        setState({ key: uid, submissions });
      },
      (err: FirestoreError) => setState({ key: uid, error: err.code })
    );
  }, [uid]);

  const current = state?.key === uid ? state : null;
  return {
    submissions: current && "submissions" in current ? current.submissions : null,
    error: current && "error" in current ? current.error : null,
  };
}

export async function submitForm(
  formId: string,
  formTitle: string,
  facility: string,
  submittedByUid: string,
  submittedByName: string,
  answers: Record<string, AnswerValue>,
  assignmentId: string | null,
  periodKey: string | null = null
): Promise<void> {
  if (!db) throw new Error("Firestore isn't configured.");
  const submissionRef = await addDoc(collection(db, "kpiFormSubmissions"), {
    formId,
    formTitle,
    facility,
    submittedByUid,
    submittedByName,
    assignmentId,
    periodKey,
    answers,
    submittedAt: serverTimestamp(),
  });

  // A one-time assignment is marked complete directly; a recurring one is tracked purely
  // through periodKey-tagged submissions so it naturally resets each new period.
  if (assignmentId && !periodKey) {
    await updateDoc(doc(db, "kpiFormAssignments", assignmentId), {
      status: "completed",
      submissionId: submissionRef.id,
    });
  }
}
