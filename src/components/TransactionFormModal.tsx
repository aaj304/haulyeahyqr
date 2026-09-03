"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  categoriesForType,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from "@/lib/categories";
import type { ClientTransaction } from "@/lib/data";

export interface TransactionFormValues {
  date: string;
  type: TransactionType;
  category: string;
  amount: string;
  description: string;
  payee: string;
  paymentMethod: string;
}

function toDateInputValue(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

function emptyValues(): TransactionFormValues {
  return {
    date: toDateInputValue(new Date()),
    type: "EXPENSE",
    category: "",
    amount: "",
    description: "",
    payee: "",
    paymentMethod: "",
  };
}

function fromRecord(record: ClientTransaction): TransactionFormValues {
  return {
    date: toDateInputValue(record.date),
    type: record.type === "REVENUE" ? "REVENUE" : "EXPENSE",
    category: record.category,
    amount: String(record.amount),
    description: record.description ?? "",
    payee: record.payee ?? "",
    paymentMethod: record.paymentMethod ?? "",
  };
}

interface TransactionFormModalProps {
  editing: ClientTransaction | null;
  onClose: () => void;
  /** Returns an error message to display, or null on success. */
  onSubmit: (values: TransactionFormValues) => Promise<string | null>;
}

/** Mount only while open, with a `key` derived from `editing` so switching
 * between add/edit (or between two different transactions) remounts fresh
 * instead of resetting state from an effect. */
export function TransactionFormModal({ editing, onClose, onSubmit }: TransactionFormModalProps) {
  const [values, setValues] = useState<TransactionFormValues>(() =>
    editing ? fromRecord(editing) : emptyValues()
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const categories = categoriesForType(values.type);

  function updateField<K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K]
  ) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "type") next.category = "";
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const message = await onSubmit(values);
    setSubmitting(false);
    if (message) setError(message);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-foreground">
          {editing ? "Edit transaction" : "Add transaction"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {TRANSACTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateField("type", type)}
                className={
                  values.type === type
                    ? "rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
                    : "rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary"
                }
              >
                {TRANSACTION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <Field label="Date">
            <input
              type="date"
              required
              value={values.date}
              onChange={(e) => updateField("date", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Category">
            <select
              required
              value={values.category}
              onChange={(e) => updateField("category", e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Amount ($)">
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={values.amount}
              onChange={(e) => updateField("amount", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label={values.type === "REVENUE" ? "Customer (optional)" : "Paid to (optional)"}>
            <input
              type="text"
              value={values.payee}
              onChange={(e) => updateField("payee", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Description (optional)">
            <input
              type="text"
              value={values.description}
              onChange={(e) => updateField("description", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Payment method (optional)">
            <input
              type="text"
              placeholder="e-transfer, cash, cheque..."
              value={values.paymentMethod}
              onChange={(e) => updateField("paymentMethod", e.target.value)}
              className={inputClass}
            />
          </Field>

          {error && <p className="text-sm text-status-critical">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-foreground/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              {submitting ? "Saving..." : editing ? "Save changes" : "Add transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
