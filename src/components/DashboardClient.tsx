"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { StatTile } from "@/components/StatTile";
import { TrendChart } from "@/components/TrendChart";
import { CategoryBreakdownChart } from "@/components/CategoryBreakdownChart";
import { TransactionTypeBadge } from "@/components/TransactionTypeBadge";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DashboardSummary } from "@/lib/data";
import type { DateRangePreset, TrendRangeMonths } from "@/lib/dateRanges";

interface DashboardClientProps {
  initialPreset: DateRangePreset;
  initialTrendMonths: TrendRangeMonths;
  initialSummary: DashboardSummary;
}

export function DashboardClient({
  initialPreset,
  initialTrendMonths,
  initialSummary,
}: DashboardClientProps) {
  const [preset, setPreset] = useState<DateRangePreset>(initialPreset);
  const [trendMonths, setTrendMonths] = useState<TrendRangeMonths>(initialTrendMonths);
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    let cancelled = false;

    startTransition(() => {
      fetch(`/api/summary?preset=${preset}&trendMonths=${trendMonths}`)
        .then((res) => res.json())
        .then((data: { summary: DashboardSummary }) => {
          if (!cancelled) setSummary(data.summary);
        })
        .catch(() => {
          /* transient network error - keep showing the last good summary */
        });
    });

    return () => {
      cancelled = true;
    };
  }, [preset, trendMonths]);

  const { current, previous, expenseByCategory, monthlyTrend, recentTransactions } = summary;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <DateRangeFilter value={preset} onChange={setPreset} />
      </div>

      <div className={isPending ? "flex flex-col gap-6 opacity-60 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            label="Total revenue"
            value={formatCurrency(current.revenue)}
            current={current.revenue}
            previous={previous?.revenue ?? null}
            goodDirection="up"
          />
          <StatTile
            label="Total expenses"
            value={formatCurrency(current.expenses)}
            current={current.expenses}
            previous={previous?.expenses ?? null}
            goodDirection="down"
          />
          <StatTile
            label="Net profit"
            value={formatCurrency(current.net)}
            tone="signed"
            isPositive={current.net >= 0}
            current={current.net}
            previous={previous?.net ?? null}
            goodDirection="up"
          />
        </div>

        <TrendChart data={monthlyTrend} months={trendMonths} onMonthsChange={setTrendMonths} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CategoryBreakdownChart data={expenseByCategory} />
          <RecentTransactionsCard transactions={recentTransactions} />
        </div>
      </div>
    </div>
  );
}

function RecentTransactionsCard({
  transactions,
}: {
  transactions: DashboardSummary["recentTransactions"];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-secondary">Recent transactions</h3>
        <Link
          href="/transactions"
          className="text-xs font-medium text-foreground hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="mt-4">
        {transactions.length === 0 ? (
          <EmptyState message="No transactions in this period yet." />
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <TransactionTypeBadge type={t.type} />
                    <span className="truncate font-medium text-foreground">{t.category}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-text-muted">
                    {formatDate(t.date)}
                    {t.payee ? ` · ${t.payee}` : ""}
                  </div>
                </div>
                <div
                  className={
                    t.type === "REVENUE"
                      ? "shrink-0 font-medium text-status-good"
                      : "shrink-0 font-medium text-foreground"
                  }
                >
                  {t.type === "EXPENSE" ? "-" : "+"}
                  {formatCurrency(t.amount)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
