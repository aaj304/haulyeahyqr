import { getDashboardSummary } from "@/lib/data";
import { DEFAULT_DATE_RANGE_PRESET, resolveDateRangePreset } from "@/lib/dateRanges";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const range = resolveDateRangePreset(DEFAULT_DATE_RANGE_PRESET);
  const summary = await getDashboardSummary(range);

  return <DashboardClient initialPreset={DEFAULT_DATE_RANGE_PRESET} initialSummary={summary} />;
}
