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

- **Database file**: SQLite stores everything in `dev.db` at the project
  root (created by `prisma migrate dev`, gitignored). Back this file up —
  it's the only copy of your data. This also means the app needs a
  persistent filesystem to run on (a VPS, your own machine, a Docker
  container, etc.) — not a serverless platform like Vercel's default
  runtime, where the filesystem doesn't persist between requests. To
  deploy there instead, swap the Prisma datasource for a hosted database
  (e.g. Postgres or Turso/LibSQL) — everything else in the app stays the
  same.
- **No login**: there's currently no authentication, so anyone who can
  reach the app can view and edit the ledger. Fine on a local machine or a
  private network; add auth (or put it behind a VPN/reverse-proxy login)
  before exposing it publicly.
