import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listTransactions } from "@/lib/data";
import { transactionInputSchema } from "@/lib/validation";
import { TRANSACTION_TYPES, type TransactionType } from "@/lib/categories";

export const dynamic = "force-dynamic";

function isTransactionType(value: string | null): value is TransactionType {
  return !!value && (TRANSACTION_TYPES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const type = params.get("type");
  const category = params.get("category");
  const search = params.get("search");

  const transactions = await listTransactions({
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    type: isTransactionType(type) ? type : undefined,
    category: category ?? undefined,
    search: search ?? undefined,
  });

  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = transactionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const transaction = await prisma.transaction.create({ data: parsed.data });
  return NextResponse.json({ transaction }, { status: 201 });
}
