import { patientMealCounts, patientMealDayTotal } from "@/lib/data";

const rows: { label: string; key: "breakfast" | "lunch" | "dinner" | "drMeals" | "guestMeals" }[] = [
  { label: "Breakfast", key: "breakfast" },
  { label: "Lunch", key: "lunch" },
  { label: "Dinner", key: "dinner" },
  { label: "Dr Meals", key: "drMeals" },
  { label: "Guest Meals", key: "guestMeals" },
];

export function PatientMealsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
            <th className="px-4 py-2.5 font-medium">
              <span className="font-semibold text-text-primary">Patient Meals</span>
              <br />
              Total # of Trays
            </th>
            {patientMealCounts.map((d) => (
              <th key={d.date} className="px-3 py-2.5 text-center font-medium">
                {d.date}
                <br />
                {d.weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border-hairline last:border-0">
              <td className="px-4 py-2 text-text-secondary">{r.label}</td>
              {patientMealCounts.map((d) => (
                <td key={d.date} className="px-3 py-2 text-center tabular-nums text-text-primary">
                  {d[r.key]}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-surface-2/60">
            <td className="px-4 py-2.5 font-semibold text-text-primary">Total Meals / Day</td>
            {patientMealCounts.map((d) => (
              <td key={d.date} className="px-3 py-2.5 text-center font-semibold tabular-nums text-text-primary">
                {patientMealDayTotal(d)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
