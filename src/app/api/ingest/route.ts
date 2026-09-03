import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transactionInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Machine-to-machine transaction entry point (e.g. the iMessage automation),
 * separate from /api/transactions so the browser UI's unauthenticated path
 * is untouched. Fails closed: no token configured means no writes accepted,
 * since this route is meant to be reachable from outside the browser.
 */
export async function POST(request: NextRequest) {
  const expectedToken = process.env.INGEST_API_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: "Ingestion is not configured on this server" },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const providedToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (providedToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
