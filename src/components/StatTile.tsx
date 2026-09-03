import { formatPercent, percentChange } from "@/lib/format";

interface StatTileProps {
  label: string;
  value: string;
  /** "signed" colors the value itself by sign - reserved for a true state (net profit vs loss), not series identity. */
  tone?: "neutral" | "signed";
  isPositive?: boolean;
  current?: number;
  previous?: number | null;
  /** Which direction of change is good news for this metric. */
  goodDirection?: "up" | "down";
}

export function StatTile({
  label,
  value,
  tone = "neutral",
  isPositive,
  current,
  previous,
  goodDirection = "up",
}: StatTileProps) {
  const valueColorClass =
    tone === "signed"
      ? isPositive
        ? "text-status-good"
        : "text-status-critical"
      : "text-foreground";

  const showDelta = current !== undefined;
  const percent = showDelta && previous != null ? percentChange(current, previous) : null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-sm text-text-secondary">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${valueColorClass}`}>
        {tone === "signed" && (
          <span aria-hidden="true" className="mr-1">
            {isPositive ? "▲" : "▼"}
          </span>
        )}
        {value}
      </div>
      {showDelta && <DeltaBadge percent={percent} goodDirection={goodDirection} />}
    </div>
  );
}

function DeltaBadge({
  percent,
  goodDirection,
}: {
  percent: number | null;
  goodDirection: "up" | "down";
}) {
  if (percent === null) {
    return (
      <div className="mt-2 text-xs text-text-muted">No prior period to compare</div>
    );
  }

  const isFlat = Math.round(percent) === 0;
  const isUp = percent > 0;
  const isGood = isFlat ? null : isUp === (goodDirection === "up");
  const colorClass = isFlat
    ? "text-text-muted"
    : isGood
      ? "text-status-good"
      : "text-status-critical";

  return (
    <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      <span aria-hidden="true">{isFlat ? "→" : isUp ? "▲" : "▼"}</span>
      <span>{formatPercent(percent)} vs previous period</span>
    </div>
  );
}
