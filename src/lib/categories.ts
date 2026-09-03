export const TRANSACTION_TYPES = ["REVENUE", "EXPENSE"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const REVENUE_CATEGORIES = ["Load Revenue", "Other Income"] as const;

export const EXPENSE_CATEGORIES = [
  "Fuel",
  "Dump Fees",
  "Trailer Repair",
  "Truck Maintenance",
  "Worker Pay",
  "Insurance & Permits",
  "Tires",
  "Other",
] as const;

export const CATEGORIES_BY_TYPE: Record<TransactionType, readonly string[]> = {
  REVENUE: REVENUE_CATEGORIES,
  EXPENSE: EXPENSE_CATEGORIES,
};

export const ALL_CATEGORIES: readonly string[] = [
  ...REVENUE_CATEGORIES,
  ...EXPENSE_CATEGORIES,
];

export function categoriesForType(type: TransactionType): readonly string[] {
  return CATEGORIES_BY_TYPE[type];
}

export function isValidCategoryForType(
  type: TransactionType,
  category: string
): boolean {
  return CATEGORIES_BY_TYPE[type].includes(category);
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  REVENUE: "Revenue",
  EXPENSE: "Expense",
};
