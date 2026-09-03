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

## Automated entry (iMessage, etc.)

`POST /api/ingest` accepts the same fields as the transaction form (`date`,
`type`, `category`, `amount`, and optionally `description`/`payee`/
`paymentMethod`) as JSON, authenticated with a bearer token:

```bash
curl -X POST https://your-deployed-app/api/ingest \
  -H "Authorization: Bearer $INGEST_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-09-03","type":"EXPENSE","category":"Fuel","amount":123.45,"payee":"Petro-Canada"}'
```

It's separate from the routes the browser UI calls, exists specifically for
external automation (like a "text an expense, it shows up on the dashboard"
pipeline), and refuses every request unless `INGEST_API_TOKEN` is set in the
environment — generate one with
`node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`.
Without that variable set, the endpoint is disabled and the rest of the app
is unaffected.

This route is the receiving end only. Turning "text a message" into a
request here — reading the message, deciding it's a transaction, mapping it
to a valid category, calling this endpoint, replying with a confirmation —
is the automation side, which needs its own always-on place to run (for
Claude Code users, a scheduled Routine works well). It also needs the app
itself deployed somewhere with a persistent filesystem and a real URL (see
the database note below) — `localhost` isn't reachable from outside your
machine.

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
   - `INGEST_API_TOKEN` = a generated token (see the automated-entry section
     above) — only needed if you're wiring up the iMessage automation
5. **Generate a public domain** (service → *Settings* → *Networking* →
   *Generate Domain*) to get a `https://….up.railway.app` URL. That's the
   app's real address — use it for both browsing the dashboard and as the
   base URL for `/api/ingest`.

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
