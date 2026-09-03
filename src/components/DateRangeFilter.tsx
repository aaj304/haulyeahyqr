"use client";

import { DATE_RANGE_PRESETS, type DateRangePreset } from "@/lib/dateRanges";

interface DateRangeFilterProps {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1">
      {DATE_RANGE_PRESETS.map((preset) => {
        const active = preset.value === value;
        return (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            aria-pressed={active}
            className={
              active
                ? "rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                : "rounded-md px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-foreground/5"
            }
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
