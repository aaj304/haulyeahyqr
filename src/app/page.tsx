import { getDashboardSummary } from "@/lib/data";
import {
  DEFAULT_DATE_RANGE_PRESET,
  DEFAULT_TREND_RANGE_MONTHS,
  resolveDateRangePreset,
} from "@/lib/dateRanges";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const range = resolveDateRangePreset(DEFAULT_DATE_RANGE_PRESET);
  const summary = await getDashboardSummary(range, DEFAULT_TREND_RANGE_MONTHS);

  return (
    <DashboardClient
      initialPreset={DEFAULT_DATE_RANGE_PRESET}
      initialTrendMonths={DEFAULT_TREND_RANGE_MONTHS}
      initialSummary={summary}
    />
  );
}
