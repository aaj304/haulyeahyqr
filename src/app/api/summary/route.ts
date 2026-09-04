import { NextRequest, NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/data";
import {
  DEFAULT_DATE_RANGE_PRESET,
  DEFAULT_TREND_RANGE_MONTHS,
  isDateRangePreset,
  isTrendRangeMonths,
  resolveDateRangePreset,
} from "@/lib/dateRanges";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const presetParam = request.nextUrl.searchParams.get("preset");
  const preset = presetParam && isDateRangePreset(presetParam)
    ? presetParam
    : DEFAULT_DATE_RANGE_PRESET;

  const trendMonthsParam = Number(request.nextUrl.searchParams.get("trendMonths"));
  const trendMonths = isTrendRangeMonths(trendMonthsParam)
    ? trendMonthsParam
    : DEFAULT_TREND_RANGE_MONTHS;

  const range = resolveDateRangePreset(preset);
  const summary = await getDashboardSummary(range, trendMonths);

  return NextResponse.json({ preset, trendMonths, summary });
}
