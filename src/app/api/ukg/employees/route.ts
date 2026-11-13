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

export async function GET() {
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
    const employeesJson = await ukgGet(config, accessToken, `/companies/${encodeURIComponent(config.companyId)}/employees`);

    const records = extractRecords(employeesJson);
    const activeRecords = records.filter(isActiveEmployee);

    const employees = activeRecords
      .map((record) => {
        const id = record.id ?? record.Id ?? record.ID;
        const name = extractEmployeeName(record);
        if (id === undefined || id === null || !name) return null;
        return { id: String(id), name, employeeId: extractEmployeeCode(record) ?? "—" };
      })
      .filter((e): e is { id: string; name: string; employeeId: string } => e !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (activeRecords.length > 0 && employees.length === 0) {
      return Response.json(
        {
          error: `Got ${activeRecords.length} active employee record(s) from UKG, but couldn't find a recognizable id/name field. First record's fields: ${Object.keys(activeRecords[0]).join(", ")}`,
        },
        { status: 502 }
      );
    }

    return Response.json({ employees });
  } catch (err) {
    if (err instanceof UkgApiError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
