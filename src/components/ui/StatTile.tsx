import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import clsx from "clsx";

export function StatTile({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  goodDirection = "up",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  goodDirection?: "up" | "down";
}) {
  const isUp = (delta ?? 0) >= 0;
  const isGood = delta === undefined ? null : isUp === (goodDirection === "up");

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-series-1/10 text-series-1">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
      {delta !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <span
            className={clsx(
              "flex items-center gap-0.5 font-medium",
              isGood ? "text-[var(--success-text)]" : "text-status-critical"
            )}
          >
            {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(delta)}
            {deltaLabel ? "" : "%"}
          </span>
          {deltaLabel && <span className="text-text-muted">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}
