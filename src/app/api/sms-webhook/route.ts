import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { transactionInputSchema } from "@/lib/validation";
import { ALL_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { getReportSummary, type ReportSummary } from "@/lib/data";
import { daysAgoRangeUTC } from "@/lib/dateRanges";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic();

const ExtractedTransaction = z.object({
  type: z.enum(["REVENUE", "EXPENSE"]),
  category: z.enum(ALL_CATEGORIES as [string, ...string[]]),
  amount: z.number(),
  date: z.string().describe("YYYY-MM-DD"),
  description: z.string().nullable(),
  payee: z.string().nullable(),
});

const ReportRequest = z.object({
  daysBack: z
    .number()
    .int()
    .min(1)
    .max(366)
    .describe(
      "How many days back from today the requested period covers - e.g. 'this week' or 'last 7 days' = 7, 'today' = 1, 'this month' = days elapsed since the 1st, a named month = that many days."
    ),
  rangeLabel: z.string().describe("Short human label for the period, e.g. 'this week', 'last 30 days', 'today'"),
  category: z
    .enum(ALL_CATEGORIES as [string, ...string[]])
    .nullable()
    .describe("Set only if they asked about one specific category (e.g. 'fuel'). Null for an overall summary."),
  typeFilter: z
    .enum(["REVENUE", "EXPENSE"])
    .nullable()
    .describe("REVENUE if only asking about income, EXPENSE if only asking about spending, null for both."),
});

const ExtractionResult = z.object({
  transactions: z.array(ExtractedTransaction),
  clarificationNeeded: z
    .string()
    .nullable()
    .describe(
      "A short question to text back if part of the message is clearly about money but its amount or direction is genuinely ambiguous. Null if nothing needs clarifying."
    ),
  reportRequest: ReportRequest.nullable().describe(
    "Set if the message is asking a question about their existing data - a summary, a snapshot, a total, 'how much did I spend on X' - rather than (or in addition to) logging a new transaction."
  ),
});

function emptyTwiml() {
  const twimlResponse = new twilio.twiml.MessagingResponse();
  return new NextResponse(twimlResponse.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

function replyTwiml(text: string) {
  const twimlResponse = new twilio.twiml.MessagingResponse();
  twimlResponse.message(text);
  return new NextResponse(twimlResponse.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

async function extractTransactions(body: string, today: string) {
  const response = await anthropic.messages.parse({
    model: "claude-opus-5",
    max_tokens: 2048,
    output_config: {
      effort: "low",
      format: zodOutputFormat(ExtractionResult),
    },
    messages: [
      {
        role: "user",
        content: `You are extracting revenue/expense transactions for a small trucking business's bookkeeping app from a text message the owner sent in.

Today's date is ${today}.

Valid categories:
Revenue: Load Revenue, Other Income
Expense: Fuel, Dump Fees, Trailer Repair, Truck Maintenance, Worker Pay, Insurance & Permits, Tires, Other

The message may describe zero, one, or several transactions - the owner sometimes texts several in one message (e.g. comma-separated), sometimes with one shared date at the end like "all for sept 2" that applies to every item before it.

For each transaction you can confidently identify: pick type (REVENUE if they got paid/earned money, EXPENSE if they spent money), the closest matching category, the amount as a plain number (strip $ and commas), the date in YYYY-MM-DD (default to today unless the message says otherwise), and a payee (who was paid, or who paid them, if a name/business is given) and short description when there's something worth keeping beyond category and amount.

If the message is instead asking a question about their existing data - a summary, a snapshot, a total, "how much did I spend on fuel this week", "how's this month looking" - set reportRequest instead of adding anything to transactions. Do not invent numbers yourself; you're only extracting what period/category/type they're asking about, the app will look up the real figures.

If the message doesn't describe any transaction and isn't a report request either (small talk, an unrelated task), return an empty transactions array and leave clarificationNeeded and reportRequest null - do not guess.

If part of the message is clearly about money but you genuinely can't tell the amount or the revenue/expense direction, leave that part out of transactions and set clarificationNeeded to a short, specific question about just that part. Still include any other unambiguous transactions from the same message in transactions.

Message: "${body}"`,
      },
    ],
  });

  return response.parsed_output;
}

function pluralTransactions(count: number): string {
  return `${count} transaction${count === 1 ? "" : "s"}`;
}

function formatReportReply(
  query: z.infer<typeof ReportRequest>,
  summary: ReportSummary
): string {
  const { totals } = summary;

  if (query.category) {
    // A category's type is fixed (e.g. Fuel is always an expense) - derive it
    // from the category itself rather than trusting a separately-extracted typeFilter.
    const isExpenseCategory = (EXPENSE_CATEGORIES as readonly string[]).includes(query.category);
    const total = isExpenseCategory ? totals.expenses : totals.revenue;
    const verb = isExpenseCategory ? "spent" : "earned";
    return `${query.category} ${query.rangeLabel}: ${formatCurrency(total)} ${verb} across ${pluralTransactions(totals.transactionCount)}.`;
  }

  if (query.typeFilter === "REVENUE") {
    return `Revenue ${query.rangeLabel}: ${formatCurrency(totals.revenue)} across ${pluralTransactions(totals.transactionCount)}.`;
  }

  const topLine = summary.topExpenseCategories.length
    ? ` Top: ${summary.topExpenseCategories.map((c) => `${c.category} ${formatCurrency(c.amount)}`).join(", ")}.`
    : "";

  if (query.typeFilter === "EXPENSE") {
    return `Expenses ${query.rangeLabel}: ${formatCurrency(totals.expenses)}.${topLine}`;
  }

  return `${query.rangeLabel[0].toUpperCase()}${query.rangeLabel.slice(1)}: ${formatCurrency(totals.revenue)} revenue, ${formatCurrency(totals.expenses)} expenses, ${formatCurrency(totals.net)} net.${topLine}`;
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const publicUrl = process.env.PUBLIC_APP_URL;

  if (!authToken || !publicUrl) {
    return NextResponse.json(
      { error: "SMS webhook is not configured on this server" },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const webhookUrl = `${publicUrl}/api/sms-webhook`;
  const validRequest = twilio.validateRequest(authToken, signature, webhookUrl, params);

  if (!validRequest) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const from = params.From;
  const messageBody = (params.Body ?? "").trim();
  if (!from || !messageBody) {
    return emptyTwiml();
  }

  const today = new Date().toISOString().slice(0, 10);

  let extraction;
  try {
    extraction = await extractTransactions(messageBody, today);
  } catch (error) {
    console.error("Claude API extraction failed:", error);
    return replyTwiml("Couldn't process that automatically - it'll be looked at shortly.");
  }

  if (!extraction) {
    console.error("Claude API returned no parsed output for:", messageBody);
    return replyTwiml("Couldn't process that automatically - it'll be looked at shortly.");
  }

  const logged: string[] = [];
  for (const candidate of extraction.transactions) {
    // Structured outputs return absent optional fields as null, not undefined -
    // transactionInputSchema's optional-string fields don't accept null.
    const parsed = transactionInputSchema.safeParse({
      ...candidate,
      description: candidate.description ?? undefined,
      payee: candidate.payee ?? undefined,
    });
    if (!parsed.success) {
      console.error("Extracted transaction failed validation:", candidate, parsed.error.issues);
      continue;
    }
    await prisma.transaction.create({ data: parsed.data });
    const sign = parsed.data.type === "EXPENSE" ? "-" : "+";
    logged.push(`${parsed.data.category} ${sign}${formatCurrency(parsed.data.amount)}`);
  }

  const replyParts: string[] = [];
  if (logged.length === 1) {
    replyParts.push(`Logged: ${logged[0]}.`);
  } else if (logged.length > 1) {
    replyParts.push(`Logged ${logged.length}: ${logged.join(", ")}.`);
  }

  if (extraction.reportRequest) {
    const { from, to } = daysAgoRangeUTC(extraction.reportRequest.daysBack);
    const summary = await getReportSummary({
      from,
      to,
      category: extraction.reportRequest.category ?? undefined,
      type: extraction.reportRequest.typeFilter ?? undefined,
    });
    replyParts.push(formatReportReply(extraction.reportRequest, summary));
  }

  if (extraction.clarificationNeeded) {
    replyParts.push(extraction.clarificationNeeded);
  }

  if (replyParts.length === 0) {
    return emptyTwiml();
  }
  return replyTwiml(replyParts.join(" "));
}
