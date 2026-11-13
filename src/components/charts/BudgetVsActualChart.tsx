"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export type BudgetVsActualPoint = { name: string; budget: number; actual: number };

function formatCompactCurrency(v: number): string {
  return v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`;
}

/** The Budget-vs-Actual trend — Budget as a straight line, Actual as bars, across a series of trailing periods. */
export function BudgetVsActualChart({
  data,
  metric,
  onActualBarClick,
}: {
  data: BudgetVsActualPoint[];
  metric: "money" | "hours";
  /** Called with the clicked bar's index into `data`, so the caller can look up that point's underlying detail. */
  onActualBarClick?: (index: number) => void;
}) {
  const formatTick = metric === "money" ? formatCompactCurrency : (v: number) => `${v}h`;
  const formatTooltip = metric === "money" ? (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD" }) : (v: number) => `${v} hrs`;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={formatTick} />
        <Tooltip
          cursor={{ fill: "var(--gridline)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-hairline)",
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value, name) => [formatTooltip(Number(value)), name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="actual"
          name="Actual"
          fill="var(--series-4)"
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
          style={{ cursor: onActualBarClick ? "pointer" : undefined }}
          onClick={(_, index) => onActualBarClick?.(index)}
        />
        <Line type="linear" dataKey="budget" name="Budget" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
