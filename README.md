# Fuzzie — SaaS Automation Builder

Fuzzie is a Zapier-like automation builder for creating, validating, publishing, and operating visual workflows. Its React Flow editor connects typed triggers, logic, transforms, waits, loops, and provider actions while durable run history records each execution step.

## Product highlights

- Visual draft/publish workflow editor with validation, branching, expressions, formatting, waits, and bounded loops.
- Durable run and step history with replay, cancellation, retry scheduling, deduplication, and action-based credits.
- Google Workspace, Slack, Notion, Discord, custom webhook, email, Calendar, and Gemini-backed workflow paths.
- Connection health, encrypted credential writes, owner-scoped server actions, operational logs, and dashboard metrics.
- Five guided templates that create reviewable drafts and never auto-publish or execute.

Provider support varies by action and requires the matching OAuth/app configuration. The protected production checkpoint is intentionally separate from the development Preview used for the roadmap work.

## Architecture

```text
Browser / React Flow editor
        │ authenticated user actions
        ▼
Next.js App Router (server actions + API routes)
        │ ownership checks, graph validation, credential resolution
        ├──────────────► Provider APIs (Google, Slack, Notion, Discord, Gemini)
        ▼
Prisma + Neon Postgres
        │ workflows, connections, schedules, run/step history
        ▼
Durable runner + protected webhook/cron resume routes
```

Clerk supplies application identity; Neon remains the source of truth for workflows, provider connections, and run history. OAuth credentials stay server-side and new writes are encrypted with `CREDENTIAL_ENCRYPTION_KEY`. Published workflows keep versioned snapshots so editing a draft does not silently alter live execution.

### Deliberate tradeoffs

- One active account per provider keeps the resume project coherent; multi-account selection is deferred.
- Preview and local environments do not schedule public retry jobs, avoiding misleading behavior behind deployment protection.
- Legacy plaintext credential reads remain temporarily compatible so existing connections are not broken; reconnecting writes encrypted values.
- Dependency and Next.js upgrades are staged separately from feature work to keep compatibility changes reviewable.

## Tech stack

- Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, and shadcn/Radix primitives
- React Flow and Zustand
- Prisma 5 with Neon Postgres
- Clerk authentication
- Stripe Checkout billing
- Node's native test runner

## Local development

### Prerequisites

- Node.js 22
- npm
- A development database branch and development-only provider credentials

1. Copy `.env.example` to `.env` and fill only development values. Never commit it.
2. Install dependencies and generate the Prisma client:

```bash
npm install --legacy-peer-deps
npx prisma generate
```

3. Apply reviewed migrations to the development database, then run the app:

```bash
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Do not use `prisma db push` against a shared or production database.

## Quality checks

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

OAuth callbacks and provider writes need a public HTTPS Preview plus dedicated test accounts. Keep Preview environment variables branch-scoped, use an isolated Neon branch, and never point verification at production data.

## Repository safety

Roadmap implementation lives on `codex/phase-1-foundation`. The resume-linked `main` checkpoint is intentionally protected until a final reviewed release decision. See `system.md` for the current phase status, verified evidence, known limitations, and release checklist.
