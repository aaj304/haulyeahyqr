"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import type { MonthlyTrendEntry } from "@/lib/data";
import { TREND_RANGE_OPTIONS, type TrendRangeMonths } from "@/lib/dateRanges";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

interface TooltipPayloadEntry {
  dataKey?: string;
  name?: string;
  value?: number;
  color?: string;
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-foreground">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="mt-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {formatCurrency(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface TrendChartProps {
  data: MonthlyTrendEntry[];
  months: TrendRangeMonths;
  onMonthsChange: (months: TrendRangeMonths) => void;
}

function TrendRangeToggle({
  value,
  onChange,
}: {
  value: TrendRangeMonths;
  onChange: (months: TrendRangeMonths) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg border border-border p-1">
      {TREND_RANGE_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={
              active
                ? "rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background"
                : "rounded-md px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-foreground/5"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function TrendChart({ data, months, onMonthsChange }: TrendChartProps) {
  const hasData = data.some((d) => d.revenue > 0 || d.expenses > 0);
  const windowLabel = months === 1 ? "last month" : `last ${months} months`;
  // A single month is a magnitude comparison, not a trend - Recharts also can't
  // draw a line (or even a dot) through just one point, so it needs bars instead.
  const isSinglePeriod = data.length < 2;
  const dotConfig = data.length <= 3 ? { r: 3, strokeWidth: 2, stroke: "var(--surface)" } : false;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-text-secondary">
          Revenue vs expenses — {windowLabel}
        </h3>
        <TrendRangeToggle value={months} onChange={onMonthsChange} />
      </div>
      <div className="mt-4 h-72">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="monthLabel"
                stroke="var(--baseline)"
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--baseline)" }}
              />
              <YAxis
                stroke="var(--baseline)"
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatCurrencyCompact(v)}
                width={56}
              />
              <Tooltip
                content={<TrendTooltip />}
                cursor={isSinglePeriod ? { fill: "var(--gridline)", opacity: 0.5 } : true}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={32}
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-text-secondary">{value}</span>
                )}
              />
              {isSinglePeriod ? (
                <>
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="var(--series-1)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={64}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="var(--series-2)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={64}
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="var(--series-1)"
                    strokeWidth={2}
                    dot={dotConfig}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="var(--series-2)"
                    strokeWidth={2}
                    dot={dotConfig}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            No transactions in the {windowLabel} yet.
          </div>
        )}
      </div>
    </div>
  );
}
