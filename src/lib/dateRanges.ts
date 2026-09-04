// All dates in this app are treated as UTC-anchored calendar days (no time-of-day
// meaning), so range math uses UTC getters/Date.UTC throughout instead of local time -
// otherwise the server's timezone could shift a transaction into the wrong day/month.

export function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function endOfMonthUTC(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );
}

export function addMonthsUTC(d: Date, amount: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + amount, 1));
}

export function startOfYearUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

export function endOfDayUTC(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)
  );
}

export interface DateRange {
  /** null = no lower bound (all-time) */
  from: Date | null;
  to: Date;
}

export const DATE_RANGE_PRESETS = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "last-6-months", label: "Last 6 months" },
  { value: "this-year", label: "This year" },
  { value: "all-time", label: "All time" },
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]["value"];

export const DEFAULT_DATE_RANGE_PRESET: DateRangePreset = "this-month";

export function isDateRangePreset(value: string): value is DateRangePreset {
  return DATE_RANGE_PRESETS.some((p) => p.value === value);
}

export function resolveDateRangePreset(
  preset: DateRangePreset,
  now: Date = new Date()
): DateRange {
  const today = endOfDayUTC(now);
  switch (preset) {
    case "this-month":
      return { from: startOfMonthUTC(now), to: today };
    case "last-month": {
      const lastMonth = addMonthsUTC(now, -1);
      return { from: startOfMonthUTC(lastMonth), to: endOfMonthUTC(lastMonth) };
    }
    case "last-3-months":
      return { from: startOfMonthUTC(addMonthsUTC(now, -2)), to: today };
    case "last-6-months":
      return { from: startOfMonthUTC(addMonthsUTC(now, -5)), to: today };
    case "this-year":
      return { from: startOfYearUTC(now), to: today };
    case "all-time":
      return { from: null, to: today };
  }
}

/** The equal-length window immediately preceding `range`, for "vs previous period" deltas. */
export function previousPeriod(range: DateRange): DateRange | null {
  if (!range.from) return null;
  const lengthMs = range.to.getTime() - range.from.getTime();
  const prevTo = new Date(range.from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - lengthMs);
  return { from: prevFrom, to: prevTo };
}

export const TREND_RANGE_OPTIONS = [
  { value: 1, label: "1M" },
  { value: 3, label: "3M" },
  { value: 12, label: "12M" },
] as const;

export type TrendRangeMonths = (typeof TREND_RANGE_OPTIONS)[number]["value"];

export const DEFAULT_TREND_RANGE_MONTHS: TrendRangeMonths = 12;

export function isTrendRangeMonths(value: number): value is TrendRangeMonths {
  return TREND_RANGE_OPTIONS.some((o) => o.value === value);
}

/** Inclusive N-day window ending today, e.g. daysBack=7 covers today + the 6 days before it. */
export function daysAgoRangeUTC(daysBack: number, now: Date = new Date()): { from: Date; to: Date } {
  const to = endOfDayUTC(now);
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (daysBack - 1))
  );
  return { from, to };
}
