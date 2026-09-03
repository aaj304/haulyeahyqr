"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TransactionsTable } from "@/components/TransactionsTable";
import {
  TransactionFormModal,
  type TransactionFormValues,
} from "@/components/TransactionFormModal";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import type { ClientTransaction } from "@/lib/data";
import { resolveDateRangePreset, type DateRangePreset } from "@/lib/dateRanges";
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS, type TransactionType } from "@/lib/categories";

type TypeFilter = "ALL" | TransactionType;

const TYPE_FILTERS: TypeFilter[] = ["ALL", ...TRANSACTION_TYPES];

export function TransactionsClient({
  initialTransactions,
}: {
  initialTransactions: ClientTransaction[];
}) {
  const [transactions, setTransactions] = useState<ClientTransaction[]>(initialTransactions);
  const [preset, setPreset] = useState<DateRangePreset>("all-time");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientTransaction | null>(null);
  const isFirstRender = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const range = resolveDateRangePreset(preset);
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
    if (typeFilter !== "ALL") params.set("type", typeFilter);
    if (search.trim()) params.set("search", search.trim());

    try {
      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data: { transactions: ClientTransaction[] } = await res.json();
      setTransactions(data.transactions);
    } finally {
      setLoading(false);
    }
  }, [preset, typeFilter, search]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(refresh, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [refresh, search]);

  function openAddModal() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEditModal(transaction: ClientTransaction) {
    setEditing(transaction);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleFormSubmit(values: TransactionFormValues): Promise<string | null> {
    const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return (
        data?.issues?.[0]?.message ?? data?.error ?? "Something went wrong. Please try again."
      );
    }

    closeModal();
    await refresh();
    return null;
  }

  async function handleDelete(transaction: ClientTransaction) {
    const confirmed = window.confirm(
      `Delete this ${transaction.type === "REVENUE" ? "revenue" : "expense"} entry — ${transaction.category}, $${transaction.amount}? This cannot be undone.`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
    if (res.ok) {
      setTransactions((prev) => prev.filter((t) => t.id !== transaction.id));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <button
          onClick={openAddModal}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          + Add transaction
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DateRangeFilter value={preset} onChange={setPreset} />

        <div className="inline-flex gap-1 rounded-lg border border-border bg-surface p-1">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              aria-pressed={typeFilter === t}
              className={
                typeFilter === t
                  ? "rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-foreground/5"
              }
            >
              {t === "ALL" ? "All" : TRANSACTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Search description, payee, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-foreground/40"
        />
      </div>

      <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <TransactionsTable
          transactions={transactions}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      </div>

      {modalOpen && (
        <TransactionFormModal
          key={editing?.id ?? "new"}
          editing={editing}
          onClose={closeModal}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}
