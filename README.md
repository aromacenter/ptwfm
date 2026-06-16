# PT Management

A standalone SaaS web app for personal trainers and their clients: online
booking, payments, planning and AI assistance. Built for the **UK market**
(GBP, Europe/London, UK GDPR) and bilingual (English / Hungarian).

## Features

- **Auth & roles** — trainers, clients, admin (Auth.js v5, argon2id hashing).
- **Booking** — trainers set weekly hourly availability; clients book open
  slots. Timezone-correct (BST/GMT) with double-booking protection.
- **Payments (Stripe, GBP)** — prepay a session, buy packages (session
  credits), or Bacs Direct Debit mandate; idempotent webhooks.
- **24-hour cancellation policy** — free if cancelled ≥24h before; otherwise the
  session is charged (credit forfeited or late fee collected off-session).
- **Trainer tools** — client database, consent-gated & audited health notes,
  day/week/month training plans.
- **AI (Gemini)** — schedule optimisation and client progress summaries from
  minimised, de-identified data.
- **UK GDPR** — explicit health-data consent, DSAR export & erasure, audit log,
  PECR cookie banner, retention job. See `docs/`.

## Stack

Next.js 16 (App Router, TS) · Prisma 6 + PostgreSQL · Auth.js v5 · next-intl ·
Tailwind v4 · Stripe · `@google/genai` · Vitest + Playwright + axe.

## Local development

```bash
npm install                 # also runs `prisma generate` (postinstall)
cp .env.example .env        # fill in DATABASE_URL, AUTH_SECRET, Stripe, Gemini
npx prisma migrate deploy   # apply schema to your database
npm run dev                 # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm test` | Vitest unit + integration (set `RUN_DB_TESTS=1` for DB tests) |
| `npm run test:e2e` | Playwright end-to-end + axe accessibility |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:migrate` / `db:studio` / `db:seed` | Prisma helpers |

Integration and e2e tests need a PostgreSQL database. CI provisions one and
runs them with `RUN_DB_TESTS=1`.

## Environment variables

See `.env.example`: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`GEMINI_API_KEY`, optional `GEMINI_MODEL`, and `CRON_SECRET`.

## Deployment (Railway + GitHub)

- Pushing to `main` triggers GitHub Actions CI (lint, typecheck, unit +
  integration tests, build, `npm audit`, e2e).
- Railway deploys `main`. A PostgreSQL plugin provides `DATABASE_URL`; set the
  other secrets in Railway's variables.
- On deploy, `railway.json` runs `prisma migrate deploy` then `next start`.
- Stripe webhook endpoint: `POST /api/stripe/webhook` (set the signing secret).
- Schedule the retention job: `POST /api/cron/retention` with the
  `x-cron-secret` header set to `CRON_SECRET`.

## Compliance

Working-draft compliance documents live in `docs/` (DPIA, privacy policy, terms
incl. the 24h cancellation policy and Bacs Direct Debit Guarantee, retention
schedule). **Have them reviewed by a qualified UK adviser before launch.**
