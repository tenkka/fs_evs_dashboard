import { Check, X } from "lucide-react";
import clsx from "clsx";
import { foodSafetySections, sectionCompliance } from "@/lib/foodSafetyAudit";

export function FoodSafetyChecklist() {
  return (
    <div className="space-y-5">
      {foodSafetySections.map((section) => {
        const { total, compliant, pct } = sectionCompliance(section);
        const hasIssue = compliant < total;

        return (
          <div key={section.name} className="rounded-lg border border-border-hairline bg-surface-1">
            <div className="flex items-center justify-between border-b border-border-hairline bg-surface-2/50 px-4 py-2.5">
              <h3 className="text-sm font-semibold text-text-primary">{section.name}</h3>
              <div className="flex items-center gap-2.5">
                <span className="text-xs tabular-nums text-text-muted">
                  {compliant}/{total}
                </span>
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                    hasIssue ? "bg-status-serious/15 text-[#9a4a1f]" : "bg-status-good/10 text-status-good"
                  )}
                >
                  {pct}%
                </span>
              </div>
            </div>

            <ul className="divide-y divide-border-hairline">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                  <span
                    className={clsx(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      item.compliant
                        ? "border-status-good bg-status-good/15 text-status-good"
                        : "border-status-critical bg-status-critical/15 text-status-critical"
                    )}
                  >
                    {item.compliant ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-secondary">{item.text}</p>
                    {item.note && <p className="mt-0.5 text-xs font-medium text-status-critical">{item.note}</p>}
                  </div>
                  <span
                    className={clsx(
                      "shrink-0 text-xs font-medium tabular-nums",
                      item.compliant ? "text-text-muted" : "text-status-critical"
                    )}
                  >
                    {item.answer}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
