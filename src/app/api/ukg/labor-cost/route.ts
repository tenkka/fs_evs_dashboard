import { getUkgConfig, getUkgAccessToken, ukgGet, resolveEmployeeDirectory, mapWithConcurrency, UkgApiError } from "@/lib/ukg";

export const runtime = "nodejs";

type RawPayroll = { id: number | string; name?: string; start_date?: string; end_date?: string };
type RawPayStatementSummary = { id: number | string; employee?: { account_id?: number | string } };
type RawAmountLine = { ee_amount?: number };
type RawPayStatementDetail = { earnings?: RawAmountLine[] };

export type LaborCostBreakdownEntry = {
  employeeCode: string;
  employeeName: string;
  payrollId: string;
  payrollName: string;
  periodStart: string;
  periodEnd: string;
  grossPay: number;
  proratedGrossPay: number;
};

const sumAmounts = (lines: RawAmountLine[] | undefined): number =>
  (lines ?? []).reduce((sum, line) => sum + (typeof line.ee_amount === "number" ? line.ee_amount : 0), 0);

function dateKeyToDayIndex(dateKey: string): number {
  return Math.floor(new Date(`${dateKey}T00:00:00Z`).getTime() / 86400000);
}

/**
 * The fraction of a payroll's worked days that fall inside [rangeStart, rangeEnd] — e.g. a
 * biweekly payroll running Oct 26–Nov 8 is half in October, half in November. A payroll that
 * doesn't overlap the range at all returns 0; one fully contained in it returns 1.
 */
function overlapFraction(payrollStart: string, payrollEnd: string, rangeStart: string, rangeEnd: string): number {
  const totalDays = dateKeyToDayIndex(payrollEnd) - dateKeyToDayIndex(payrollStart) + 1;
  if (totalDays <= 0) return 0;
  const overlapStart = Math.max(dateKeyToDayIndex(payrollStart), dateKeyToDayIndex(rangeStart));
  const overlapEnd = Math.min(dateKeyToDayIndex(payrollEnd), dateKeyToDayIndex(rangeEnd));
  const overlapDays = overlapEnd - overlapStart + 1;
  return overlapDays > 0 ? overlapDays / totalDays : 0;
}

/**
 * Actual labor cost (gross pay) for a set of employees over a date range — scoped by which
 * payroll runs actually overlap the worked period (via each payroll's own start/end dates,
 * not its later pay date), so a facility's labor cost lines up with the same period used for
 * its actual hours and actual spending. A payroll that straddles two calendar periods (e.g. a
 * biweekly run spanning month-end) has its gross pay prorated by the fraction of its days that
 * fall in each period, so the two periods split it rather than both counting it in full. Also
 * returns a per-employee, per-payroll breakdown so a UI can drill into exactly what made up
 * the total.
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
    return Response.json({ laborCost: 0, breakdown: [] });
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
    const byInternalId = new Map(Array.from(directory.values()).map((entry) => [entry.internalId, entry]));
    if (byInternalId.size === 0) {
      return Response.json({ laborCost: 0, breakdown: [] });
    }

    const payrollsJson = (await ukgGet(config, accessToken, `/companies/${encodeURIComponent(config.companyId)}/payrolls`)) as {
      payrolls?: RawPayroll[];
    };
    const payrolls = payrollsJson.payrolls ?? [];

    // Only payroll runs whose worked period overlaps the requested date range are relevant —
    // each carries the fraction of its own days that fall inside the range, for proration.
    const relevant = payrolls
      .map((p) => ({ payroll: p, fraction: overlapFraction(p.start_date ?? "", p.end_date ?? "", startDate, endDate) }))
      .filter((r) => r.fraction > 0);

    const matchesPerPayroll = await mapWithConcurrency(relevant, 8, async ({ payroll, fraction }) => {
      const json = (await ukgGet(
        config,
        accessToken,
        `/companies/${encodeURIComponent(config.companyId)}/payrolls/${payroll.id}/pay-statements`
      )) as { pay_statements?: RawPayStatementSummary[] };
      return (json.pay_statements ?? [])
        .filter((s) => byInternalId.has(String(s.employee?.account_id)))
        .map((s) => ({ payroll, statementId: s.id, accountId: String(s.employee?.account_id), fraction }));
    });

    const matches = matchesPerPayroll.flat();

    const breakdown: LaborCostBreakdownEntry[] = await mapWithConcurrency(matches, 8, async ({ payroll, statementId, accountId, fraction }) => {
      const detail = (await ukgGet(
        config,
        accessToken,
        `/companies/${encodeURIComponent(config.companyId)}/payrolls/${payroll.id}/pay-statements/${statementId}`
      )) as RawPayStatementDetail;
      const grossPay = sumAmounts(detail.earnings);
      const employee = byInternalId.get(accountId);
      return {
        employeeCode: employee?.code ?? accountId,
        employeeName: employee?.name ?? accountId,
        payrollId: String(payroll.id),
        payrollName: payroll.name ?? `Payroll #${payroll.id}`,
        periodStart: payroll.start_date ?? "",
        periodEnd: payroll.end_date ?? "",
        grossPay: Math.round(grossPay * 100) / 100,
        proratedGrossPay: Math.round(grossPay * fraction * 100) / 100,
      };
    });

    breakdown.sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.periodStart.localeCompare(b.periodStart));

    const laborCost = Math.round(breakdown.reduce((sum, b) => sum + b.proratedGrossPay, 0) * 100) / 100;

    return Response.json({ laborCost, statementCount: breakdown.length, breakdown });
  } catch (err) {
    if (err instanceof UkgApiError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
