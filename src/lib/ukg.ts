// Server-only helpers for talking to the UKG Ready REST API (client-credentials OAuth2 +
// the /ta/rest/v2 resource tree). Never import this from a "use client" file — it reads
// server env secrets (UKG_CLIENT_SECRET) directly.

export type UkgConfig = { hostname: string; companyId: string; clientId: string; clientSecret: string };

export class UkgApiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export function getUkgConfig(): UkgConfig | null {
  const hostname = process.env.UKG_HOSTNAME;
  const companyId = process.env.UKG_COMPANY_ID;
  const clientId = process.env.UKG_CLIENT_ID;
  const clientSecret = process.env.UKG_CLIENT_SECRET;
  if (!hostname || !companyId || !clientId || !clientSecret) return null;
  return { hostname, companyId, clientId, clientSecret };
}

export function ukgBaseUrl(hostname: string): string {
  const withProtocol = hostname.startsWith("http://") || hostname.startsWith("https://") ? hostname : `https://${hostname}`;
  return withProtocol.replace(/\/+$/, "");
}

/** Exchanges client_id/client_secret for a bearer token via UKG Ready's client-credentials grant. */
export async function getUkgAccessToken(config: UkgConfig): Promise<string> {
  const baseUrl = ukgBaseUrl(config.hostname);
  const tokenBody = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
  });

  let tokenRes: Response;
  try {
    tokenRes = await fetch(`${baseUrl}/ta/rest/v2/companies/${encodeURIComponent(config.companyId)}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
      cache: "no-store",
    });
  } catch (err) {
    throw new UkgApiError(`Couldn't reach UKG to authenticate: ${err instanceof Error ? err.message : String(err)}`);
  }

  const tokenBodyText = await tokenRes.text();
  if (!tokenRes.ok) {
    throw new UkgApiError(`UKG authentication failed (HTTP ${tokenRes.status}): ${tokenBodyText.slice(0, 500)}`);
  }

  let tokenJson: Record<string, unknown>;
  try {
    tokenJson = JSON.parse(tokenBodyText);
  } catch {
    throw new UkgApiError(`UKG authentication returned a non-JSON response: ${tokenBodyText.slice(0, 500)}`);
  }

  const token = tokenJson.access_token ?? tokenJson.accessToken ?? tokenJson.AccessToken;
  if (typeof token !== "string" || !token) {
    throw new UkgApiError(`UKG authentication succeeded but no access token was found in the response: ${tokenBodyText.slice(0, 500)}`);
  }
  return token;
}

/** GETs a UKG Ready REST resource (path relative to /ta/rest/v2) and returns the parsed JSON body. */
export async function ukgGet(config: UkgConfig, accessToken: string, path: string): Promise<unknown> {
  const baseUrl = ukgBaseUrl(config.hostname);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/ta/rest/v2${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (err) {
    throw new UkgApiError(`Couldn't reach UKG: ${err instanceof Error ? err.message : String(err)}`);
  }

  const bodyText = await res.text();
  if (!res.ok) {
    throw new UkgApiError(`UKG request to ${path} failed (HTTP ${res.status}): ${bodyText.slice(0, 500)}`);
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw new UkgApiError(`UKG request to ${path} returned a non-JSON response: ${bodyText.slice(0, 500)}`);
  }
}

// UKG Ready employee records don't use one consistent name field across tenants/versions —
// try the common conventions in priority order instead of hard-coding one shape.
export function extractEmployeeName(record: Record<string, unknown>): string | null {
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

  const fullNameFields = ["FullName", "fullName", "DisplayName", "displayName", "Name", "name", "EmployeeName", "employeeName"];
  for (const field of fullNameFields) {
    const v = str(record[field]);
    if (v) return v;
  }

  const firstLastPairs: [string, string][] = [
    ["first_name", "last_name"],
    ["FirstName", "LastName"],
    ["firstName", "lastName"],
    ["First_Name", "Last_Name"],
    ["PreferredFirstName", "PreferredLastName"],
    ["preferredFirstName", "preferredLastName"],
  ];
  for (const [firstField, lastField] of firstLastPairs) {
    const first = str(record[firstField]);
    const last = str(record[lastField]);
    if (first || last) return [first, last].filter(Boolean).join(" ");
  }

  return null;
}

// The human-readable employee code UKG Ready's own UI labels "Employee ID" — distinct from
// the internal numeric account id ("id") used in API paths.
export function extractEmployeeCode(record: Record<string, unknown>): string | null {
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

  const codeFields = ["employee_id", "EmployeeId", "EmployeeID", "employeeId", "Employee_Id", "employee_number", "EmployeeNumber"];
  for (const field of codeFields) {
    const v = str(record[field]);
    if (v) return v;
  }
  return null;
}

// UKG Ready employee records carry a top-level "status" (e.g. "Active", "Terminated",
// "On Leave") — only "Active" counts as a currently active employee.
export function isActiveEmployee(record: Record<string, unknown>): boolean {
  const status = record.status ?? record.Status;
  return typeof status === "string" && status.trim().toLowerCase() === "active";
}

/** Resolves our own employee_id code (e.g. "ISSI1191") to UKG's internal numeric account id + display name. */
export async function resolveEmployeeByCode(
  config: UkgConfig,
  accessToken: string,
  employeeCode: string
): Promise<{ internalId: string; name: string } | null> {
  const employeesJson = await ukgGet(config, accessToken, `/companies/${encodeURIComponent(config.companyId)}/employees`);
  const activeRecords = extractRecords(employeesJson).filter(isActiveEmployee);
  const match = activeRecords.find((r) => extractEmployeeCode(r)?.toLowerCase() === employeeCode.toLowerCase());
  if (!match) return null;

  const internalId = match.id ?? match.Id ?? match.ID;
  if (internalId === undefined || internalId === null) return null;

  return { internalId: String(internalId), name: extractEmployeeName(match) ?? employeeCode };
}

export type EmployeeDirectoryEntry = { internalId: string; code: string; name: string };

/**
 * Resolves many employee_id codes to UKG internal account ids (+ display names) in a single
 * employees-list fetch — far cheaper than calling resolveEmployeeByCode once per code when
 * aggregating across a whole facility's worth of employees. Keyed by our own employee_id code
 * (not UKG's internal id), since that's what callers already have on hand.
 */
export async function resolveEmployeeDirectory(
  config: UkgConfig,
  accessToken: string,
  codes: string[]
): Promise<Map<string, EmployeeDirectoryEntry>> {
  const employeesJson = await ukgGet(config, accessToken, `/companies/${encodeURIComponent(config.companyId)}/employees`);
  const activeRecords = extractRecords(employeesJson).filter(isActiveEmployee);

  const byCode = new Map<string, EmployeeDirectoryEntry>();
  for (const record of activeRecords) {
    const code = extractEmployeeCode(record);
    const internalId = record.id ?? record.Id ?? record.ID;
    if (code && internalId !== undefined && internalId !== null) {
      byCode.set(code.toLowerCase(), { internalId: String(internalId), code, name: extractEmployeeName(record) ?? code });
    }
  }

  const result = new Map<string, EmployeeDirectoryEntry>();
  for (const code of codes) {
    const entry = byCode.get(code.toLowerCase());
    if (entry) result.set(code, entry);
  }
  return result;
}

/** Runs async work over items with at most `limit` in flight at once. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// UKG list responses come back either as a bare array or wrapped in a container property —
// try the common wrapper keys before giving up.
export function extractRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    for (const key of ["data", "Data", "employees", "Employees", "results", "Results", "items", "Items"]) {
      const v = (payload as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v as Record<string, unknown>[];
    }
  }
  return [];
}
