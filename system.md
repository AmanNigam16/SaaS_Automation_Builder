# SaaS Automation Builder — Engineering System Record

This file is the durable source of truth for implementation work on this project. Read it before making changes and update it after every meaningful implementation or verification pass. Verify statements against the current branch, database, and deployed environment before relying on them; local implementation does not imply production deployment.

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
10. Never touch, merge into, or deploy `main` without a new explicit user decision at the end of the upgrade; keep its resume-linked checkpoint intact. The user permits a reviewed commit and push to `codex/phase-1-foundation` only after a substantial, fully verified phase-level milestone, not for minor changes. Do not change cloud configuration or production without explicit action-specific approval. Never rewrite shared Git history or use destructive reset commands.
11. Optimize measured bottlenecks. Remove confirmed request waterfalls with safe parallel execution, batching, caching, or better query shape; do not optimize based only on assumptions.
12. A phase is complete only after proportionate verification: static analysis, production build, targeted tests, localhost browser testing, relevant integration checks, and Vercel Preview testing when a branch is pushed.
13. Record what changed, why, tests performed, results, known limitations, commit identifiers, deployment identifiers, and rollback instructions after each pass.
14. Do not claim the product is flawless or a feature is working without evidence. Describe partial support and remaining risk accurately.
15. Preserve all existing project features, nodes, options, settings, and frontend elements, even when they are incomplete. Implement them safely where feasible; otherwise leave them in place, avoid falsely presenting them as executable, and explicitly flag each unresolved item for the user's review. Do not remove one merely because it is unfinished.
16. Record useful project instructions and decisions from the user here as they arrive. Keep this file concise and current for handoff to other coding agents, but verify relevant claims against code, Git state, and live configuration before acting; this record is context, not proof.
17. The user explicitly authorizes production-mode builds and thorough tests on the `codex/phase-1-foundation` development branch and isolated test resources. Do not mistake that for approval to run development-schema writes against the production database or to alter `main`. If a build shares `.next` with a running dev server, coordinate or isolate the build output so the user's active session is not disrupted.
18. Across implementation phases, inspect actual query and request dependencies and eliminate avoidable waterfalls with safe parallel execution, batching, and appropriate standard caching. Measure the latency impact and preserve correctness, authorization, and freshness; do not add speculative caches or concurrency that can duplicate side effects. Aim for responsive, industry-standard SaaS loading times without over-engineering.

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

Both edits were later included in the development-branch foundation commit and pushed to that branch. Neither has been merged into `main` or deployed to production by this task.

## Verified product baseline

### Working or materially implemented

- Clerk sign-in and authenticated application shell.
- React Flow editor rendering, node placement, edge creation, workflow save/publish UI.
- Discord connection and message action have previously worked in user testing; independent regression verification remains required.
- Slack and Notion have connection records and backend action paths, although current external-account readiness and execution behavior require stronger validation.
- A partial legacy wait/delay path exists, but no current code path schedules it and Wait remains blocked from publishing.
- Neon Postgres is reachable through the configured pooled application connection.

### Broken, partial, or misleading

- The current deployed `main` checkpoint still has the original Google Drive OAuth callback failure; the branch implementation repairs it but has not been deployed. The production database had no saved Google credential/resource record for the test user at inspection time.
- Google Drive UI may imply connection without proving usable OAuth credentials or API access.
- Email, AI, Condition, Custom Webhook, Google Calendar, generic Trigger, and generic Action nodes are primarily or entirely frontend-only.
- Existing published workflows are not reliable end-to-end automations; observed graphs include unsupported AI nodes and incomplete templates/configuration.
- The development branch now has durable linear run/step history and per-Drive-change deduplication. It still lacks branching, safe retries, resumable per-run waits, and authenticated end-to-end proof; production `main` does not have the branch implementation.
- The branch now implements Google disconnect, reconnect/change-account, account labeling, refresh-token rotation, revocation, and truthful reconnect-required state. Multi-account behavior and equivalent lifecycle controls for the other providers remain.
- Some server actions may still lack adequate resource-ownership checks. The local branch now requires an unguessable per-schedule token for the legacy cron resume route; it still needs a full per-run resume design and integration verification.
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
- Complete generic trigger/action behavior while preserving the existing options; flag anything still unfinished for user review.

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

- Date: 2026-09-12 (Asia/Calcutta)
- Status: Phase 1 remains pending completed Google Drive OAuth and real push-delivery verification. Phase 2A publish safety and Phase 2B durable run history are implemented locally; Phase 2B remains uncommitted. Localhost now runs against isolated Neon branch `br-patient-hat-ahz29gaz` via a process-only URL override, and the logged-in Connections and Logs pages render without the earlier missing-schema errors. The Prisma migration ledger on that branch is reconciled. The app's Google OAuth flow reached the test account's Drive permission screen; explicit action-time approval to grant the broad requested scopes is pending, so no grant or Drive file test has occurred. Drive notifications process one changes page at a time with bounded workflow concurrency and page-level cursor checkpoints; old RUNNING records are shown as needing review rather than automatically replayed. The user accepted the earlier development-only credential exposure risk and declined rotation.
- Next implementation target: after the user confirms the Google Drive permission grant, complete the OAuth callback and test account/refresh behavior. A real Google push subscription also needs a public HTTPS receiver or isolated Preview runtime; localhost without a tunnel cannot prove Google-to-app delivery. Then run a controlled Drive-change/workflow/Logs test without publishing or messaging through the inherited incomplete workflows. Replace the legacy per-workflow wait/cron state with per-run resumable state; add replay only after provider-specific idempotency is enforced.
- Commit status: current HEAD of `codex/phase-1-foundation` is `6e999aa10b24e661f3f90a3cfbaa0159f29a9307` (`Record development branch push`). The 2026-09-09 Phase 2B and 2026-09-12 work remains uncommitted.
- Push status: `codex/phase-1-foundation` is published to GitHub and tracks `origin/codex/phase-1-foundation`. Remote verification after the push confirmed that `main` remains at the protected checkpoint.
- Deployment status: no merge, production deployment, or production alias change performed. A Vercel Git integration may independently create a non-production Preview deployment for the development branch.

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
- Created documentation checkpoint commit `7e84568e2c30a33776cb1e6fb4ade5cbadb0257d` (`Document phase foundation checkpoint`) and pushed the development branch to GitHub.
- Post-push verification confirmed remote `codex/phase-1-foundation` at `7e84568e2c30a33776cb1e6fb4ade5cbadb0257d` and remote `main` unchanged at `c83ec6550dbddc0acbafa6d3ac1593b8584b06b1`.
- The protected `main` branch and production checkpoint remain `c83ec6550dbddc0acbafa6d3ac1593b8584b06b1`. The development commit has not been merged or promoted to production.

### 2026-09-09 — Phase 2B durable workflow runs and execution history

- Added `WorkflowRun` and `WorkflowStepRun` models with explicit statuses, timestamps, sanitized errors, JSON input/output summaries, attempt numbers, lookup indexes, and cascading relations. A workflow/event uniqueness constraint prevents the same provider event from starting the same workflow twice.
- Added the corresponding additive Prisma migration and applied it only to isolated Neon branch `br-patient-hat-ahz29gaz`. Production schema and rows remain unchanged.
- Refactored the existing linear Discord/Slack/Notion execution path through a shared action executor. Google Drive notifications now create durable runs, record every started action and its outcome, ignore Google's initial `sync` notification, require the Google message-number header as notification validation, and process independent workflows concurrently. Event identity is derived from the Drive change-page cursor and change position, not the message number.
- Corrected the Google trigger contract to consume Drive `changes.list` pages because Google push notifications contain headers but no file payload. Each concrete Drive change now gets a stable hashed event identity derived from its channel resource/cursor position, safe file metadata is passed into its workflow run, and the stored page token advances only after the batch is processed. Batched notifications can therefore create one run per actual Drive change instead of one ambiguous run per HTTP notification.
- Unsupported or future Google resource-state values are acknowledged without execution. The accepted change states follow Google's documented add/remove/update/trash/untrash/change contract, with compatibility for `changed` responses.
- A failure in one workflow is recorded without aborting other workflows. Stored third-party errors are deliberately generalized so tokens, webhook URLs, response bodies, or other sensitive provider details are not persisted or exposed in the Logs UI.
- Slack action execution now checks Slack's response-level `ok` flag rather than treating every HTTP 200 as success, and sends configured independent channel messages concurrently instead of through a confirmed request waterfall.
- Replaced the Logs placeholder with an ownership-scoped, server-rendered recent-run view using the project's existing sticky header, cards, badges, spacing, typography, muted colors, and dark-theme patterns. It shows workflow, trigger, status, duration, ordered steps, attempts, and safe errors without exposing stored trigger payloads or provider secrets.
- Verification: Prisma format/validate/generate passed; the generated client is 5.11.0 while the installed Prisma CLI still resolves to the previously documented 5.22.0 mismatch. Lint and a complete production build passed with only the existing Hook and Browserslist warnings.
- Neon schema comparison shows only the previously approved Google lifecycle columns plus the new run/step enums, tables, indexes, uniqueness constraint, and cascade foreign keys relative to production.
- An isolated-branch contract test created synthetic user/workflow/run/step rows, proved a duplicate event leaves exactly one run, proved workflow deletion cascades to its run and step, and removed all synthetic rows. No external Discord, Slack, Notion, Google Drive, Gmail, or Calendar action was executed.
- Known limitations: automatic retries/replay, resumable per-run waits, cancellation, pagination, detailed provider-safe error codes, and authenticated browser E2E remain future work. The legacy cron path still stores wait state on the workflow and remains non-publishable under the current validator.
- Retry safety review: Slack documents `client_msg_id` duplicate handling and Discord documents nonce-based deduplication for message creation, while Notion's create-page request does not expose an equivalent idempotency parameter. Generic automatic retries are therefore deliberately not enabled yet because a timeout after a successful Notion write could create a duplicate page.
- Authenticated Google E2E remains blocked by environment isolation rather than source compilation: the local `.env` targets production Neon, while the new run-history schema exists only on the isolated branch. Do not repoint localhost or execute OAuth against production merely to bypass this boundary; use an isolated branch connection/Preview environment when safely configured.
- No commit, push, merge, Vercel deployment, production database mutation, or production configuration change performed in this pass.

### 2026-09-12 — Phase 2B delivery and legacy cron endpoint hardening

- Google Drive notifications now require the actual channel ID in addition to the channel resource ID and private channel token. The Drive change cursor advances with a compare-and-set update only when the same channel, subscription, and prior page token still match, so overlapping notifications cannot regress the saved cursor.
- The legacy `/api/cron/wait` route previously accepted only a workflow ID and could execute queued actions without caller proof. Newly created cron-job.org jobs now carry a random 256-bit resume token in a request header while only its SHA-256 hash is stored in workflow state. The route verifies that token before running, then atomically claims the stored state to prevent concurrent or repeated execution. A missing token receives HTTP 401 before any database query. The scheduler rejects an invalid returned job ID and attempts to remove a newly created job if persisting its state fails.
- Existing tokenless legacy cron jobs will no longer execute and would need explicit review/rescheduling. No current source call site creates such jobs, Wait remains visible but non-publishable, and no existing cron job was changed or deleted externally. This security guard is not a finished Wait implementation: scheduling is still workflow-scoped, does not model per-run delay/recovery, and a failure after claim is not safely retryable.
- Verified against [cron-job.org's REST API documentation](https://docs.cron-job.org/rest-api.html) that job creation accepts `extendedData.headers`; no scheduler job was actually created during this pass.
- Verification: `next lint` passed with only pre-existing React Hook warnings; `next build` compiled, type-checked, and generated all routes successfully, with the known stale Browserslist warning. A local production server returned HTTP 401 for `/api/cron/wait` without a resume token and was then stopped. `git diff --check` found no whitespace errors. No authenticated browser E2E or external provider action was performed this pass.
- No commit, push, merge, deployment, production database mutation, Google Cloud change, or external-service mutation performed. Current worktree changes remain on `codex/phase-1-foundation`; protected `main` remains the rollback checkpoint unless separately changed outside this task.

### 2026-09-12 — Isolated authenticated verification attempt

- Reconfirmed Neon child branch `br-patient-hat-ahz29gaz` is ready and not primary/default. Its `neondb` database contains the new `WorkflowRun` table, one inherited app user, zero app-managed Google credentials, three inherited published workflows, zero run records, and zero queued legacy Wait states.
- Read-only check on production Neon branch `br-restless-term-ah4cwkbf` found zero workflows with a non-null legacy `cronPath`; no old queued Wait job is represented in the production database at this point. This does not inspect the external cron-job.org account for unrelated orphan jobs.
- Started localhost port 3000 with the child branch's pooled database URL injected only into that process. The repository `.env` and Vercel configuration were not changed, and the secret was not printed or saved to this record.
- The in-app browser still showed a blank Clerk sign-in surface. Chrome rendered Clerk's email/password form and accepted the authorized test-account inputs, but a server-visible session was not established: protected `/dashboard` and `/connections` requests redirected back to sign-in, while the client sign-in route then appeared blank or redirected to the public home page. The local server logged Clerk's `no signed-in user` redirects. Do not treat that form interaction as successful authentication.
- Therefore the real Google OAuth callback, Drive connection, harmless Drive-change trigger, and Logs browser end-to-end path remain unverified. No test Drive file was created, no provider message was sent, and no production database write occurred. Do not bypass Clerk or point the test at production to force a green result. Next step is to establish a working localhost Clerk session (possibly in the user's normal browser profile) or use an explicitly approved isolated Preview runtime, then execute the test workflow.

### Local Clerk sign-in troubleshooting note

- If localhost sign-in redirects despite a valid Clerk session, first check whether the local server can reach Clerk. A restricted test server previously got network `EACCES` / Clerk `fetch failed`; restarting it with outbound access allowed authenticated `/dashboard` navigation. Check server logs and runtime restrictions before touching Clerk, middleware, or sign-in code. Keep the database pointed at the isolated Neon branch during local tests; do not change `.env` or production settings merely to troubleshoot.

### 2026-09-12 — Phase 2B bounded Drive delivery and honest interrupted-run display

- Confirmed the user-provided in-app localhost session is authenticated on `/settings`. A read-only visit to `/logs` failed because `public.WorkflowRun` is absent from the database used by the manually started server. This proves the runtime is not ready for Phase 2 tests; it does not by itself identify the database branch. Returned the browser to `/settings`. Did not change the user's server, `.env`, Neon, or production configuration, and did not perform a workflow/provider write.
- Drive notification delivery now handles changes one page at a time and limits simultaneous workflow executions to four per change. It advances the stored Drive cursor with the existing channel/page compare-and-set only after all actions for that page have completed; an infrastructure failure before that point leaves the page eligible for safe deduplicated redelivery. This follows Google's documented `nextPageToken` / final `newStartPageToken` contract. There is still no durable background worker for very large backlogs or guaranteed provider-side exactly-once delivery.
- The Logs page now displays a RUNNING run or step older than 15 minutes as `Needs review` with an explicit warning that an external action's outcome may be unknown. It does not retry or mutate the run automatically; provider-specific idempotency is still needed before safe replay.
- Verification: `next lint` passed with only the previously recorded React Hook warnings; `tsc --noEmit --incremental false` passed; `git diff --check` found no whitespace errors. A production build and authenticated Drive execution were not run because the user's dev server is active and its database lacks the Phase 2 table. The local `npm` shim was broken in this execution environment, so lint and TypeScript checks were run through their installed Node entrypoints. No commit, push, merge, or deployment in this pass.

### 2026-09-12 — Isolated runtime, build, Connections diagnosis, and webhook routing

- The user authorized a production-mode build and thorough development-branch testing, including use of the manually started localhost server, while protecting `main` and the production deployment. Added the explicit performance instruction to the safety rules: remove measured query waterfalls through safe parallelism/batching/caching without speculative complexity or duplicated side effects.
- In the logged-in localhost browser before switching databases, `/connections` failed because `LocalGoogleCredential.refreshToken` was absent, and `/logs` failed because `WorkflowRun` was absent. This was schema/environment drift, not evidence of a broken OAuth callback. Read-only inspection verified the local `.env` targets the older production Neon endpoint; its secret value was not printed.
- Verified the isolated branch `br-patient-hat-ahz29gaz` is non-default, has the expected Google credential columns and run tables, and accepts the existing application role. Stopped only the verified Node listener on port 3000, then restarted the app with the isolated branch's direct hostname substituted into `DATABASE_URL` for that process only. `.env`, Vercel, and production Neon were not changed. The logged-in `/connections` page rendered all four connection cards, and `/logs` rendered its empty-run state without an error.
- An optimized production build succeeded twice, including after the middleware change below, with only existing React Hook and stale Browserslist warnings. Builds ran while the dev server was stopped to avoid a shared `.next` cache collision; localhost was restarted afterward on the isolated branch.
- The isolated database contained the three schema migrations but lacked `_prisma_migrations`. Using Prisma's direct-connection `migrate resolve --applied`, recorded `0_init`, the Google lifecycle migration, and the durable runs migration as applied on the isolated branch only. `prisma migrate status` now reports the schema up to date. This added migration bookkeeping on the isolated branch, not a production schema change.
- A server-to-server POST without Clerk browser cookies to the Drive notification route returned 401 (`uat-missing`) despite `publicRoutes`, because the installed development Clerk middleware intercepts interstitial API requests before public-route handling. The Drive handler itself uses channel/resource IDs and a private token, not Clerk `auth()`. Moved `/api/drive-activity/notification` to `ignoredRoutes`; also moved the separately Svix-signature-verified `/api/clerk-webhook` there. Kept `/api/auth/callback/google` in `publicRoutes` because it calls `auth()`. After the change, an invalid Drive notification reached its handler and returned 200, an unmatched channel/resource/token combination was acknowledged with 200 without processing, an unsigned Clerk webhook returned 400, and `/api/cron/wait` without its token still returned 401.
- In-app OAuth navigation reached Google's consent screen for the authorized test account. The screen requests broad Drive permissions including edit/delete. Per action-time confirmation policy, asked the user before clicking Allow; the screen remains open. No OAuth grant, Google file creation, Drive watcher, workflow execution, or external Discord/Slack/Notion message was made in this pass. No commit, push, merge, or deployment.

### 2026-09-12 — Approved Google OAuth continuation pending Google-account sign-in

- The user explicitly approved clicking Google's `Allow` for the test account and completing the remaining Drive/Logs verification. In the in-app browser, clicked Allow on the previously open consent and on one fresh OAuth attempt, but neither navigated to the localhost callback; a read-only isolated Neon check still found zero `LocalGoogleCredential` rows. Do not infer that a grant was saved or blame application code without callback evidence.
- Started a separate Chrome test tab, signed in successfully to the authorized Fuzzie/Clerk test account using the credentials the user supplied for that purpose, and initiated the same app-managed Google OAuth flow. Chrome had a different Google account signed in; selecting the requested test account reached Google's password page. The supplied password was identified as the Fuzzie/Clerk password, not a Google-account password, so it was not submitted to Google. The Chrome tab was preserved for the user to finish Google-account sign-in. Resume OAuth/Drive tests after the user confirms that sign-in is complete; never store or echo a Google password.
- No Google callback code was received, no Drive credential was saved, no watcher was registered, no Google Drive file was created, and no workflow/Discord/Slack/Notion action was executed. The localhost server remains running with isolated Neon injected only into its process. `main`, production Neon, Vercel, and local `.env` remain unchanged. No commit, push, merge, or deployment.

### 2026-09-12 — Local Google OAuth browser-boundary diagnosis

- Google account authentication and Drive consent completed far enough for Google to return an authorization code to the exact configured localhost callback, `http://localhost:3000/api/auth/callback/google`.
- The controlled Chrome surface then reported `ERR_BLOCKED_BY_CLIENT` for that localhost callback. Retrying or opening the same callback in another controlled Chrome tab was also blocked. The in-app browser remained on Google's consent surface after Allow. Local server logs show the OAuth connect endpoint but no callback request, so the request was blocked before it reached Next.js; no app callback, Clerk auth lookup, Google token exchange, or database write ran.
- Treat this as a controlled/embedded-browser localhost restriction unless a normal user-controlled browser reproduces it. Do not modify OAuth, Clerk, middleware, or persistence code to compensate. For agent-run end-to-end OAuth, use a deliberately isolated HTTPS Preview deployment whose exact callback is authorized in Google Cloud and whose database points only to the isolated Neon branch.
- Cleanup after diagnosis: closed the stale in-app callback tab containing the expired authorization response and stopped the agent-owned localhost process that had the isolated Neon URL injected. Kept the authorized localhost redirect for normal local development, the test account's Google consent grant for Preview verification, isolated migration/schema state, the branch-scoped Vercel Preview `DATABASE_URL`, and the independently required webhook middleware correction. There were no Google credential rows, workflow runs, or test Drive files to delete.
- When the user later restarted localhost from VS Code, it again inherited `.env` and therefore the older production-schema Neon endpoint, reproducing the missing `LocalGoogleCredential.refreshToken` error. Stopped only the verified project-owned Next.js listener and restarted localhost with the isolated branch hostname injected into that process; `.env` and production remained unchanged. Browser verification confirmed `/connections` renders its four connection cards with no Next.js error overlay.

### 2026-09-12 — Preview deployment preparation

- The user created a Vercel `DATABASE_URL` secret scoped only to Preview branch `codex/phase-1-foundation`, using the isolated Neon branch. Do not edit the existing All Environments value or promote a Preview to production. The connected Vercel project reports a separate READY Preview at development commit `6e999aa` and production at protected `main` commit `c83ec65` before this new push.
- Final local lint and optimized build passed with the previously documented React Hook dependency and stale Browserslist warnings. Stopped the agent-owned localhost server first to avoid sharing `.next` with the production build.
- Found the Drive watch registration preferred `NGROK_URI` on every environment. Scoped that override to localhost/127.0.0.1 only, so a Vercel Preview uses its request's HTTPS origin for Google push delivery even if an old ngrok variable is present. A second optimized build passed after this change; the actual Preview watch registration still needs end-to-end verification.
- Google OAuth uses the incoming request origin in both connect and callback routes; `NEXT_PUBLIC_URL` is not required to correct its Preview callback. Use the exact branch-stable Preview domain for Google Cloud authorized redirect URIs and check any other origin-dependent settings before end-to-end tests.
