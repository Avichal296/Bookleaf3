# BookLeaf Royalty Desk

A role-aware author royalty portal with an operations console and an n8n-powered royalty-summary workflow. The assignment PDF names Bubble.io + n8n; the requested deliverable here uses the requested code stack (React, Tailwind, Express, TypeScript, PostgreSQL and Prisma) and preserves the specified n8n integration and product requirements.

**Assignment boundary:** this is a code-based implementation as requested, not a Bubble app. It covers the product workflows with the requested full-stack technology, but a Bubble editor URL/collaborator invitation cannot be supplied from this repository. The assignment's 3–5 minute screen recording and a public deployment URL are external submission steps; use the walkthrough below to record the app after starting Docker.

## Run locally with Docker

Requirements: Docker Desktop with Compose.

```sh
cp .env.example .env
# Change JWT_SECRET, WEBHOOK_SECRET and N8N_ENCRYPTION_KEY for anything beyond a local demo.
docker compose up --build
```

- App: http://localhost:8080
- API health: http://localhost:4000/health
- n8n: http://localhost:5678 (first launch asks you to create an owner account)

The API container applies Prisma migrations, then imports the exact Assignment 1 fixture: 10 authors and 18 books. Demo admin: `admin@bookleaf.local` / `BookleafDemo2026!`. Fixture authors use `AuthorDemo2026!`; for example, sign in as `priya.sharma@email.com`.

To run the workflow on the included n8n 2.46.4 service: import `n8n/royalty-summary.workflow.json` in the n8n editor and publish it. Compose supplies the internal webhook URL. Provide `OPENAI_API_KEY` to enable AI-written drafts. Without an AI key, the API creates a deterministic, fact-based draft for local demos; if a configured AI provider fails, n8n records the notification as failed.

## Stack and layout

- `client/` (`@bookleaf/client`): React + TypeScript + Tailwind responsive author and admin interfaces.
- `server/` (`@bookleaf/server`): Express API, JWT authentication, Zod request validation, Prisma data access and summary generation.
- `turbo.json`: Turborepo task graph and cache policy; `npm run build` orchestrates workspace builds, while `npm run dev` starts both persistent dev servers.
- `server/prisma/schema.prisma`: normalized PostgreSQL relations for users/authors, books, sales, royalty periods and notification events.
- `n8n/royalty-summary.workflow.json`: secured webhook, processing step, success/failure callback and workflow response.
- `docker-compose.yml`: PostgreSQL, API, web client and n8n services with persistent volumes.
- `.github/workflows/ci.yml`: install, generate Prisma client and compile both apps for pushes and pull requests.
- `.github/workflows/deploy.yml`: build and publish API/web images to GHCR on main; configure repository variable `VITE_API_URL` to the deployed API URL.
- `docs/system-architecture.md`: component diagram, data model, trigger sequence, state machine, security boundaries and assignment coverage matrix.

## Product behavior

**Author experience.** Email/password login; an author can only query their own account. The portal shows book title, ISBN, genre, source publication status/date, MRP, print partner, distribution platforms, unit sales, royalty per copy, earned/paid/pending amounts and payout summary, with consolidated totals and status badges. A published title with a pending balance is marked overdue when its last payout was more than 90 days ago, or when no payout is recorded and the title is older than 90 days. The summary is refreshed while n8n is processing.

**Operations experience.** Admin-only author directory with name/email search, city data, paid/pending/overdue filters, summary statistics, detailed books and payout amounts, per-author summary trigger, bulk trigger for authors with pending royalties, and a notification log with visible email body, timestamps, failures and status.

**Workflow.** The API creates an auditable notification first, then calls the n8n webhook with author/notification identifiers and a shared-secret header. n8n checks that secret, requests a fresh author snapshot from the protected API, drafts the email, and calls back with success or failure and a timestamp. The application applies 30-second in-flight deduplication plus a unique idempotency key. A webhook/provider failure is reflected as `FAILED`; n8n retries the processing request twice. Summary content includes published-book sales and royalty figures, totals, quarterly-cycle/45-day guidance for pending amounts, all-paid acknowledgement, and production status. The prompt directs the model to use only supplied facts and not make up dates or promises.

Generated content is stored in the notification log and is visible for review. SMTP delivery is not enabled; the assignment's required visible/logged output is implemented. Do not place provider secrets in the client bundle.

## Data model

`User` carries a role (`ADMIN` or `AUTHOR`) and profile/email identity. `Book` belongs to one author. `Sale` and `Royalty` belong to a book; amounts use PostgreSQL `Decimal`, and sales are unique by book, period and platform. The fixture reports lifetime totals, not per-period/per-channel detail, so its totals are marked `SOURCE_AGGREGATE` instead of being split into invented records. `Notification` belongs to an author and records request key, status, generated subject/body, error, trigger identity and completion time. Cascading foreign keys and indexes support the author -> books -> ledger query path and recent notification queries. Authorization is enforced in the API for every author-scoped read and in the admin middleware for directory and trigger operations; hiding UI controls is not the security boundary.

## Dataset note and import

The exact Assignment 1 JSON is bundled at `server/prisma/data/bookleaf_sample_data.json` and read by the idempotent Prisma seed. Its stable IDs and record values are retained. The source gives `royalty_paid` as a total and only the last payout date, so individual past payment transactions cannot be reconstructed; the UI labels imported paid values as a source aggregate.

## Local development without Compose

Use Node 22+, PostgreSQL 16+ and npm. The root npm workspaces are orchestrated with Turborepo. Set `DATABASE_URL` to a local PostgreSQL URL (host `localhost` rather than Compose's `db` hostname), plus the secrets in `.env.example`.

```sh
npm install
npm run db:generate
npx prisma migrate dev --schema=server/prisma/schema.prisma --name init
npm run db:seed
npm run dev
```

Useful focused commands: `npm run dev:api`, `npm run dev:web`, and `npm run build`. Turborepo caches build outputs and keeps development/database tasks uncached. The Vite app uses `http://localhost:4000/api` by default. For deployment, set `VITE_API_URL` at client build time and configure `CLIENT_ORIGIN`, database URL, JWT/webhook secrets, AI key and n8n webhook URL in the API environment.

## Walkthrough for review

1. Sign in as an author and show that their book list, totals and status badges are scoped to that account.
2. Sign out, use the admin login, open the author directory and search/filter by payout status.
3. Open an author detail and trigger a royalty summary; show the generated email and updated notification status.
4. Use the bulk summary action for authors with pending royalties and show the n8n execution path (webhook, secret check, data/AI process, callback).
5. Explain the source fixture's aggregate-only payout history and the design choice to preserve the supplied numbers without inventing transactions.

## Operational notes

- n8n's webhook is not public-by-default in this project: the shared secret is checked before any processing, and the internal API independently checks the same header. Rotate the development values before exposing a deployment.
- The demo uses `http://` service URLs on the local Compose network. Use TLS and managed secrets when exposing the app outside localhost.
- The `N8N_ENCRYPTION_KEY` sample is a local convenience only. Set a stable random value before storing production credentials in n8n.
- This repository contains the buildable app, exact sample data, workflow export, architecture diagram and setup documentation. It does not include a deployed public URL or real email delivery credentials.
