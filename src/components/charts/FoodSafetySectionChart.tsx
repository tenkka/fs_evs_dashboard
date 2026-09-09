"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { foodSafetySections, sectionCompliance } from "@/lib/foodSafetyAudit";

const data = foodSafetySections.map((s) => {
  const { pct } = sectionCompliance(s);
  return { name: s.name, pct };
});

export function FoodSafetySectionChart() {
  return (
    <ResponsiveContainer width="100%" height={520}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }} barCategoryGap={8}>
        <CartesianGrid stroke="var(--gridline)" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          interval={0}
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={190}
        />
        <Tooltip
          cursor={{ fill: "var(--gridline)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-hairline)",
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value) => [`${value}% compliant`, ""]}
        />
        <Bar dataKey="pct" radius={[0, 3, 3, 0]} maxBarSize={14}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.pct < 100 ? "var(--status-serious)" : "var(--series-1)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
