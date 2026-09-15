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
19. Preserve every user-opened or agent-opened browser tab during testing. Do not close a tab unless the user explicitly asks to close that exact tab; preserve OAuth tabs and their in-progress state across checks, and use a new tab only when a new attempt is genuinely required.

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

- The protected deployed `main` checkpoint still has the original Google Drive OAuth callback behavior. The corrected implementation is deployed only to the development Preview; its OAuth return and isolated credential persistence have been verified. The production database had no saved Google credential/resource record for the test user at its earlier inspection time.
- The development Preview's Google card shows Connected only for an app-managed credential saved after a successful Drive `about.get` check; an independent file-list request and long-term refresh behavior still need verification.
- Email, AI, Condition, Custom Webhook, Google Calendar, generic Trigger, and generic Action nodes are primarily or entirely frontend-only.
- Existing published workflows are not reliable end-to-end automations; observed graphs include unsupported AI nodes and incomplete templates/configuration.
- The development branch now has durable linear run/step history, per-Drive-change deduplication, explicit failed/interrupted-run replay, and action-level credit reservation. It still lacks branching, resumable per-run waits, provider-delivered idempotency for every external write, and authenticated Drive-trigger end-to-end proof; production `main` does not have the branch implementation.
- The branch now implements Google disconnect, reconnect/change-account, account labeling, refresh-token rotation, revocation, and truthful reconnect-required state. Multi-account behavior and equivalent lifecycle controls for the other providers remain.
- Some server actions may still lack adequate resource-ownership checks. The local branch now requires an unguessable per-schedule token for the legacy cron resume route; it still needs a full per-run resume design and integration verification.
- Google OAuth state on this working branch is signed, user-bound, short-lived, and deployed to the Preview; its return and credential save are verified. Broader Drive automation E2E, secure token storage, and failure recovery still require work.
- Credits/billing behavior is incomplete and can render invalid values when Stripe configuration is unavailable.
- Templates remain incomplete; Logs now has durable run-history UI on the development branch but lacks full operational controls and end-to-end run verification.
- Dependencies include known vulnerabilities and an old Next.js release; upgrades require a separate compatibility-tested phase.

## Connected inspection capabilities

- Neon: direct read-only database access verified; account/control-plane access depends on tools exposed in the active Codex session.
- Neon project: `SaaS Automation Builder` (`green-wildflower-23474607`). Default/production branch: `production` (`br-restless-term-ah4cwkbf`). Isolated development branch: `codex-phase-1-foundation` (`br-patient-hat-ahz29gaz`), created from production HEAD and verified ready. Writes to the child branch do not change the production parent.
- Vercel: read access verified for team `Aman Nigam's projects`; the only currently visible project is `saa-s-automation-builder-g9kv`. Authorization is team/account scoped rather than guaranteed project-only scope.
- Google Drive, Gmail, and Google Calendar: read access verified and all use the same test Google account as the application database user. The email address is intentionally omitted here.
- Clerk MCP: public, stateless SDK guidance only. It cannot access the Clerk Dashboard, users, sessions, secrets, or production logs.

## Original eight-phase roadmap (canonical)

The complete Phase 1–8 definitions below are copied from the user's confirmed roadmap. Its original present-state section is historical; use the live status below for current progress.

## Remaining implementation phases

### Phase 1 — Finish and verify the foundation

- Complete authenticated localhost Google Drive OAuth.
- Test connection, reconnect, disconnect, expired-token refresh, and revoked-access states.
- Regression-test Discord, Slack, and Notion with controlled test actions.
- Add automated tests for authentication, ownership, OAuth state, graph validation, and publishing.
- Resolve the Prisma migration baseline cleanly on the isolated Neon branch.
- Produce a Vercel Preview deployment before touching production.

This phase makes the existing supported subset trustworthy.

### Phase 2 — Durable automation engine

This is the most important missing backend work.

Add:

- `WorkflowRun` and `WorkflowStepRun` records.
- Run states such as queued, running, succeeded, failed, waiting, cancelled, and safely halted.
- Stored inputs, outputs, timestamps, and sanitized errors per step.
- Retry policies with exponential backoff.
- Idempotency keys so duplicate webhooks cannot repeat actions.
- Timeouts and rate-limit handling.
- Resumable execution after server restarts.
- Secure cron/webhook execution endpoints.
- Manual “Run now” and replay-failed-run functionality.
- Correct credit consumption based on successfully executed action steps.

Zapier’s comparable product provides run statuses, automatic replay, manual replay, troubleshooting, and alternate error-handling paths. [Zapier run recovery](https://help.zapier.com/hc/en-us/articles/8496037690637-How-to-troubleshoot-errors-in-Zaps), [custom error handling](https://help.zapier.com/hc/en-us/articles/24143756334093-Customize-how-your-Zap-runs-if-it-encounters-an-error)

### Phase 3 — Real no-code workflow semantics

Implement the capabilities that make the canvas more than a visual sequence:

- Typed input/output schema for every node.
- Field picker containing outputs from preceding steps.
- Variables and expressions such as trigger file name, email subject, AI result, or event time.
- Test-step and fetch-sample-data functionality.
- Conditions for text, number, boolean, date, existence, and list values.
- `AND`/`OR` condition groups.
- True/false branches and multi-path workflows.
- Filters that halt runs when data does not match.
- Formatter/transform steps for text, dates, JSON, numbers, and lists.
- Real waits: fixed delay, delay-until time, and resumable scheduling.
- Looping over list items with safety limits.

Zapier distinguishes filters, which stop a run, from paths, which route it through different outcomes. [Zapier filter and path rules](https://help.zapier.com/hc/en-us/articles/8496180919949-Filter-and-path-rules-in-Zap-workflows), [Paths](https://help.zapier.com/hc/en-us/articles/8496288555917-Add-branching-logic-to-Zap-workflows-with-Paths)

### Phase 4 — Complete the advertised integrations

Implement the currently visible nodes in this order:

1. **Gmail/email**

   - Send email.
   - Create draft.
   - New-email trigger.
   - Sender, recipient, subject, label, and attachment filters.
   - Decide whether generic transactional email should use Gmail or a dedicated provider such as Resend.

2. **Google Calendar**

   - Create/update/delete event.
   - Upcoming-event and new-event triggers.
   - Calendar selection, attendees, timezone, reminders, and conflict handling.

3. **Google Drive**

   - New/updated file trigger.
   - File/folder selection.
   - Upload, move, rename, copy, share, download, and metadata actions.
   - Correct subscription renewal because Google notification channels expire.

4. **Custom webhooks**

   - Unique inbound webhook URL per trigger.
   - Test payload capture and schema inference.
   - HMAC/signature verification options.
   - Outbound HTTP action with method, headers, query, body, timeout, and safe secret fields.

5. **AI action**

   - Prompt and system-instruction configuration.
   - Previous-step variables.
   - Structured JSON output.
   - Summarize, classify, extract, generate, and route modes.
   - Model/provider selection, limits, retries, token/cost tracking, and redacted logs.
   - Gemini can be the first provider; its key should remain server-side.

6. **Slack, Discord, and Notion hardening**

   - Test connection/action buttons.
   - Dynamic channel/database selection.
   - Account details and reconnect/disconnect parity.
   - Better API-error and permission messages.

### Phase 5 — Triggering and scheduling

- Cron-based schedules: minute/hour/day/week/custom timezone.
- Polling triggers for providers without webhooks.
- Webhook lifecycle registration and removal on publish/unpublish.
- Renewal jobs for expiring subscriptions.
- Trigger deduplication and cursor/checkpoint storage.
- Missed-event recovery.
- Concurrency controls and per-workflow throttling.
- Pause/unpause and manual trigger functionality.

For production reliability, long waits should be persisted and resumed rather than keeping a server request alive.

### Phase 6 — Connection management

Create one consistent integration contract:

- Connect.
- Connected-account identity and granted permissions.
- Test connection.
- Reconnect.
- Change account.
- Disconnect/revoke.
- Permission-expired and refresh-failed states.
- Optional multiple accounts per provider.
- Choose which connected account a node uses.
- Encrypt OAuth credentials at rest.
- Audit connection changes without exposing tokens.

This should reuse the current Google card patterns instead of redesigning the Connections page.

### Phase 7 — Operational UI

Complete the currently weak product surfaces:

- Workflow run-history page.
- Run-detail timeline with each step’s input, output, duration, attempts, and error.
- Search and filters by workflow, date, trigger, and status.
- Retry/replay and cancel controls.
- Connection-health alerts.
- Dashboard metrics: successful runs, failures, time saved, and task usage.
- Useful notifications for failed workflows and expired connections.
- Workflow versioning, duplication, import/export, and safe draft/published separation.

### Phase 8 — Recruiter-ready product polish

- Create 5–8 verified demonstration workflows, for example:

  - New Drive résumé → AI extraction → Notion candidate record → Discord alert.
  - Important Gmail → AI summary → Slack notification.
  - Incoming webhook lead → condition branch → email + Calendar follow-up.
  - Scheduled daily digest → Gmail/Calendar aggregation → AI summary.
  - Drive file uploaded → conditional routing based on file type.

- Add guided templates built only from working nodes.
- Seed a safe demo account and test data.
- Fix credits/billing fallback behavior.
- Add onboarding, empty states, permission errors, and recovery guidance.
- Stage dependency and Next.js upgrades separately.
- Measure and fix actual query waterfalls and slow API paths.
- Add accessibility, responsive, security, and full browser E2E checks.
- Document architecture, tradeoffs, real-world use cases, screenshots, and a demo video.

Current position: **Phase 2 in progress**, with Phase 1 Google Drive connection verification still partially open. A separate authenticated Drive file read, expired-token refresh, and reconnect/disconnect/revocation tests belong to **Phase 1** and should be completed before calling its connection work fully verified. The Drive change → durable run → Logs test exercises **Phase 2's engine**, while full Drive node behavior belongs to **Phase 4** and subscription lifecycle/renewal to **Phase 5**. Account-management standardization/encryption belongs to **Phase 6**. Use only this original eight-phase numbering for planning and status.

## Current pass

- Date: 2026-09-13 (Asia/Calcutta)
- Status: Original eight-phase roadmap **Phase 2 is in progress**, while Phase 1 Google OAuth callback and credential persistence are verified on the isolated Preview/Neon branch. Google returned to Connections, its account details appeared, and a credential row for the expected Fuzzie user exists without exposing token values. The callback returned 307 rather than the prior Clerk 401/null. The actual Drive capability check (`drive.about.get`) ran before the successful credential save. An independent `files.list` call, token refresh after expiry, reconnect/disconnect/revocation, and detailed first-navigation behavior after Google's redirect are not yet end-to-end verified. Phase 2 durable run history is implemented but not end-to-end verified; complete Drive node work is Phase 4 and subscription lifecycle is Phase 5 in the original roadmap.
- Next verification target: complete a safe authenticated Drive file-list read on Preview and connection lifecycle tests (Phase 1), then test a controlled Drive change, notification, run, and Logs history on isolated resources (Phase 2 engine with a provisional Drive trigger). Do not publish or message through inherited incomplete workflows. Later Phase 2 work still includes retry/idempotency and recovery; full Drive node semantics and subscription renewal belong to Phases 4 and 5. Do not alter production or `main`.
- Commit/push status: `codex/phase-1-foundation` and its origin are at `dcbce77f7dc0d4275d1dfd3b6e75d2e18a3b527e` (`Bind Google OAuth callback to signed user state`). `main` remains at the protected checkpoint. This file has local post-deployment verification updates not yet committed; no other source edit is pending.
- Deployment status: branch Preview `dpl_84EH7EYuEqW4tM8mJBjX3D28Nasw` is READY at the stable branch alias. Vercel Authentication/Standard Protection remains restored. No merge, production deployment, or production alias change performed.

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

### 2026-09-12 — Development branch push and Preview runtime diagnosis

- Committed and pushed only `codex/phase-1-foundation` at `f110ebdeae355ec77f8a9204544540c848c599ac` after lint, TypeScript, two optimized builds, staged whitespace and secret-shaped-text checks. The Vercel Git Preview `dpl_9QuNtA5GgzgxDNmCiKz35qYrMWHt` completed successfully and is READY. Its stable branch alias is `https://saa-s-automation-build-git-4b59b5-aman-nigams-projects-1baaa79c.vercel.app/`. The protected `main` commit and production alias were not changed.
- With the user's explicit approval, added the branch alias's `/api/auth/callback/google` URI to the existing Fuzzie Google Cloud OAuth client. Revisited the client details and confirmed all four redirect URIs are present; the Clerk, production, and localhost entries remain. Google warns configuration propagation may take time.
- Opened the protected Preview using temporary Vercel access and signed in as the authorized test account through Clerk's Google sign-in. `/dashboard` rendered an authenticated session. Navigating to `/connections` produced a server exception. Deployment-scoped Vercel runtime logs show Prisma rejecting `DATABASE_URL` before any SQL query: the runtime value does not start with `postgresql://` or `postgres://`. This is a malformed or incorrectly scoped Preview environment value, not evidence of an OAuth callback or schema failure. Do not reveal the secret or change the existing All Environments production value. Correct only the Preview-branch override, redeploy only the Preview, then revisit `/connections` and `/logs` before any database-writing or Drive test.
- No app-managed Drive OAuth callback, Drive watch, Drive file, workflow run, or provider action was performed in Preview. No production database or production deployment was changed.

### 2026-09-12 — Corrected Preview redeploy and access boundary

- The user corrected the Preview-branch `DATABASE_URL` without editing the production-wide variable and redeployed only the Preview. Vercel reports `dpl_Gun9ateezAFLSZjESaKERxJNH15U` READY, sourced from `codex/phase-1-foundation` commit `f110ebd`; its stable alias still targets the branch Preview. The secret value was not inspected or recorded.
- A fresh in-app browser visit to the protected branch alias led to Vercel login. Attempting the temporary share-link method was rejected by the safety reviewer as an unapproved deployment-authentication bypass; do not retry indirectly. Browser E2E requires the owner to sign into Vercel through that in-app browser, or an explicitly approved access method. Do not infer database runtime correctness merely from READY status.
- Read-only Neon query on isolated branch `br-patient-hat-ahz29gaz` still found zero app-managed Google credentials, zero workflow runs, and three migration ledger entries. No Drive OAuth, watcher, or workflow write was made, and no source or production change was performed in this check.

### 2026-09-12 — Protected Preview browser and OAuth verification

- The user signed into the Vercel owner account in the in-app browser. Opened the stable protected Preview alias normally, with no temporary share link. Clerk recognized the test account; authenticated `/connections` rendered all four provider cards, and `/logs` rendered its empty-run state. The prior malformed-`DATABASE_URL` Prisma exception is absent, supporting that the corrected Preview runtime can query the isolated schema.
- Started app-managed Google Drive OAuth from Preview. Google selected the authorized test account, displayed the branch Preview client, and reached the broad Drive consent screen. The user had already approved this test-account consent; clicked Allow. The browser remained on the consent screen. A separate direct, code-free request to the exact Preview callback URL in the controlled in-app browser returned `net::ERR_BLOCKED_BY_CLIENT`; Vercel recorded a callback 401 at the same stage but the app callback did not complete. Treat this as an in-app browser callback/access boundary, not proof of a Clerk or application defect. Do not retry with leaked authorization codes or weaken middleware.
- Read-only isolated Neon query after the attempt still found zero `LocalGoogleCredential` and zero `WorkflowRun` rows. No watcher, Drive file, provider action, or workflow run was created. Next, have the user complete the same Preview OAuth flow in normal Chrome, then verify DB persistence and proceed with controlled tests.

### 2026-09-12 — Normal Chrome OAuth callback blocked by Preview protection

- The user completed Google's consent in normal Chrome. The browser reached the stable Preview `/api/auth/callback/google` URL but displayed `null`; the user-shared URL contained a single-use authorization code, which must not be reused, logged, or copied into tests. The latest Preview Vercel runtime logs show GET callback requests returning HTTP 401 at `edge-middleware`, with no handler execution evidence. A read-only isolated Neon query still found zero `LocalGoogleCredential` and zero `WorkflowRun` rows.
- Read-only Vercel project settings show `Require Log In` checked with `Standard Protection`. Vercel's documentation states this protects Preview URLs and authenticates every request before Routing Middleware. This is strong evidence that deployment protection is intercepting the cross-site Google callback, not a demonstrated application/Clerk defect. A Vercel-authenticated Chrome session might be worth one low-risk retry if not already established, but do not repeat old authorization codes. A temporary Preview-protection change affects all Preview URLs and requires explicit action-specific approval; production's public domain would remain unchanged. No protection setting or source code was changed during this diagnosis.

### 2026-09-13 — Temporary Preview protection test window and restoration

- The user explicitly approved temporarily disabling Vercel Authentication to test the Preview OAuth callback, with restoration afterward. On the project Deployment Protection settings, changed `Require Log In` from checked to unchecked, confirmed Vercel's warning that all deployments would become publicly accessible, and saved. A separate page load confirmed it was off. No production branch, deployment, or domain setting was changed.
- The user did not complete a fresh Drive OAuth callback in that window. A read-only isolated Neon check still found zero app-managed Google credentials and zero workflow runs. When the browser's Vercel owner session expired, requested the user to sign in again rather than leaving protection off indefinitely. After reauthentication, restored `Require Log In` with `Standard Protection`, saved, reloaded the settings page, and verified the checkbox remained checked. This closes the temporary public-exposure window.
- No source change, Google Drive file, Drive watcher, workflow execution, or provider message resulted. Any further protection-off test must be tightly coordinated while the user is ready in normal Chrome, with immediate restoration afterward.

### 2026-09-13 — Coordinated Chrome Drive retry; callback still blocked

- With the user ready on the exact stable branch Preview `/connections` URL, temporarily turned off project Vercel Authentication, saved, and observed `Require Log In` unchecked. The user retried Google Drive Connect in normal Chrome and approved consent. Chrome again displayed JSON `null` at the callback. Deployment-scoped Vercel logs at 06:25:15 UTC show `GET /api/auth/callback/google` returning HTTP 401 from `edge-middleware`, while the connect route returned 307 and Connections rendered 200. No callback serverless execution is visible in those logs.
- Immediately restored `Require Log In` with `Standard Protection`, saved, and verified the checkbox checked and Save disabled. Thus the temporary exposure is closed. No app source, production branch/deployment, or database setting was changed for this retry. Do not retain or reuse any OAuth authorization code from Chrome screenshots.
- **Correction to earlier diagnosis:** a callback 401 also occurred during the protection-off window, so do not assert Vercel Authentication is the sole cause. Need distinguish Vercel edge protection propagation/domain behavior from Clerk middleware using safe response headers/network evidence (especially `X-Clerk-Auth-Reason`) or a carefully controlled code-free probe before touching middleware. The current `publicRoutes` entry for the Google callback remains unchanged. Google OAuth token exchange and Drive credential persistence are still unverified.

### 2026-09-13 — Chrome response headers identify Clerk interstitial boundary

- User's preserved Chrome Network trace for the Preview Google callback shows HTTP 401, `Content-Type: application/json`, `X-Clerk-Auth-Reason: uat-missing`, and `X-Clerk-Auth-Status: interstitial`; the response body rendered as JSON `null`. Request carried the app's `google_oauth_state` cookie and a Clerk `__session` cookie. Do not record, copy, or share the screenshot's OAuth code, cookie values, or JWTs; they are sensitive. Consider signing out/restarting the test session after diagnostics.
- Exact installed `@clerk/nextjs@4.29.9` implementation in `node_modules/@clerk/nextjs/dist/cjs/server/authMiddleware.js` calls `authenticateRequest` before checking `publicRoutes`; for an interstitial API request, it calls `handleUnknownState`, which invokes `NextResponse.json(null, { status: 401 })` and adds the Clerk observability headers. This matches the browser response precisely. Thus `publicRoutes` is present and correctly matched in source but **cannot bypass Clerk's earlier interstitial/UAT check** for this callback. `src/app/api/auth/callback/google/route.ts` itself has no 401/null response path. This identifies the failing boundary more strongly than the earlier Vercel-protection hypothesis; do not change `publicRoutes` to `ignoredRoutes` merely to bypass it, because the handler calls `auth()`.
- Google returned to the exact authorized HTTPS Preview callback, so a Google `redirect_uri_mismatch` is not the observed failure. The callback was stopped before state validation, token exchange, Drive API calls, or credential upsert. Need a secure redesign or Clerk-specific session recovery that binds OAuth state to the initiating authenticated user without depending on the Clerk development-instance UAT cookie surviving Google's cross-site redirect; inspect current Clerk deployment/session guidance and test only on the isolated Preview/Neon branch. No code changed during this diagnosis.

### 2026-09-13 — User-bound Google OAuth callback fix

- At the user's request, implemented the narrowly scoped callback fix on `codex/phase-1-foundation`; no UI, Slack, Discord, Notion, schema, production configuration, or `main` change. The authenticated Connect route now issues a random OAuth state plus a 10-minute, HttpOnly, SameSite=Lax, host-only cookie containing the initiating Clerk user ID and expiry, HMAC-signed with a purpose-derived key from the existing server-only Google client secret. The Google callback is the sole additional Clerk-ignored route; it verifies signature, returned state, and expiry before token exchange, then associates the credential with the signed initiating Fuzzie user ID. It does not call Clerk `auth()` or `currentUser()` on the cross-site return. Invalid/missing state fails closed. The OAuth cookie is cleared with its original callback path, and callback errors no longer log potentially sensitive provider error objects.
- The Google credential upsert preserves an existing User's profile fields instead of fetching Clerk during the callback. If the Clerk webhook has not yet created a User, it uses the existing placeholder profile convention; the webhook remains responsible for profile synchronization. This removes one Clerk network dependency on the return path; Google profile and Drive checks remain parallel, followed by the necessary database writes. No new environment variable, dependency, migration, or extra database query was added.
- Verified `node node_modules/typescript/bin/tsc --noEmit`, Next lint (only pre-existing React-hook warnings), and a complete optimized Next production build. Focused state checks passed for valid state, mismatch, wrong signature key, and expiry. A temporary local production server on port 3100 returned HTTP 307 to `/connections?google_error=invalid_state` for a missing-cookie callback, with `X-Clerk-Auth-Reason: ignored-route` rather than the prior 401/interstitial; that test server was stopped. `git diff --check` found no whitespace error.
- **Not yet verified:** a fresh authorized Google consent round trip, credential persistence on isolated Neon, Drive API/watch delivery, or workflow execution on a deployment containing this fix. The current Vercel Preview still runs commit `f110ebd` and does not contain these local edits. Do not claim the OAuth flow is fully repaired until a reviewed branch deployment and end-to-end test. Preview Vercel Authentication is restored to `Standard Protection`. No commit, push, redeploy, production/Neon write, or external Drive action was made in this fix pass.

### 2026-09-13 — Preview deployment and Google Drive OAuth return verified

- After local TypeScript, lint, optimized production build, focused state checks, and diff/secret-shape review, committed and pushed only `codex/phase-1-foundation` at `dcbce77f7dc0d4275d1dfd3b6e75d2e18a3b527e`. `main` remains at `c83ec6550dbddc0acbafa6d3ac1593b8584b06b1`. Vercel Git Preview `dpl_84EH7EYuEqW4tM8mJBjX3D28Nasw` is READY for that exact commit on the stable branch alias; no production deployment or settings were changed.
- User completed a fresh Google consent flow in normal Chrome and showed `/connections?google_connected=true`; the existing Google card showed Connected, the Google account email, Reconnect, and Disconnect. Vercel deployment runtime logs show `GET /api/auth/callback/google` returning 307 rather than the previous Clerk 401/null. A separate Connections middleware request returned 401 and later Connections requests returned 200, but these logs alone do not establish which browser action caused each request. The callback log was categorized `[error/edge-middleware]` alongside a Node `url.parse()` deprecation warning; no failed callback response was reported in that entry.
- Read-only query on the isolated Neon branch `br-patient-hat-ahz29gaz` confirmed exactly one app-managed `LocalGoogleCredential` joined to the expected Fuzzie Clerk user, with matching Google account email/name and nonempty access and refresh tokens. Their values were neither queried nor logged. This verifies callback routing, token exchange, and credential persistence. It does **not** yet prove Drive API reads, watcher delivery, workflow execution, or Logs history. No production database write was made.
- User's Chrome Network screenshots show a `GET /connections?google_connected=true` document returning HTTP 200 OK with `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`; page assets loaded. The user stated that the 200 requests shown after the 307 in the Vercel view came from reloading, so do **not** claim they prove the first automatic post-callback navigation succeeded. The newly supplied Vercel screenshot selects `GET /api/auth/google/connect` with `_rsc` and `Prefetch: Yes`: its 307 is a Connect-route prefetch, **not** the Google callback. The callback's separate 307 comes from the deployment runtime logs at 07:22:53 UTC. Credential persistence is independently verified in isolated Neon; Drive-triggered automation remains untested.

### 2026-09-13 — Phase 2 run recovery and action-level accounting

- Added an additive isolated-branch migration for `WorkflowStepRun.retryable`, `creditCharged`, and a safe error classification code. It was applied and verified only on Neon branch `br-patient-hat-ahz29gaz`; the migration ledger contains the matching source checksum. Production schema and rows were not changed.
- Drive notifications still deduplicate one provider event per workflow at the database boundary, but no longer deduct one credit for a whole notification batch. Before each configured Discord, Slack, or Notion action, the runner atomically reserves one available credit (or accepts `Unlimited`) and records that reservation on the step. A malformed or unsupported existing workflow fails before charging a credit.
- Existing completed steps are never automatically replayed. Failed, paused, and stale interrupted runs have an explicit owner-scoped Logs retry control; it resumes at the first incomplete action and creates a later attempt record. Timeout and 429-rate-limit failures are labeled for review rather than blindly re-sent: Discord and Notion writes cannot be proven idempotent with the current provider APIs, so automatic replay could duplicate an external side effect. Provider requests now have a 10-second deadline.
- Added owner-scoped `Run now` to existing workflow cards and re-enabled their existing publish switch through the already-present server-side publish validation. Both controls require the saved graph/provider configuration and preserve the existing frontend design patterns.
- Verification completed locally: Prisma format and validation, generated Prisma client without replacing the localhost-locked engine, TypeScript `--noEmit`, Next lint (only pre-existing hook warnings), optimized Next production build, and diff whitespace check. The production build is source/schema validation only; the Drive listener, Drive API list, a harmless Drive change, provider action delivery, and Logs E2E remain to be verified on the next Preview deployment. No Google Drive file, Slack/Discord message, Notion page, or production resource was created or changed in this pass.

### 2026-09-13 — Phase 2 Preview Drive-trigger verification

- Verified the corrected Preview runtime end-to-end against isolated Neon only. The Google connection was already persisted; creating the Drive listener stored its resource ID, private channel token, and page cursor in the isolated branch. No token value was read or recorded.
- A clearly named, blank test Google Doc was created in the connected test Drive. While Vercel Authentication was enabled, the public webhook address returned a Vercel SSO redirect, so Google could not reach the application. This was confirmed by the absence of a notification request in the Preview logs.
- With explicit approval, Vercel Authentication was disabled briefly for the Preview test only. The public endpoint then returned its expected `405` to a read-only HEAD probe, a fresh Drive document change produced `POST /api/drive-activity/notification` with HTTP 200, and isolated Neon recorded Drive-triggered durable runs and step histories. The Logs UI rendered those runs and their safe errors. Existing inherited published test workflows contain unsupported `AI` or no executable actions, so their runs correctly failed before any provider call or credit reservation; no Slack, Discord, Notion, or other provider action occurred.
- Exercised the Logs retry control on one intentionally failed `AI` step. It added attempt 2 to the same run without rerunning earlier steps or charging a credit. This proves the Phase 2 recovery control and action-level accounting behavior on Preview.
- Restored Vercel Authentication with Standard Protection immediately after the test and confirmed the public webhook once again returns Vercel's SSO redirect. Production was not changed.
- Google documents that `changes.watch` channels default to one hour and must be renewed by creating a replacement channel. Channel renewal scheduling and a full subscription lifecycle remain Phase 4/5 work; this pass does not represent them as complete.

### 2026-09-14 — Protected Preview listener continuation

- Vercel's project-level Protection Bypass for Automation now has a generated secret designated as the server-side `VERCEL_AUTOMATION_BYPASS_SECRET` system variable. Its value was not shown, copied, stored in source, Neon, or this document. The existing listener registration code only appends it for `VERCEL_ENV=preview`; production behavior remains unchanged unless separately designed and approved.
- The existing refresh control was only reachable from a Google Drive node in the workflow editor. The isolated test data has no saved Drive node, so no workflow was altered just to refresh a channel. Added a small client-only Google Drive action group to the connected Connections card, providing the same authenticated `POST /api/drive-activity?renew=true` operation beside Reconnect and Disconnect. The parent card remains server-rendered, preserving server-generated Slack, Notion, and Discord OAuth URLs.
- TypeScript validation passes. The direct Next production build compiled successfully and reached its type-validation stage; the standard Yarn build shim was unavailable under the alternate shell identity. The later entry records the completed Preview deployment and protected Drive notification test.

### 2026-09-14 — Protected Preview Drive notification verified

- Committed and pushed the Connections lifecycle control as `88058de8a82d1a95ead32fcdb825ccfab15e1612` on `codex/phase-1-foundation`. Vercel Preview `dpl_FbGdX7xHBrjA17AnAP3P93fGdoXk` is READY on the stable branch alias. `main`, the production deployment, and production Neon remain unchanged.
- In the authenticated protected Preview, selected **Refresh listener**. The listener registration returned HTTP 200 and Google immediately sent its standard synchronization notification to `/api/drive-activity/notification`, which returned HTTP 200 while Vercel Authentication remained enabled. This verifies that the generated server-only automation bypass is present in the Google watch address and does not require disabling Preview protection.
- Created one clearly named blank Drive test document, `Fuzzie Protected Preview Drive Test — 2026-09-14`. Its resulting notification returned HTTP 200 at 21:42:43 UTC; isolated Neon recorded one durable Drive-triggered run for each inherited published workflow at 21:42:44 UTC. The Preview Logs UI displayed the corresponding rows. As in the prior test, the inherited flows failed safely on unsupported AI/no-action graphs before any provider action or credit charge. The test document remains in the connected test Drive; it was not deleted.
- The Drive callback, credential persistence, listener renewal, protected receiver, durable run/step records, Logs visibility, retry behavior, and no-charge failure behavior are verified for the Phase 2 provisional Drive trigger. Automatic channel-renewal scheduling, full subscription lifecycle, and expanded Drive actions remain later Phase 4/5 work.

### 2026-09-14 — Provider OAuth callback hardening

- Replaced the Discord, Notion, and Slack browser-query credential handoff with signed, user-bound, ten-minute OAuth state cookies. Their Connect buttons now first use authenticated application routes; callbacks validate state, exchange the authorization code, persist the result server-side, clear the cookie, and redirect to Connections with only a non-sensitive success/error marker.
- Existing provider connection records are not deleted or revoked. A deliberate reconnect updates only the authenticated Fuzzie user's existing provider record, preserving the existing action paths and stored workflow configuration.
- This removes tokens and Discord webhook URLs from browser history, referrers, analytics, and application URLs. It does not claim encryption at rest: the roadmap's centralized credential encryption and connection lifecycle work remain Phase 6 and require a separate managed-key migration.
- TypeScript `--noEmit` and the optimized Next production build passed. Next lint completed with only pre-existing React Hook dependency warnings. Provider consent/reconnect testing still requires an explicit user action at the OAuth provider; do not perform a destructive disconnect/revoke merely to test it.

### 2026-09-14 — Discord Preview callback verification

- Preserved the existing Discord redirect and added the stable isolated Preview callback URI in the Discord developer portal. Its persistence was confirmed by a portal reload; no production callback or deployment setting was changed.
- With the user selecting the dedicated `SaaS Automation Test` server and its `#general` channel, Discord OAuth returned to Preview as `/connections?discord_connected=true`. The Connections UI then rendered Discord as Connected. The callback URL contained no provider access token or webhook URL, so the new server-side OAuth handoff is verified for Discord.
- No Discord message, workflow action, credential value, or production resource was accessed or changed during this verification.

### 2026-09-14 — Slack and Notion Preview callback preflight

- Opening the Preview Connect routes reached Notion's integration login and Slack's workspace sign-in, with the stable Preview callback URI included in each authorization request. Neither provider reported a redirect URI mismatch.
- No login, consent, workspace installation, message, page write, or credential persistence was performed. The Notion and Slack authorization tabs must stay open until the user completes their own login and explicitly approves the provider-specific consent screen.

### 2026-09-14 — Notion and Slack provider configuration blockers

- After an authenticated Notion retry, Notion rejected the stable Preview callback with `Missing or invalid redirect_uri`. The Notion integration configuration needs that exact Preview callback URI added while preserving the existing callbacks.
- Slack accepted the Preview callback request and recognized the signed-in test workspace, but its authorization page returned `invalid_team_for_non_distributed_app`. The current Slack app is restricted to a different development workspace; resolving this requires a deliberate Slack app-distribution or approved-workspace configuration decision, not an application-code change.
- No provider consent, Slack installation, workspace membership change, Notion write, or credential save occurred in these blocked attempts. Existing connected integrations remain untouched.

### 2026-09-14 — Notion Preview callback configured

- With explicit approval, added the stable Preview callback URI to the existing Notion OAuth connection without changing its prior callback, install scope, or capabilities. A reload of the Notion developer portal confirmed both callback URIs persist.
- A fresh Preview OAuth attempt now reaches Notion's workspace/page-selection consent screen rather than the previous redirect URI error. Final installation remains pending an explicit selection of the user-approved test page(s) and action-time consent.
- The user then authorized access to the named Notion testing space. The secure callback returned to Preview as `/connections?notion_connected=true`, and Connections rendered Notion as Connected. No Notion page was read or written as part of this verification.

### 2026-09-14 — Slack least-privilege hardening in progress

- The Slack action path uses the app's bot token for channel listing and message delivery; it does not use a user token. The Preview OAuth route now requests only the corresponding bot scopes and the callback stores no `authedUserToken`. The obsolete server action that accepted browser-provided Slack credentials was removed.
- Added an additive Prisma migration which makes `Slack.authedUserToken` nullable. Existing Slack records and their existing bot tokens are preserved. Prisma format/validation/client generation and TypeScript checks passed; lint has only the pre-existing React-hook warnings. The optimized Next build compiled and reached its lint/type-validation stage.
- Neon migration preparation identified an important scope mismatch: the plugin's temporary validation branch was created from the project default branch, not `codex-phase-1-foundation`. The one-column migration passed its temporary-branch nullability check, but it must **not** be applied through that prepared migration because it would target the wrong parent. No production or isolated Preview schema has changed in this pass. Apply the tracked migration only against the isolated branch using the normal Prisma migration ledger before a fresh Slack connection test.
- The Slack app remains intentionally undistributed. The dedicated owner workspace can be used for Preview testing after adding the stable Preview callback URI and the minimum `chat:write` bot scope, then reinstalling there. Public distribution is not required for this isolated test and is deferred for a later multi-workspace release review.

### 2026-09-14 — Slack migration applied to isolated Preview branch

- With explicit user approval, cancelled and deleted the plugin-created temporary migration branch because it had the project default branch as parent rather than the isolated `codex-phase-1-foundation` branch. No change was applied to that default/production-side branch.
- Applied `ALTER TABLE "Slack" ALTER COLUMN "authedUserToken" DROP NOT NULL` only to Neon branch `codex-phase-1-foundation`, then recorded the exact checksum of tracked migration `20260914093000_make_slack_user_token_optional` in its Prisma migration ledger. Read-back verification confirms the column is nullable and the ledger row is complete.
- **Production-release checklist:** when, and only when, the user approves the final merge/deploy to `main`, apply this same tracked Prisma migration to the production Neon database using a direct migration connection; preserve the existing production Slack callback URI; add/retain the deployed production callback URI; and perform a controlled production Slack reconnect to issue a bot token under the hardened flow. Preview-only callback URIs, Preview database state, and test installations do not become production configuration automatically.

### 2026-09-14 — Slack Preview redirect validation blocker

- Slack's OAuth settings accept the existing production Vercel callback, but reject both tested `*.vercel.app` Preview callback hosts locally with **“Please use a valid redirect URL”** before the URL can be added or saved. A benign control URL validates, so this is a Slack redirect-host policy/validation limitation rather than a malformed callback path, Next.js middleware response, or Vercel runtime error. The unsaved test input was cancelled; no Slack setting was modified.
- A protected Vercel Preview share link is not an appropriate OAuth redirect solution: it is temporary and cookie-based, while OAuth requires a stable, exact callback URI. Disabling Preview protection would not resolve the observed Slack URL validator and would unnecessarily expose the Preview.
- To complete an isolated Slack OAuth test, use an owned stable HTTPS subdomain (for example `preview.<owned-domain>`) mapped to the Preview deployment, then add that exact callback URI, add the already-required `chat:write` bot scope, and reinstall only in the existing owner test workspace. All three provider-console changes require user confirmation immediately before saving. This remains Preview-only; the production callback will be configured separately at final release.

### 2026-09-14 — Stable Preview domain validated

- Vercel now has `preview.blogs.amannigam.me` bound **only** to the `codex/phase-1-foundation` Preview environment. It is not bound to Production or `main`.
- With explicit user approval, added the Namecheap CNAME `preview.blogs` -> `9580de4d0030bd46.vercel-dns-017.com.`. Existing apex, `www`, and `blogs` DNS records were preserved.
- With explicit user approval, added the required `_vercel` TXT ownership-verification record. Both Namecheap records are visibly present, and Vercel now reports `preview.blogs.amannigam.me` as **Valid Configuration** for `codex/phase-1-foundation`.
- No `NEXT_PUBLIC_URL` change was made: all provider connect and callback routes pass the live request origin into `getCallbackUrl`, so the verified Preview hostname is selected directly and a redundant environment override could instead make callback selection less robust.

### 2026-09-14 — Google stable Preview callback configured

- With explicit user approval, added `https://preview.blogs.amannigam.me/api/auth/callback/google` to the existing Fuzzie Google OAuth client. The Clerk, production, localhost, and prior ephemeral Preview callback URIs were preserved.
- A Google Cloud console reload shows the new URI persisted. Google warns that redirect configuration propagation may take from several minutes to a few hours; do not treat OAuth runtime testing as conclusive until that propagation window has elapsed.

### 2026-09-14 — Slack Preview callback remains blocked by Vercel protection

- Slack rejected the stable `https://preview.blogs.amannigam.me/api/auth/callback/slack` before it could be added, so no Slack redirect URL or scope was changed.
- A direct HTTPS check shows the Preview hostname returns a `302` to Vercel SSO protection instead of reaching the callback route. Slack's documented OAuth flow requires a public HTTPS redirect URI; this is the remaining concrete blocker, not the URL syntax, the OAuth callback code, or application middleware.
- The safe next step is a temporary Preview-only Vercel Deployment Protection change so provider redirects can reach the isolated Preview deployment, followed by immediate restore after provider verification. Never alter Production protection or use this state for production callbacks.

### 2026-09-14 — Narrow stable Preview protection exception applied

- With explicit user approval, added Vercel's Deployment Protection Exception for **only** `preview.blogs.amannigam.me`. Other Preview URLs and Production protection remain unchanged.
- A direct callback check now reaches Fuzzie and returns its expected state-missing `307` redirect to Connections, rather than the prior Vercel SSO `302`. This confirms OAuth providers can reach the app callback. The exception must be removed after the Preview OAuth verification work is complete.

### 2026-09-14 — Slack redirect validator hostname constraint

- Slack still rejected `preview.blogs.amannigam.me` even after Vercel SSO protection was removed. An unsaved control check accepted `blogs.amannigam.me`, establishing that Slack's current validator rejects the nested Preview hostname rather than the HTTPS scheme, callback path, or live callback reachability.
- No Slack redirect URL or scope was saved. The viable stable Preview hostname is `preview.amannigam.me` (a single-label subdomain), to be added to Vercel and Namecheap as a separate Preview-only alias before resuming Slack OAuth configuration. Keep `preview.blogs.amannigam.me` available only until the replacement is verified, then remove its Vercel public-protection exception and later its DNS records with explicit approval.

### 2026-09-14 — Replacement Slack-compatible Preview domain validated

- The user configured `preview.amannigam.me`; Vercel confirms it is **Valid Configuration** and bound only to `codex/phase-1-foundation`. Existing root, blog, older Preview, and production domain bindings were not changed.
- With explicit user approval, added Vercel's Deployment Protection Exception for **only** `preview.amannigam.me`. A direct callback check returns Fuzzie's expected safe `307`, not Vercel SSO. Do not make it public broadly; later remove both old and replacement exceptions after Preview OAuth verification.

### 2026-09-14 — Slack hostname-validator diagnosis refined

- Slack's OAuth-settings form reproducibly displays **“Please use a valid redirect URL”** for `https://preview.amannigam.me/api/auth/callback/slack`. Two unsaved neutral controls (`fuzzie.amannigam.me` and `app.amannigam.me`) do not show that error, despite not being configured in DNS. This is an observed form-validation discrepancy only; it does **not** establish a Slack policy against `preview` labels. Slack's public documentation specifies HTTPS and matching behavior, and web research found no documented label restriction or matching public issue.
- All control inputs were cancelled immediately; no Slack redirect URL, OAuth scope, installation, token, or provider permission was changed.
- Do not create another hostname based only on this diagnosis. The next investigation should determine whether Slack's settings UI/session is faulty, whether the form's server-side save produces a more specific error, or whether a Slack support/manifest route is needed. Any persistent test must be explicitly approved first.

### 2026-09-14 — Preview public-access cleanup

- The user removed the redundant `preview.blogs.amannigam.me` Vercel domain binding, its matching Namecheap CNAME/TXT verification records, and its Google OAuth callback URI. The earlier ephemeral branch-Preview Google callback URI was also removed. These removals affect no Production domain, callback, or deployment.
- With explicit approval, removed the remaining Vercel Deployment Protection Exception for `preview.amannigam.me`. The exception table is now empty and Vercel Authentication remains Standard Protection; no Production setting changed.
- `preview.amannigam.me` itself remains bound exclusively to `codex/phase-1-foundation` for future protected Preview work. Its DNS, branch-scoped Preview `DATABASE_URL`, isolated Neon branch, and provider connection records are deliberately retained.
- With explicit user approval, deleted the 12 isolated `Google Drive` workflow-run test records from 2026-09-13. Their 9 dependent step-run records cascaded with the parent rows; read-back verified zero remaining test runs and zero step-run rows. No workflow, provider connection, credential, production row, or production branch was changed.
- With explicit user approval, permanently deleted the single blank Google Drive test document `Fuzzie Protected Preview Drive Test — 2026-09-14`. No other Drive file, credential, provider connection, workflow, or production resource was changed.
- Read-only post-cleanup provider review: Slack retains only its pre-existing production callback; no Preview callback, scope, reinstall, token rotation, PKCE setting, token, or Slack workspace permission was changed during this work. Notion still has the former ephemeral branch-Preview callback URI configured and requires a separate explicit deletion confirmation. Discord could not be reviewed because the Developer Portal session required login; no Discord setting was changed.
- Do not revoke provider grants, delete provider connection records, remove the retained `preview.amannigam.me` domain/DNS, or delete the isolated Neon branch as part of this cleanup unless the user explicitly requests it.

### 2026-09-14 — Minimal durable-run state foundation

- Added the minimal run states required for reliable scheduling and cancellation: `QUEUED`, `WAITING`, and `CANCELLED`. New durable runs are first written as `QUEUED` and atomically claimed as `RUNNING`, so an unclaimed row remains visible and recoverable instead of being represented as in-progress.
- Updated Logs to render these states and allow a queued run to be claimed through the existing owner-scoped retry control. Existing provider actions, credit reservation, workflow records, and UI layout were not redesigned.
- Applied tracked migration `20260914113000_add_durable_run_states` only to Neon branch `codex-phase-1-foundation`, then recorded its exact source checksum in the Prisma migration ledger. Read-back confirmed all seven run states and the completed ledger row. Production and `main` remain untouched.
- Manual recovery now reuses a prior reservation for the same failed action step, rather than deducting a second credit when retrying it. This preserves the existing cautious manual-retry policy for timeouts, rate limits, and other provider failures.
- Deliberately did **not** add a background automatic-retry worker: Vercel Cron cannot exercise it on Preview and sub-daily schedules require a paid Vercel plan. An unscheduled worker would be misleading. Automatic exponential backoff and restart-driven execution therefore remain intentionally deferred rather than partially implemented.
- Verified Prisma format/client generation, TypeScript `--noEmit`, and lint. Lint still has only the repository's existing React Hook dependency warnings.

### 2026-09-15 — Bounded rate-limit recovery and focused automated checks

- Replaced the earlier intentional deferral with a narrowly scoped, durable recovery path for **provider rate limits only**. A rate-limited action can schedule one protected retry after 5 minutes, then 15 minutes, then 60 minutes; after that it remains a visible manual-retry failure. Timeouts, ambiguous provider failures, and configuration errors are still never replayed automatically because their outcome may be uncertain.
- The one-time scheduler request has a random per-run token. Only its SHA-256 hash is stored in `WorkflowRun`; the callback uses a timing-safe comparison and atomically claims `WAITING` runs before resuming. It cannot be called by a browser session or reused after a claim. The external job is deleted after use and also cleaned up if database persistence fails.
- Automatic scheduling is deliberately restricted to a public HTTPS **Production** deployment (`VERCEL_ENV=production`). Localhost and protected Preview remain manual-only; this preserves Vercel Preview protection and avoids creating external jobs from test environments. A `WAITING` run also has an owner-scoped manual retry button, which cancels its pending external job first and is the fallback if that external job never fires.
- Added migration `20260915090000_add_workflow_retry_schedule` with retry time/count/job/token-hash fields plus a status/time lookup index. Applied it only to isolated Neon branch `codex-phase-1-foundation`, with source checksum `6d787d333ef0e5a4fff0f70d7355db978a7e55d9eb6545a1d81e82602306fb76` recorded in the Prisma ledger. Read-back verified all four columns, the index, and the ledger row. Production and `main` remain unchanged.
- Added five focused native Node tests covering signed OAuth state ownership, tampering/expiry/provider isolation, and executable workflow-graph boundaries. The project uses Node 22's built-in TypeScript stripping for these tests, so no test dependency was added. `prisma format`, client generation, TypeScript `--noEmit`, all five tests, lint, and `git diff --check` pass; lint retains only existing React Hook dependency warnings.
- **Production-release checklist:** retain a server-only `CRON_JOB_KEY` before enabling rate-limit recovery in Production, apply this tracked migration to production Neon only with final-release approval, and verify a harmless rate-limit/recovery path under production observability. Do not copy Preview callback state, database rows, domains, or provider grants to Production.
