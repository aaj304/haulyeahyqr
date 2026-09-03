"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import type { CategoryBreakdownEntry } from "@/lib/data";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";

interface TooltipPayloadEntry {
  value?: number;
  payload?: CategoryBreakdownEntry;
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-foreground">{entry.payload?.category}</div>
      <div className="mt-1 text-text-secondary">{formatCurrency(entry.value ?? 0)}</div>
    </div>
  );
}

export function CategoryBreakdownChart({ data }: { data: CategoryBreakdownEntry[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-medium text-text-secondary">Expenses by category</h3>
      <div className="mt-4">
        {data.length === 0 ? (
          <EmptyState message="No expenses in this period yet." />
        ) : (
          <div style={{ height: Math.max(160, data.length * 40 + 24) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
                barCategoryGap={12}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={132}
                  stroke="var(--baseline)"
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<CategoryTooltip />}
                  cursor={{ fill: "var(--gridline)", opacity: 0.5 }}
                />
                <Bar dataKey="amount" fill="var(--series-2)" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  <LabelList
                    dataKey="amount"
                    position="right"
                    formatter={(value: unknown) => formatCurrencyCompact(Number(value))}
                    style={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
