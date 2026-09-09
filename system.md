# SaaS Automation Builder — Engineering System Record

This file is the durable source of truth for implementation work on this project. Read it before making changes and update it after every meaningful implementation or verification pass.

## Safety and implementation rules

1. Preserve the established frontend design. Before changing UI, inspect the surrounding components, shared primitives, Tailwind classes, responsive behavior, dark theme, state patterns, and installed libraries. Reuse those patterns and avoid visual redesign unless explicitly requested.
2. Keep changes minimal and focused. Do not add speculative abstractions, unnecessary dependencies, premature scaling systems, unrelated refactors, duplicated utilities, or placeholder UI presented as working functionality.
3. Inspect the complete existing path before editing it: UI, server action/API route, authentication, database model, external service call, execution path, and error handling.
4. Protect working behavior. Add targeted regression coverage for existing Discord, Slack, and Notion behavior before altering shared workflow execution code.
5. Treat every node shown in the editor honestly. A node must not appear production-ready unless it has configuration validation, persisted configuration, an executable backend path, useful errors, and a verified end-to-end test.
6. Never expose secrets. Do not put credentials, OAuth codes, access/refresh tokens, webhook secrets, connection strings, personal data, or environment-variable values in Git, logs, screenshots, test fixtures, or this file.
7. Use least privilege. Validate ownership on server actions and API routes, scope data by the authenticated Clerk user, validate untrusted input, and keep integration tokens server-only and encrypted where practical.
8. Make database changes through reviewed migrations. Test migrations on an isolated Neon branch before production. Use pooled connections for application traffic and a direct connection for migrations.
9. Do not mutate production or connected external services during inspection. Test writes only when explicitly authorized, using clearly identified test resources/accounts and the smallest reversible operation.
10. Do not commit, push, merge, deploy, or change cloud configuration without explicit user approval. Never rewrite shared Git history or use destructive reset commands.
11. Optimize measured bottlenecks. Remove confirmed request waterfalls with safe parallel execution, batching, caching, or better query shape; do not optimize based only on assumptions.
12. A phase is complete only after proportionate verification: static analysis, production build, targeted tests, localhost browser testing, relevant integration checks, and Vercel Preview testing when a branch is pushed.
13. Record what changed, why, tests performed, results, known limitations, commit identifiers, deployment identifiers, and rollback instructions after each pass.
14. Do not claim the product is flawless or a feature is working without evidence. Describe partial support and remaining risk accurately.

## Protected baseline and rollback

- Repository: `AmanNigam16/SaaS_Automation_Builder`
- Production project: `saa-s-automation-builder-g9kv`
- Protected branch: `main`
- Verified GitHub/production checkpoint: `c83ec6550dbddc0acbafa6d3ac1593b8584b06b1`
- Checkpoint subject: `Fix Google OAuth callback route`
- Current implementation branch: `codex/phase-1-foundation`
- Isolated Neon development branch: `codex-phase-1-foundation` (`br-patient-hat-ahz29gaz`)
- Reason for branch: keep the known deployed state recoverable while changes are tested independently.
- Rollback approach: prefer reverting the reviewed merge and promoting the last verified Vercel deployment. Do not destructively reset shared `main`.

At branch creation, two pre-existing uncommitted edits were carried from the working tree:

- `.env.example`: correct `DISCORD_PUBLICK_KEY` to `DISCORD_PUBLIC_KEY`.
- `src/middleware.ts`: classify `/api/auth/callback/google` as a Clerk public route rather than an ignored route.

Neither edit has been committed, pushed, or deployed.

## Verified product baseline

### Working or materially implemented

- Clerk sign-in and authenticated application shell.
- React Flow editor rendering, node placement, edge creation, workflow save/publish UI.
- Discord connection and message action have previously worked in user testing; independent regression verification remains required.
- Slack and Notion have connection records and backend action paths, although current external-account readiness and execution behavior require stronger validation.
- A partial wait/delay path exists.
- Neon Postgres is reachable through the configured pooled application connection.

### Broken, partial, or misleading

- The current deployed `main` checkpoint still has the original Google Drive OAuth callback failure; the branch implementation repairs it but has not been deployed. The production database had no saved Google credential/resource record for the test user at inspection time.
- Google Drive UI may imply connection without proving usable OAuth credentials or API access.
- Email, AI, Condition, Custom Webhook, Google Calendar, generic Trigger, and generic Action nodes are primarily or entirely frontend-only.
- Existing published workflows are not reliable end-to-end automations; observed graphs include unsupported AI nodes and incomplete templates/configuration.
- Workflow traversal/execution does not yet provide a durable graph execution model with branching, retries, idempotency, execution history, or trustworthy logs.
- The branch now implements Google disconnect, reconnect/change-account, account labeling, refresh-token rotation, revocation, and truthful reconnect-required state. Multi-account behavior and equivalent lifecycle controls for the other providers remain.
- Some server actions lack adequate resource-ownership checks; the cron execution surface requires authentication and abuse protection.
- OAuth state/CSRF protection, secure token storage, and failure recovery require hardening.
- Credits/billing behavior is incomplete and can render invalid values when Stripe configuration is unavailable.
- Templates and logs are incomplete product surfaces.
- Dependencies include known vulnerabilities and an old Next.js release; upgrades require a separate compatibility-tested phase.

## Connected inspection capabilities

- Neon: direct read-only database access verified; account/control-plane access depends on tools exposed in the active Codex session.
- Neon project: `SaaS Automation Builder` (`green-wildflower-23474607`). Default/production branch: `production` (`br-restless-term-ah4cwkbf`). Isolated development branch: `codex-phase-1-foundation` (`br-patient-hat-ahz29gaz`), created from production HEAD and verified ready. Writes to the child branch do not change the production parent.
- Vercel: read access verified for team `Aman Nigam's projects`; the only currently visible project is `saa-s-automation-builder-g9kv`. Authorization is team/account scoped rather than guaranteed project-only scope.
- Google Drive, Gmail, and Google Calendar: read access verified and all use the same test Google account as the application database user. The email address is intentionally omitted here.
- Clerk MCP: public, stateless SDK guidance only. It cannot access the Clerk Dashboard, users, sessions, secrets, or production logs.

## Delivery phases

### Phase 1 — Foundation, authentication, and connection truth

- Repair and verify Google OAuth callback routing.
- Add OAuth state validation and safe redirect/error behavior.
- Validate Drive credentials with a real read-only API request before showing Connected.
- Implement token refresh and a clear connection status model.
- Add view-account, reconnect/change-account, and disconnect/revoke behavior using existing UI patterns.
- Add ownership checks and secure integration-secret handling where touched.
- Establish targeted tests and preserve Discord behavior.

### Phase 2 — Workflow contract and durable execution core

- Define typed node configuration and validation contracts.
- Execute the actual directed graph, including condition branches and wait semantics.
- Add durable runs, per-step status/logging, retries, timeouts, idempotency, and error reporting.
- Protect cron/webhook execution endpoints and design trigger registration lifecycle.
- Make publish validation reject incomplete or unsupported workflows.

### Phase 3 — Complete currently advertised nodes

- Email action through an explicitly selected provider.
- AI action with provider/model configuration, structured outputs, usage limits, and safe secret handling.
- Condition branching with typed operators.
- Custom webhook trigger/action with signature verification and test payloads.
- Google Calendar actions and triggers.
- Google Drive triggers/actions backed by validated credentials.
- Complete generic trigger/action behavior or remove misleading placeholders.

### Phase 4 — Integrations and no-code usability

- Standardized connection lifecycle and optional multiple accounts per provider.
- Field mapping from prior-step outputs, variables, test data, and configuration previews.
- Trigger polling/webhook registration, schedules, filters, transforms, and unified notifications.
- Useful templates built only from verified nodes.

### Phase 5 — Product hardening and recruiter-ready proof

- Complete execution-history/logs UI, usage/credits, billing failure handling, onboarding, and empty/error states.
- Resolve dependency vulnerabilities through staged upgrades and regression testing.
- Measure and remove confirmed frontend/API/database waterfalls.
- Add end-to-end test scenarios and seedable demo workflows.
- Validate accessibility, responsive behavior, performance, security boundaries, and rollback readiness.

## Current pass

- Date: 2026-09-09 (Asia/Calcutta)
- Status: Phase 1 implementation is active and Phase 2A publish-safety work has started. Google OAuth, credential lifecycle, workflow ownership, Drive notification hardening, graph validation, and truthful publish gating are implemented locally. Authenticated Google end-to-end verification remains before Phase 1 completion. The user has explicitly accepted the development-only database credential exposure risk and declined rotation for this personal project.
- Next implementation target: complete authenticated localhost Google OAuth/Drive verification, then add durable workflow-run/step records and secure execution contracts without exposing unfinished nodes as executable.
- Commit status: implementation snapshot committed on `codex/phase-1-foundation` as `38f4e4a26baf295c1287c9deab7b226abc2324b8` (`Harden OAuth and workflow publishing foundation`).
- Push/deployment status: branch push authorized and pending at the time of this record update. No merge, production deployment, or production alias change performed.

## Change and verification log

### 2026-09-09 — Protected foundation initialized

- Created working branch `codex/phase-1-foundation` from checkpoint `c83ec6550dbddc0acbafa6d3ac1593b8584b06b1` while preserving the two existing uncommitted edits.
- Added this engineering record and phased delivery plan.
- No commit, push, merge, deployment, database mutation, or external-service mutation performed.

### 2026-09-09 — Phase 1A Google OAuth callback hardening

- Kept `/api/auth/callback/google` in Clerk `publicRoutes` so `auth()` receives middleware context while the OAuth provider can return to the route.
- Added a cryptographically random OAuth `state` value stored in an expiring, HttpOnly, SameSite=Lax cookie and constant-time callback validation.
- Added explicit Google OAuth configuration checks and safe connection-page error redirects for denied authorization, missing code, invalid state, token exchange failure, and unexpected callback failure.
- Added a real Google Drive `about.get` capability check before saving a token; Google profile and Drive capability checks run in parallel.
- Added the localhost Google callback URL to `.env.example` documentation.
- Verification: `npm run lint` passed with only the repository's pre-existing React Hook warnings. A clean sequential `npm run build` passed and generated all application/API routes.
- Browser verification: an authenticated callback containing an invalid state safely redirected to `/connections?google_error=invalid_state`; the Connections page remained functional and existing Discord, Notion, and Slack connection indicators remained present.
- The initial localhost `redirect_uri_mismatch` blocker was subsequently resolved in Google Cloud; see the Google Cloud redirect configuration entry below.
- A generated `.next` cache corrupted by running build and dev concurrently was removed and regenerated. No source or user data was removed.
- No commit, push, merge, deployment, database mutation, or connected-service data mutation performed.

### 2026-09-09 — Phase 1B Google connection truth and lifecycle controls

- Removed fallback from the app-managed Drive credential to Clerk's Google sign-in token. Clerk login proves identity but does not prove that the separate Drive OAuth flow completed or granted Drive scopes; the fallback could therefore produce a false Connected state.
- Google Drive is now considered connected only when this application has persisted a credential after the callback's real Drive capability check.
- Added authenticated Google disconnect behavior. When invoked by the user, it attempts to stop an existing Drive notification channel, attempts token revocation, removes the user's local Drive credential, and clears saved Google resource/account identifiers in one database transaction.
- Added Google Reconnect and Disconnect controls using the existing shared Button, Card, spacing, color, and typography patterns. Other provider cards were not redesigned.
- Replaced the hand-written Connect link styling with the project's existing Button primitive without changing page structure.
- Verification: lint passed with only pre-existing hook warnings; production build passed with the known old-Clerk Edge warnings and stale Browserslist notice. `git diff --check` found no whitespace errors.
- Browser verification: the existing logged-in test session rendered the Connections page successfully; Google correctly displayed Connect because no app-managed Drive credential exists, while Discord, Notion, and Slack remained displayed as Connected. Visual styling remained consistent with the existing dark UI.
- The provided localhost test-account credentials are authorized for browser testing only. They are intentionally not recorded in this file, source code, logs, or Git.
- No disconnect/revoke action was executed, so no database or external Google data was mutated during verification.
- No commit, push, merge, deployment, or production configuration change performed.

### 2026-09-09 — Phase 1C Workflow ownership and write batching

- Added Clerk user ownership constraints to workflow save, publish/unpublish, template updates, and node/edge reads. Workflow IDs alone can no longer authorize these operations.
- Used atomic `updateMany` filters containing both workflow ID and authenticated `userId`, returning Unauthorized or Workflow not found without exposing another user's data.
- Replaced the Slack template channel loop with one set-based database update. This avoids one write per selected channel and prevents repeated saves from accumulating duplicate channel IDs.
- Preserved existing success messages and editor interaction contracts.
- Browser verification: the authenticated test user successfully loaded an existing owned workflow editor after the access-control changes. No save, publish, template, drag/drop, or external message action was triggered.
- Verification: lint passed with only the existing React Hook warnings; the sequential production build passed with the known old-Clerk Edge warnings and stale Browserslist notice.
- No commit, push, merge, deployment, database mutation, or external-service mutation performed.

### 2026-09-09 — Isolated Neon development branch created

- With explicit user approval, resolved Neon organization `Aman`, project `SaaS Automation Builder`, and the current default branch `production`.
- Created child branch `codex-phase-1-foundation` (`br-patient-hat-ahz29gaz`) from production branch `br-restless-term-ah4cwkbf` at its current HEAD.
- Verified the child branch reached `ready`, is not primary/default, and initially reports zero written data.
- An initial request for a five-minute suspend timeout was rejected by the current Neon plan; that failed request created no branch. The successful branch uses Neon account defaults.
- The local application and Vercel production environment still point to production. No production database rows or schema were changed.

### 2026-09-09 — Google Cloud redirect configuration

- Confirmed callback URL behavior is origin-aware: production uses `https://saa-s-automation-builder-g9kv.vercel.app/api/auth/callback/google`; localhost uses `http://localhost:3000/api/auth/callback/google`.
- Both URLs must be registered on the same Google OAuth web client; changing a single `.env` redirect value per environment is neither required nor desirable for the current implementation.
- Updated the existing `Fuzzie` Google OAuth web client after explicit action-time confirmation. Preserved the existing Clerk and production Vercel callbacks and added `http://localhost:3000/api/auth/callback/google`.
- Verified the completed external change through Google Cloud's `OAuth client saved` confirmation and a fresh client detail view showing all three redirect URIs.
- The user-provided SaaS test password was not transmitted to Google; Google account re-verification was completed directly by the user.

### 2026-09-09 — Phase 1D Google credential refresh and Drive listener hardening

- Extended the app-managed Google credential model with refresh token, token expiry, granted scopes, connected-account email/name, and a private Drive webhook channel token.
- Centralized Google OAuth client creation for Drive calls. Access tokens are refreshed within a one-minute expiry window, rotated access/refresh metadata is persisted, and expired legacy credentials without a refresh token produce a truthful Reconnect required state.
- The Google callback now persists refresh/expiry/scope and account metadata after its real Drive capability check. Existing refresh tokens are preserved when Google omits a replacement during same-client reauthorization.
- The existing connection card design is preserved. Google now shows the connected account label and distinguishes Connect from Reconnect required while retaining Reconnect and Disconnect actions.
- Removed two confirmed waterfalls on the Connections page: independent provider callback persistence runs concurrently, followed by concurrent Google-status and connection-record reads.
- Changed Drive listener creation from GET to authenticated POST, made repeated creation idempotent, persisted the actual Google channel ID/start page token/subscription state, and added a random channel token that must match Google's echoed `X-Goog-Channel-Token` before a notification can resolve a user or execute workflows.
- Added a Prisma baseline migration for the pre-existing untracked schema plus an additive Google lifecycle migration. Applied only the additive migration to isolated Neon branch `br-patient-hat-ahz29gaz`; Neon schema comparison against production shows exactly the six intended nullable/defaulted columns and no other drift. Production schema was not changed.
- Prisma schema formatting/validation and lint passed; lint reports only the previously recorded hook warnings. A clean production build passed after the final source changes.
- Isolated localhost API verification: unauthenticated Drive listener creation returned 401, and a notification without the required Google resource/channel headers returned 200 without resolving a user or executing a workflow. The state-changing listener endpoint is no longer callable via GET once authenticated routing is reached.
- Authenticated browser verification remains incomplete because the embedded Clerk sign-in widget rendered blank in the available fresh browser profile. Authentication was not bypassed and no test credential was stored or logged.
- Prisma migration-history bookkeeping could not be initialized through the local CLI because this sandbox could not reach Neon's direct endpoint. The additive schema itself was applied and verified through the Neon plugin; before production rollout, mark `0_init` as applied on the existing database and run the lifecycle migration through a direct connection.
- Security follow-up: while starting the isolated-branch dev server, its connection string was echoed once by the terminal. A value-safe comparison confirmed that the inherited role password matches production, so the database password must be treated as exposed. The value is not recorded here. On 2026-09-09, the user explicitly declined credential rotation and accepted this risk for the personal project. Do not rotate or change Neon/Vercel credentials unless the user later requests it; production has not been changed.
- No commit, push, merge, deployment, production database mutation, Google Drive file mutation, Gmail mutation, or Google Calendar mutation performed.

### 2026-09-09 — Phase 2A graph contract and truthful publish gating

- Added a shared server-side linear graph validator. It parses stored nodes/edges, rejects malformed references, duplicate node IDs, cycles, disconnected nodes, multiple roots, branches/merges, unsupported node types, and graphs without an executable action.
- Until their backends exist, Email, AI, Condition, Custom Webhook, Google Calendar, generic Trigger/Action, and Wait cannot be published. They remain visible in the existing editor so later phases can implement them without redesigning the sidebar.
- The currently publishable graph contract is one Google Drive root trigger followed by a connected linear sequence of configured Discord, Slack, and/or Notion actions.
- Publish now validates the user's saved Google listener and each required owned provider connection/template/channel/database configuration. Invalid graphs remain editable but return a specific `Cannot publish` message and stay unpublished.
- Publishing first saves the latest canvas, then derives and persists execution order by traversing actual graph edges. The prior client-generated `edge.target` array order is no longer trusted as execution order.
- Both publish entry points use the same validator, retain Clerk ownership filters, and still allow unpublishing without requiring a currently valid graph.
- Replaced the random per-render node status dot with a deterministic completed/pending indicator; the UI no longer displays arbitrary red/green health states.
- Lint and the final production build passed. Only the repository's pre-existing React Hook, old Clerk Edge-runtime, and stale Browserslist warnings remain.
- No workflow was saved, published, or executed during verification. No commit, push, merge, deployment, production database mutation, or external-service write was performed.

### 2026-09-09 — Development branch checkpoint prepared

- With explicit user approval, audited all tracked and untracked changes before commit. The staged snapshot contained only the intended application source, Prisma schema/migrations, `.env.example`, and this engineering record; no local `.env`, generated build output, or detected secret-shaped value was included.
- Final verification passed: `npm run lint` completed with only the previously documented React Hook warnings, `npm run build` completed successfully, and `git diff --cached --check` reported no whitespace errors.
- Created implementation commit `38f4e4a26baf295c1287c9deab7b226abc2324b8` (`Harden OAuth and workflow publishing foundation`) on `codex/phase-1-foundation`.
- The protected `main` branch and production checkpoint remain `c83ec6550dbddc0acbafa6d3ac1593b8584b06b1`. The development commit has not been merged or promoted to production.
