"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { departments } from "@/lib/data";

export type SpendTrendPoint = { week: string; FS: number; EVS: number; total: number };
export type SpendTrendMode = "total" | "department";

function formatCompactCurrency(v: number): string {
  return v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`;
}

export function SpendTrendChart({ data, mode = "department" }: { data: SpendTrendPoint[]; mode?: SpendTrendMode }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--baseline)" }}
          tickLine={false}
          interval={3}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatCompactCurrency}
          width={44}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-hairline)",
            borderRadius: 8,
            fontSize: 13,
          }}
          labelStyle={{ color: "var(--text-primary)", fontWeight: 500, marginBottom: 4 }}
          formatter={(value, name) => [
            Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" }),
            name,
          ]}
        />
        {mode === "department" ? (
          <>
            <Legend
              verticalAlign="top"
              height={32}
              iconType="circle"
              iconSize={8}
              itemSorter={(item) => (item.dataKey === "FS" ? 0 : 1)}
              formatter={(value) => <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="FS"
              name={departments.FS.label}
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="EVS"
              name={departments.EVS.label}
              stroke="var(--series-2)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </>
        ) : (
          <Line
            type="monotone"
            dataKey="total"
            name="Total spending"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
