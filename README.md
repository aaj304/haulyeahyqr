# Haul Yeah YQR — Revenue & Expense Tracker

A web app for tracking Haul Yeah YQR's revenue and expenses (fuel, dump fees,
trailer repair, worker pay, and more), with a dashboard for the numbers that
matter: revenue vs. expenses, net profit, and where the money is going.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io) + SQLite for the database (a single local
  file — no external database server to run)
- [Recharts](https://recharts.org) for the dashboard charts

## Getting started

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard and
transactions list start empty — add your first entry from the
**Transactions** page.

For production use:

```bash
npm run build
npm run start
```

## Features

- **Dashboard** — revenue, expenses, and net profit for a selected period
  (this month, last month, last 3/6 months, this year, or all time), each
  compared against the previous period; a 12-month revenue-vs-expenses
  trend chart; an expenses-by-category breakdown; and a recent-transactions
  list.
- **Transactions** — add, edit, delete, filter (by date range, type, or a
  text search across category/payee/description), and browse the full
  ledger.
- Revenue categories: Load Revenue, Other Income.
- Expense categories: Fuel, Dump Fees, Trailer Repair, Truck Maintenance,
  Worker Pay, Insurance & Permits, Tires, Other. Edit
  `src/lib/categories.ts` to change these.

## Automated entry (generic ingest API)

`POST /api/ingest` accepts the same fields as the transaction form (`date`,
`type`, `category`, `amount`, and optionally `description`/`payee`/
`paymentMethod`) as JSON, authenticated with a bearer token:

```bash
curl -X POST https://your-deployed-app/api/ingest \
  -H "Authorization: Bearer $INGEST_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-09-03","type":"EXPENSE","category":"Fuel","amount":123.45,"payee":"Petro-Canada"}'
```

It's separate from the routes the browser UI calls, exists for wiring up any
future external automation, and refuses every request unless
`INGEST_API_TOKEN` is set in the environment — generate one with
`node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`.
Without that variable set, the endpoint is disabled and the rest of the app
is unaffected. Nothing currently calls this route — the SMS/Twilio path
below is the live automation — but it's available if you want to wire up
another one later.

## Automated entry (SMS via Twilio + the Claude API)

`POST /api/sms-webhook` is a self-contained alternative to the above: point
a Twilio phone number's messaging webhook at it, and the app itself — no
separate automation needed — reads each incoming text, calls the Claude API
to figure out whether it's a transaction (or several - it splits a message
like `"$40 fuel, $500 for the yorkton run, all sept 2"` into two), logs
whatever it's confident about, and texts back a confirmation. When it's
genuinely unsure (amount or revenue/expense direction unclear), it texts
back a question instead of guessing.

Setup:

1. **A Twilio account and phone number.** Buy one from the
   [Twilio console](https://console.twilio.com) (Phone Numbers → Buy a
   number) - texting-capable, any area code.
2. **Point the number's webhook at this app.** In the number's
   configuration, under *Messaging*, set "A message comes in" to
   `https://your-deployed-app/api/sms-webhook`, method `HTTP POST`.
3. **Set three environment variables** (all required together):
   - `ANTHROPIC_API_KEY` - from [console.anthropic.com](https://console.anthropic.com)
   - `TWILIO_AUTH_TOKEN` - from the Twilio console (Account → API keys &
     tokens), used to verify a request genuinely came from Twilio
   - `PUBLIC_APP_URL` - this app's own public URL, no trailing slash (must
     match exactly what Twilio POSTs to, since its signature covers the
     full URL)

Leave any of the three unset and the endpoint responds `503` without
touching the ledger - the rest of the app is unaffected. A **Twilio trial
account** can only text verified numbers and prepends a "sent from a trial
account" notice to every reply - upgrade (add billing) once you're past
testing with your own phone.

This is the live automation path - it writes through the same validation
and lands in the same ledger as the generic ingest API (above).

## Deploying to Railway

1. **Push to GitHub** (already done if you're reading this from the repo).
2. **New Project → Deploy from GitHub repo**, pick this repo/branch. Railway
   detects Node automatically — no config file needed. It runs `npm install`
   (which also generates the Prisma client), then `npm run build`, then
   `npm run start` (which applies database migrations before serving).
3. **Add a Volume** (service → *Settings* → *Volumes*) mounted at `/data`.
   Without this the SQLite file gets wiped on every redeploy — Railway's
   regular filesystem isn't persistent, only an attached Volume is.
4. **Set environment variables** (service → *Variables*):
   - `DATABASE_URL` = `file:/data/dev.db` (the volume path from step 3)
   - `ANTHROPIC_API_KEY`, `TWILIO_AUTH_TOKEN`, `PUBLIC_APP_URL` — needed for
     the SMS automation (see above); set `PUBLIC_APP_URL` after step 5, once
     you know the domain
   - `INGEST_API_TOKEN` = a generated token — only needed if you wire up
     another automation against `/api/ingest` (see above); leave unset
     otherwise
5. **Generate a public domain** (service → *Settings* → *Networking* →
   *Generate Domain*) to get a `https://….up.railway.app` URL. That's the
   app's real address — use it for browsing the dashboard and as the base
   URL for `/api/ingest` and `/api/sms-webhook`.

Railway's exact button labels shift occasionally; if a step doesn't match
what you see, describe what's on screen and it's easy to adjust.

## Project structure

```
prisma/schema.prisma       Database schema (one Transaction model)
src/lib/data.ts            Queries + dashboard aggregation
src/lib/categories.ts      Revenue/expense category lists
src/lib/validation.ts      Zod schemas for the transaction form/API
src/app/page.tsx           Dashboard (server component)
src/app/transactions/      Transactions page
src/app/api/               REST endpoints the client pages call
src/components/            UI (charts, forms, tables, filters)
```

## Notes

- **Database file**: SQLite stores everything in one file (path set by
  `DATABASE_URL`, gitignored). Back it up — it's the only copy of your
  data. This also means the app needs a persistent filesystem to run on
  (Railway with a Volume — see above — a VPS, your own machine, etc.) —
  not a serverless platform like Vercel or Netlify's default runtime,
  where the filesystem doesn't persist between requests. To deploy there
  instead, swap the Prisma datasource for a hosted database (e.g. Postgres
  or Turso/LibSQL) — everything else in the app stays the same.
- **No login**: there's currently no authentication, so anyone who can
  reach the app can view and edit the ledger. Fine on a local machine or a
  private network; add auth (or put it behind a VPN/reverse-proxy login)
  before exposing it publicly.
