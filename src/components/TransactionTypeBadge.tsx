import { TRANSACTION_TYPE_LABELS, type TransactionType } from "@/lib/categories";

export function TransactionTypeBadge({ type }: { type: TransactionType | string }) {
  const isRevenue = type === "REVENUE";
  const label = TRANSACTION_TYPE_LABELS[isRevenue ? "REVENUE" : "EXPENSE"];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: isRevenue ? "var(--series-1)" : "var(--series-2)" }}
      />
      {label}
    </span>
  );
}
