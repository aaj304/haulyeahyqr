import { z } from "zod";
import {
  ALL_CATEGORIES,
  TRANSACTION_TYPES,
  isValidCategoryForType,
} from "@/lib/categories";

const categoryEnum = z.enum(ALL_CATEGORIES as [string, ...string[]]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

export const transactionInputSchema = z
  .object({
    date: z.coerce.date({ error: "Enter a valid date" }),
    type: z.enum(TRANSACTION_TYPES),
    category: categoryEnum,
    amount: z.coerce
      .number({ error: "Enter a valid amount" })
      .positive("Amount must be greater than zero")
      .max(10_000_000, "That amount looks too large"),
    description: optionalText(500),
    payee: optionalText(200),
    paymentMethod: optionalText(100),
  })
  .refine((data) => isValidCategoryForType(data.type, data.category), {
    message: "Category does not match transaction type",
    path: ["category"],
  });

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const transactionUpdateSchema = transactionInputSchema;

export const idParamSchema = z.coerce.number().int().positive();
