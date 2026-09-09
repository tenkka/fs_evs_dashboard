"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { patientMealCounts } from "@/lib/data";

const data = patientMealCounts.map((d) => ({
  day: d.weekday.slice(0, 3),
  Breakfast: d.breakfast,
  Lunch: d.lunch,
  Dinner: d.dinner,
}));

export function PatientMealsChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--baseline)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "var(--gridline)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-hairline)",
            borderRadius: 8,
            fontSize: 13,
          }}
          labelStyle={{ color: "var(--text-primary)", fontWeight: 500, marginBottom: 4 }}
          formatter={(value, name) => [`${value} trays`, name]}
        />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="circle"
          iconSize={8}
          itemSorter={(item) => ({ Breakfast: 0, Lunch: 1, Dinner: 2 })[item.dataKey as string] ?? 3}
          formatter={(value) => <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{value}</span>}
        />
        <Bar dataKey="Breakfast" stackId="meals" fill="var(--series-1)" radius={[0, 0, 0, 0]} maxBarSize={36} />
        <Bar dataKey="Lunch" stackId="meals" fill="var(--series-2)" maxBarSize={36} />
        <Bar dataKey="Dinner" stackId="meals" fill="var(--series-3)" radius={[3, 3, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
