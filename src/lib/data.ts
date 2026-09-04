import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES, type TransactionType } from "@/lib/categories";
import { formatMonthLabel } from "@/lib/format";
import {
  addMonthsUTC,
  endOfMonthUTC,
  startOfMonthUTC,
  previousPeriod,
  DEFAULT_TREND_RANGE_MONTHS,
  type DateRange,
  type TrendRangeMonths,
} from "@/lib/dateRanges";

export interface TransactionFilters {
  from?: Date | null;
  to?: Date | null;
  type?: TransactionType;
  category?: string;
  search?: string;
}

export function listTransactions(filters: TransactionFilters = {}) {
  const { from, to, type, category, search } = filters;

  return prisma.transaction.findMany({
    where: {
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search } },
              { payee: { contains: search } },
              { category: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
}

export type TransactionRecord = Awaited<ReturnType<typeof listTransactions>>[number];

/**
 * Same shape after a round trip through JSON (API fetch responses serialize
 * Date to an ISO string, unlike the RSC payload for server->client props).
 */
export type ClientTransaction = Omit<TransactionRecord, "date"> & { date: Date | string };

export interface SummaryTotals {
  revenue: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

export interface CategoryBreakdownEntry {
  category: string;
  amount: number;
}

export interface MonthlyTrendEntry {
  month: string;
  monthLabel: string;
  revenue: number;
  expenses: number;
}

export interface DashboardSummary {
  current: SummaryTotals;
  previous: SummaryTotals | null;
  expenseByCategory: CategoryBreakdownEntry[];
  monthlyTrend: MonthlyTrendEntry[];
  /** ClientTransaction, not TransactionRecord: this travels through /api/summary as JSON too. */
  recentTransactions: ClientTransaction[];
}

export function sumByType(transactions: { type: string; amount: number }[]): SummaryTotals {
  let revenue = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === "REVENUE") revenue += t.amount;
    else expenses += t.amount;
  }
  return { revenue, expenses, net: revenue - expenses, transactionCount: transactions.length };
}

function withinRange(date: Date, range: DateRange): boolean {
  if (range.from && date < range.from) return false;
  if (date > range.to) return false;
  return true;
}

export async function getDashboardSummary(
  range: DateRange,
  trendMonths: TrendRangeMonths = DEFAULT_TREND_RANGE_MONTHS
): Promise<DashboardSummary> {
  const previous = previousPeriod(range);
  const now = new Date();
  const trendStart = startOfMonthUTC(addMonthsUTC(now, -(trendMonths - 1)));
  const trendEnd = endOfMonthUTC(now);

  const lowerBounds = [range.from, previous?.from ?? null, trendStart].filter(
    (d): d is Date => d != null
  );
  const earliestNeeded = lowerBounds.reduce((a, b) => (a < b ? a : b));
  const latestNeeded = range.to > trendEnd ? range.to : trendEnd;

  const rows = await prisma.transaction.findMany({
    where: { date: { gte: earliestNeeded, lte: latestNeeded } },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  const inCurrent = rows.filter((t) => withinRange(t.date, range));
  const current = sumByType(inCurrent);
  const previousTotals = previous
    ? sumByType(rows.filter((t) => withinRange(t.date, previous)))
    : null;

  const expenseByCategory: CategoryBreakdownEntry[] = EXPENSE_CATEGORIES.map((category) => ({
    category,
    amount: inCurrent
      .filter((t) => t.type === "EXPENSE" && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0),
  }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const monthlyTrend: MonthlyTrendEntry[] = [];
  for (let i = trendMonths - 1; i >= 0; i--) {
    const monthStart = startOfMonthUTC(addMonthsUTC(now, -i));
    const monthEnd = endOfMonthUTC(monthStart);
    const totals = sumByType(rows.filter((t) => t.date >= monthStart && t.date <= monthEnd));
    monthlyTrend.push({
      month: `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}`,
      monthLabel: formatMonthLabel(monthStart),
      revenue: totals.revenue,
      expenses: totals.expenses,
    });
  }

  return {
    current,
    previous: previousTotals,
    expenseByCategory,
    monthlyTrend,
    recentTransactions: inCurrent.slice(0, 8),
  };
}

export interface ReportQuery {
  from: Date;
  to: Date;
  category?: string;
  type?: TransactionType;
}

export interface ReportSummary {
  totals: SummaryTotals;
  /** Only populated when the query has no category filter - a category total needs no further breakdown. */
  topExpenseCategories: CategoryBreakdownEntry[];
}

/** Real numbers for a text-a-question report reply - never let an LLM state a figure this didn't compute. */
export async function getReportSummary(query: ReportQuery): Promise<ReportSummary> {
  const rows = await prisma.transaction.findMany({
    where: {
      date: { gte: query.from, lte: query.to },
      ...(query.category ? { category: query.category } : {}),
      ...(query.type ? { type: query.type } : {}),
    },
  });

  const totals = sumByType(rows);

  const topExpenseCategories = query.category
    ? []
    : EXPENSE_CATEGORIES.map((category) => ({
        category,
        amount: rows
          .filter((t) => t.type === "EXPENSE" && t.category === category)
          .reduce((sum, t) => sum + t.amount, 0),
      }))
        .filter((entry) => entry.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

  return { totals, topExpenseCategories };
}
