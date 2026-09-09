export type Role = "employee" | "manager" | "admin";

export type Persona = {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: Role;
  /** A Firestore facility doc id (e.g. "riverside", "IVC"), or "all" for admins. */
  facility: string;
};

export const roleLabels: Record<Role, string> = {
  employee: "Employee",
  manager: "Manager",
  admin: "Admin",
};

/** Where each role lands after signing in. Employees get their own attendance view;
 * Managers and Admins share the Overview dashboard (scoped by facility for Managers). */
export function homePathForRole(role: Role): string {
  return role === "employee" ? "/attendance" : "/";
}

// Shape of a document in the Firestore "users" collection, doc id = Firebase Auth uid.
export type UserDoc = {
  email: string;
  first_name: string;
  last_name: string;
  role: string; // "EMPLOYEE" | "MANAGER" | "ADMIN" (case-insensitive)
  facility?: string; // doc id in the Firestore "facility" collection; defaults applied below if missing
};

function normalizeRole(raw: string): Role | null {
  const r = raw.trim().toLowerCase();
  return r === "employee" || r === "manager" || r === "admin" ? r : null;
}

function initialsFor(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
}

/** Builds a Persona from a Firestore users/{uid} document. Returns null if the document's role is missing/invalid. */
export function personaFromUserDoc(uid: string, doc: UserDoc): Persona | null {
  const role = normalizeRole(doc.role ?? "");
  if (!role) return null;

  // Pass through whatever facility doc id Firestore has — only fall back to the demo
  // default when the field is missing entirely.
  const facility = role === "admin" ? "all" : doc.facility?.trim() || "riverside";

  return {
    id: uid,
    email: doc.email,
    name: `${doc.first_name} ${doc.last_name}`.trim(),
    initials: initialsFor(doc.first_name ?? "", doc.last_name ?? ""),
    role,
    facility,
  };
}
