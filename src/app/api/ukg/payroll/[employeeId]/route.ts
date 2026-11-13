import { getUkgConfig, getUkgAccessToken, ukgGet, resolveEmployeeByCode, mapWithConcurrency, UkgApiError } from "@/lib/ukg";

export const runtime = "nodejs";

type RawPayroll = {
  id: number | string;
  name?: string;
  pay_date?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
};

type RawPayStatementSummary = {
  id: number | string;
  employee?: { account_id?: number | string };
};

type RawAmountLine = { ee_amount?: number; type_name?: string };

type RawPayStatementDetail = {
  earnings?: RawAmountLine[];
  deductions?: RawAmountLine[];
  taxes?: RawAmountLine[];
  payments?: RawAmountLine[];
};

const sumAmounts = (lines: RawAmountLine[] | undefined): number =>
  (lines ?? []).reduce((sum, line) => sum + (typeof line.ee_amount === "number" ? line.ee_amount : 0), 0);

export async function GET(_request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
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

  try {
    const accessToken = await getUkgAccessToken(config);

    const resolved = await resolveEmployeeByCode(config, accessToken, employeeCode);
    if (!resolved) {
      return Response.json({ error: `No active employee found in UKG with employee ID "${employeeCode}".` }, { status: 404 });
    }
    const { internalId, name: employeeName } = resolved;

    const payrollsJson = (await ukgGet(config, accessToken, `/companies/${encodeURIComponent(config.companyId)}/payrolls`)) as {
      payrolls?: RawPayroll[];
    };
    const payrolls = payrollsJson.payrolls ?? [];

    const matches = await mapWithConcurrency(payrolls, 8, async (payroll) => {
      const json = (await ukgGet(
        config,
        accessToken,
        `/companies/${encodeURIComponent(config.companyId)}/payrolls/${payroll.id}/pay-statements`
      )) as { pay_statements?: RawPayStatementSummary[] };
      const statement = (json.pay_statements ?? []).find((s) => String(s.employee?.account_id) === internalId);
      return statement ? { payroll, statementId: statement.id } : null;
    });

    const found = matches.filter((m): m is { payroll: RawPayroll; statementId: number | string } => m !== null);

    const details = await mapWithConcurrency(found, 8, async ({ payroll, statementId }) => {
      const detail = (await ukgGet(
        config,
        accessToken,
        `/companies/${encodeURIComponent(config.companyId)}/payrolls/${payroll.id}/pay-statements/${statementId}`
      )) as RawPayStatementDetail;

      const grossPay = sumAmounts(detail.earnings);
      const totalDeductions = sumAmounts(detail.deductions);
      const totalTaxes = sumAmounts(detail.taxes);
      const netPay = sumAmounts(detail.payments);

      return {
        payrollId: String(payroll.id),
        statementId: String(statementId),
        name: payroll.name ?? "",
        payDate: payroll.pay_date ?? "",
        periodStart: payroll.start_date ?? "",
        periodEnd: payroll.end_date ?? "",
        status: payroll.status ?? "",
        grossPay,
        totalDeductions,
        totalTaxes,
        netPay,
      };
    });

    details.sort((a, b) => b.payDate.localeCompare(a.payDate));

    return Response.json({ employeeName, employeeCode, payrolls: details });
  } catch (err) {
    if (err instanceof UkgApiError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
