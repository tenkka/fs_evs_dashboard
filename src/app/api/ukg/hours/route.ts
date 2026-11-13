import { getUkgConfig, getUkgAccessToken, ukgGet, resolveEmployeeDirectory, mapWithConcurrency, UkgApiError } from "@/lib/ukg";

export const runtime = "nodejs";

type RawTimeEntry = { total?: number };

export type HoursBreakdownEntry = { employeeCode: string; employeeName: string; totalMinutes: number };

/**
 * Actual clock-time minutes for a set of employees over a date range, summed server-side in
 * one request — one UKG call per resolved employee, not one browser round trip per employee,
 * so a facility-wide total (or a series of them for a trend chart) stays cheap to fetch. Also
 * returns a per-employee breakdown so a UI can drill into exactly who contributed the total.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const codesParam = searchParams.get("codes");
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  if (!codesParam || !startDate || !endDate) {
    return Response.json({ error: "Missing codes/start/end query parameters." }, { status: 400 });
  }
  const codes = codesParam.split(",").filter(Boolean);
  if (codes.length === 0) {
    return Response.json({ totalMinutes: 0, breakdown: [] });
  }

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

  try {
    const accessToken = await getUkgAccessToken(config);

    const directory = await resolveEmployeeDirectory(config, accessToken, codes);
    const employees = Array.from(directory.values());
    if (employees.length === 0) {
      return Response.json({ totalMinutes: 0, breakdown: [] });
    }

    const breakdown: HoursBreakdownEntry[] = await mapWithConcurrency(employees, 8, async (employee) => {
      const path = `/companies/${encodeURIComponent(config.companyId)}/employees/${encodeURIComponent(employee.internalId)}/time-entries?start_date=${startDate}&end_date=${endDate}`;
      const json = (await ukgGet(config, accessToken, path)) as { time_entries?: RawTimeEntry[] };
      const entries = Array.isArray(json.time_entries) ? json.time_entries : [];
      const totalMinutes = entries.reduce((sum, e) => sum + (typeof e.total === "number" ? Math.round(e.total / 60000) : 0), 0);
      return { employeeCode: employee.code, employeeName: employee.name, totalMinutes };
    });

    breakdown.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    const totalMinutes = breakdown.reduce((sum, b) => sum + b.totalMinutes, 0);
    return Response.json({ totalMinutes, breakdown });
  } catch (err) {
    if (err instanceof UkgApiError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
