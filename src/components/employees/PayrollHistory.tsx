"use client";

import { useEffect, useState } from "react";
import { Loader2, TriangleAlert, DollarSign, Wallet } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";

type PayrollRow = {
  payrollId: string;
  statementId: string;
  name: string;
  payDate: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  grossPay: number;
  totalDeductions: number;
  totalTaxes: number;
  netPay: number;
};

type Payroll = { employeeName: string; employeeCode: string; payrolls: PayrollRow[] };
type LoadState = { payroll: Payroll } | { error: string } | null;
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatDateCell(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey || "—";
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** One employee's real UKG Ready pay statement history — gross/deductions/taxes/net per payroll run. */
export function PayrollHistory({ employeeCode, onEmployeeName }: { employeeCode: string; onEmployeeName?: (name: string) => void }) {
  const [state, setState] = useState<LoadState>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ukg/payroll/${encodeURIComponent(employeeCode)}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ error: data.error ?? "Something went wrong." });
          return;
        }
        setState({ payroll: data });
        onEmployeeName?.(data.employeeName);
      })
      .catch(() => {
        if (!cancelled) setState({ error: "Couldn't reach the server." });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEmployeeName is a stable setter prop
  }, [employeeCode]);

  if (state === null) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border-hairline bg-surface-1 px-6 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if ("error" in state) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-hairline bg-surface-1 px-6 py-16 text-center">
        <TriangleAlert className="h-6 w-6 text-[#8a5a00]" />
        <p className="text-sm font-medium text-text-primary">Couldn&apos;t load payroll history</p>
        <p className="max-w-md text-sm text-text-muted">{state.error}</p>
      </div>
    );
  }

  const rows = state.payroll.payrolls;
  const totalNet = rows.reduce((sum, r) => sum + r.netPay, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile label="Pay Statements" value={String(rows.length)} icon={DollarSign} />
        <StatTile label="Total Net Pay" value={currency.format(totalNet)} icon={Wallet} />
      </div>

      <div className="rounded-lg border border-border-hairline bg-surface-1">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No pay statements found for this employee.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
                  <th className="px-4 py-2.5 font-medium">Pay Date</th>
                  <th className="px-4 py-2.5 font-medium">Period</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Gross</th>
                  <th className="px-4 py-2.5 text-right font-medium">Deductions</th>
                  <th className="px-4 py-2.5 text-right font-medium">Taxes</th>
                  <th className="px-4 py-2.5 text-right font-medium">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.statementId} className="border-b border-border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-text-primary">{formatDateCell(row.payDate)}</td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {formatDateCell(row.periodStart)} – {formatDateCell(row.periodEnd)}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{row.status || "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary">{currency.format(row.grossPay)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary">{currency.format(row.totalDeductions)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary">{currency.format(row.totalTaxes)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-text-primary">{currency.format(row.netPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
