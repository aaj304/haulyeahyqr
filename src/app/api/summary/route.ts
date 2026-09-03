import { NextRequest, NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/data";
import {
  DEFAULT_DATE_RANGE_PRESET,
  isDateRangePreset,
  resolveDateRangePreset,
} from "@/lib/dateRanges";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const presetParam = request.nextUrl.searchParams.get("preset");
  const preset = presetParam && isDateRangePreset(presetParam)
    ? presetParam
    : DEFAULT_DATE_RANGE_PRESET;

  const range = resolveDateRangePreset(preset);
  const summary = await getDashboardSummary(range);

  return NextResponse.json({ preset, summary });
}
