"use client";

import { TransactionTypeBadge } from "@/components/TransactionTypeBadge";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ClientTransaction } from "@/lib/data";

interface TransactionsTableProps {
  transactions: ClientTransaction[];
  onEdit: (transaction: ClientTransaction) => void;
  onDelete: (transaction: ClientTransaction) => void;
}

export function TransactionsTable({ transactions, onEdit, onDelete }: TransactionsTableProps) {
  if (transactions.length === 0) {
    return <EmptyState message="No transactions match these filters." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Payee</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((t) => (
            <tr key={t.id} className="hover:bg-foreground/[0.02]">
              <td className="whitespace-nowrap px-4 py-2.5 text-text-secondary">
                {formatDate(t.date)}
              </td>
              <td className="px-4 py-2.5">
                <TransactionTypeBadge type={t.type} />
              </td>
              <td className="px-4 py-2.5 font-medium text-foreground">{t.category}</td>
              <td className="px-4 py-2.5 text-text-secondary">{t.payee || "—"}</td>
              <td className="max-w-[220px] truncate px-4 py-2.5 text-text-secondary">
                {t.description || "—"}
              </td>
              <td
                className={
                  t.type === "REVENUE"
                    ? "whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums text-status-good"
                    : "whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums text-foreground"
                }
              >
                {t.type === "EXPENSE" ? "-" : "+"}
                {formatCurrency(t.amount)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <button
                  onClick={() => onEdit(t)}
                  className="text-xs font-medium text-text-secondary hover:text-foreground hover:underline"
                >
                  Edit
                </button>
                <span className="mx-1.5 text-border">|</span>
                <button
                  onClick={() => onDelete(t)}
                  className="text-xs font-medium text-status-critical hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
