import {
  getUkgConfig,
  getUkgAccessToken,
  ukgGet,
  extractRecords,
  extractEmployeeName,
  extractEmployeeCode,
  isActiveEmployee,
  UkgApiError,
} from "@/lib/ukg";

export const runtime = "nodejs";

type RawTimeEntry = {
  id?: number | string;
  date?: string;
  start_time?: string | null;
  end_time?: string | null;
  total?: number;
  type?: string;
  approval_status?: string;
};

export async function GET(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  // The route param is the employee_id *code* (e.g. "ISSI1346") as stored in our own
  // database — not UKG's internal numeric account id, which UKG's API requires for the
  // actual time-entries call and has to be resolved first.
  const { employeeId: employeeCode } = await params;

  const config = getUkgConfig();
  if (!config) {
    return Response.json(
      {
        error:
          "UKG isn't configured yet — add UKG_HOSTNAME, UKG_COMPANY_ID, UKG_CLIENT_ID, and UKG_CLIENT_SECRET to your server environment.",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");
  if (!startDate || !endDate) {
    return Response.json({ error: "Missing start/end query parameters." }, { status: 400 });
  }

  try {
    const accessToken = await getUkgAccessToken(config);

    const employeesJson = await ukgGet(config, accessToken, `/companies/${encodeURIComponent(config.companyId)}/employees`);
    const activeRecords = extractRecords(employeesJson).filter(isActiveEmployee);
    const match = activeRecords.find((r) => extractEmployeeCode(r)?.toLowerCase() === employeeCode.toLowerCase());

    if (!match) {
      return Response.json({ error: `No active employee found in UKG with employee ID "${employeeCode}".` }, { status: 404 });
    }

    const internalId = match.id ?? match.Id ?? match.ID;
    const employeeName = extractEmployeeName(match) ?? employeeCode;
    if (internalId === undefined || internalId === null) {
      return Response.json({ error: `Matched employee "${employeeCode}" but UKG's record has no account id.` }, { status: 502 });
    }

    const path = `/companies/${encodeURIComponent(config.companyId)}/employees/${encodeURIComponent(String(internalId))}/time-entries?start_date=${startDate}&end_date=${endDate}`;
    const json = (await ukgGet(config, accessToken, path)) as { time_entries?: RawTimeEntry[] };

    const rawEntries = Array.isArray(json.time_entries) ? json.time_entries : [];
    const entries = rawEntries
      .map((e) => ({
        id: e.id !== undefined ? String(e.id) : "",
        date: e.date ?? "",
        startTime: e.start_time ?? null,
        endTime: e.end_time ?? null,
        totalMinutes: typeof e.total === "number" ? Math.round(e.total / 60000) : 0,
        type: e.type ?? "",
        approvalStatus: e.approval_status ?? "",
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));

    const totalMinutes = entries.reduce((sum, e) => sum + e.totalMinutes, 0);

    return Response.json({ employeeName, employeeCode, startDate, endDate, entries, totalMinutes });
  } catch (err) {
    if (err instanceof UkgApiError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
