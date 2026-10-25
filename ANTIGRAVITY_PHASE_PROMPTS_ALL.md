# FestConnect — Antigravity Phase Prompts

Run prompts in order, one at a time. Do not run future phases until the current phase’s acceptance criteria pass. The separate files under `prompts/phases/` are canonical.


---

# Phase 00 — Reconnaissance and Implementation Plan

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

**Do not implement application features or scaffold files in this phase.** First assess the workspace and produce a validated plan.

1. List the current files/folders and determine whether the workspace is empty or contains existing code.
2. Read the docs and identify any conflicting or underspecified requirements.
3. Confirm that the starter chooses React/TypeScript, Express/TypeScript, MySQL, optional Redis, Nginx and Docker Compose. Treat this as the proposed stack; highlight that the group/guide must approve it if the course expects Java/Spring.
4. Define the project structure under `apps/web`, `apps/api`, `infra/nginx`, and relevant scripts/compose/migrations.
5. Audit the domain/table naming in the current docs and list the precise FA1 details that cannot be confirmed from the source currently in this workspace. Do not claim to have inspected a file that is not present/readable.
6. Produce an implementation roadmap covering frontend, API, DB, auth, teams, registration, payment, pass, email/Observer, cache, tests and Docker.
7. Identify risks: payment mock mode in production, authorization/ownership, duplicate registration, schedule-conflict logic, migration compatibility, missing Gmail credentials, cache stale data.
8. Confirm acceptance criteria for each phase from `docs/TODO.md`.

## Required output

- A concise repo inventory.
- A decision/assumption list and any genuine blockers.
- A phase-by-phase plan and main dependencies.
- No application code beyond optional notes to the docs.
- Update only the planning status/notes in `docs/TODO.md` and `PROJECT_MEMORY.md`.

Stop and wait for the user's go-ahead before Phase 01. Do not ask broad questions if a safe, documented assumption allows work to begin; only identify decisions that genuinely change the architecture.


---

# Phase 01 — Project Scaffold and Developer Experience

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

Create the minimum runnable monorepo baseline, without yet implementing business workflows.

## Requirements

1. Create `apps/web` as React + TypeScript + Vite and `apps/api` as Express + TypeScript. Use npm workspaces or a clearly documented root-script approach. Commit package lock files.
2. Set strict TypeScript settings. Add coherent `dev`, `build`, `typecheck`, `lint` and `test` scripts at root or document app-specific equivalents.
3. Add `.gitignore` for `.env`, build outputs, node_modules, logs and local artifacts. Add a complete `.env.example` with dummy/placeholders only.
4. Implement an API health route such as `/api/health` that returns non-sensitive JSON and a clear status. If DB readiness isn't implemented yet, distinguish liveness from readiness rather than returning a misleading “database connected” claim.
5. Add a minimal React shell with product name, navigation placeholder and a clear API connection/status placeholder. Do not implement fake business functionality.
6. Create folder placeholders/config for `infra/nginx`, migrations/seeds, tests and Docker Compose in later phases.
7. Keep `.env` out of git. Do not include real passwords or credentials.
8. Make local development commands simple and document them. Avoid adding libraries that aren't used.

## Acceptance criteria

- Both apps install from the repository root according to the README.
- API starts and health endpoint returns a valid JSON response.
- Web dev server starts and renders the shell.
- Typecheck and build pass for both apps; lint/test scripts exist and their current outcome is truthful.
- No business tables or payment features yet.

## Finish

Run the actual commands, summarize files changed and results, update TODO and PROJECT_MEMORY, list known blockers, and stop before Phase 02.


---

# Phase 02 — MySQL Schema, Migrations and Demo Seed

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

Implement versioned MySQL schema migrations and safe development seed data, preserving the FA1 logical entities.

## Domain schema

At minimum map the following FA1 concepts to MySQL tables: `PARTICIPANT`, `EVENT`, `EVENT_COORDINATOR`, `TEAM`, `TEAM_MEMBER`, `SCHEDULE`, `REGISTRATION`, `PAYMENT`, `PASS_RECEIPT`. A technical account/auth table may be added if required, and must be documented as an additive implementation table, not falsely attributed to FA1.

Prefer portable lower-case snake_case physical table names and document the mapping to the logical FA1 names. Before choosing exact columns, inspect any source material present. If the exact FA1 attributes are not in the repository, use a minimal additive schema based on `docs/DESIGN.md` and record the assumptions; do not remove expected concepts.

## Requirements

1. Add versioned SQL migrations and a migration runner; no manual-only database setup.
2. Define PK/FK, NOT NULL, appropriate unique constraints and indexes. Consider uniqueness of `(team_id, event_id)` in registrations only if consistent with the stated one-registration-per-team-per-event rule.
3. Use `DECIMAL` for currency, clear timestamp policy (UTC), and documented status fields/enums.
4. Define team membership uniqueness and unique payment transaction/pass numbers where appropriate.
5. Add technical auth identity/role mapping without letting public signup select `COORDINATOR` or `ADMIN` roles.
6. Add safe demo seed for events, participants, coordinator and admin accounts. Credentials must be hashed. Seeds must be disabled/refuse to run in production and must be repeatable. Only print or document dummy local credentials in a clearly local-only manner.
7. If MySQL is unavailable, still write migration SQL and database tests that can be run once the service exists; do not claim a migration passed unless run.
8. Add a data dictionary in `docs/DESIGN.md` for fields/relationships created by the implementation and explain what was inferred vs confirmed from FA1.

## Acceptance criteria

- A blank local MySQL database can be migrated to the schema using documented commands.
- Seed script is idempotent/safe for demo use and refuses production mode.
- FK and uniqueness constraints encode agreed business rules.
- No real secrets or plaintext password storage.

Finish with actual migration/seed test output, update TODO and PROJECT_MEMORY, and stop before Phase 03.


---

# Phase 03 — Backend Foundation and Authentication

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

Implement a secure Express API foundation and user authentication with roles. Do not yet implement full team/registration/payment workflows.

## Required layers

- `routes/` or equivalent: versioned endpoints.
- `controllers/`: HTTP input/output only.
- `services/`: domain/application decisions.
- `repositories/`: parameterized MySQL SQL.
- `middleware/`: authentication, authorization, validation, errors and request limits.
- `config/`: validated environment configuration.
- `types/` or schemas: request/response contracts.

Keep the architecture simple and consistent with docs; no microservices.

## Required endpoints

- `POST /api/v1/auth/register` — public participant registration only.
- `POST /api/v1/auth/login`.
- `POST /api/v1/auth/logout`.
- `GET /api/v1/auth/me`.
- `GET /api/health` and readiness endpoint where feasible.

## Security requirements

- Hash passwords and compare hashes on login.
- Enforce `PARTICIPANT`, `COORDINATOR`, `ADMIN` roles server-side.
- No public admin/coordinator signup. Use seed/admin-controlled role assignment only.
- Prefer secure HttpOnly cookies with SameSite settings, Secure in production, and Origin/CSRF protection for write requests; if selecting a different auth scheme, document its trade-offs.
- Configure Helmet/security headers, request size limits, login throttling and safe validation.
- Never return password hashes or secret configuration.
- Use a consistent JSON error shape and correct status codes.
- Add API tests for successful signup/login/logout, invalid credentials, role denial and unauthenticated protected routes.

## Acceptance criteria

- Public registration creates only a participant account and related profile according to schema.
- Demo coordinator/admin can be seeded in non-production mode.
- Backend ownership/role checks are reusable for later phases.
- Tests, typecheck and build pass.

Record the exact auth method and tests in PROJECT_MEMORY and docs, then stop before Phase 04.


---

# Phase 04 — Event Catalogue and Coordinator Schedule Management

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

Implement event listing/detail and authorized coordinator event management, preserving the FA1 `Event` and `Schedule` concepts.

## API requirements

- `GET /api/v1/events` — public listing with validated search/category filters and pagination.
- `GET /api/v1/events/:eventId` — public detail.
- `POST /api/v1/events` — coordinator/admin only.
- `PUT /api/v1/events/:eventId` — if full replacement is supported, define it correctly.
- `PATCH /api/v1/events/:eventId` — partial update.
- `DELETE /api/v1/events/:eventId` — guarded; reject if deletion violates existing registration/business rules.
- Preserve schedule fields/relation in `Schedule`; do not collapse it into Event if FA1 separates it.

## Requirements

1. Use controller/service/repository boundaries and schema validation.
2. Return consistent response contracts and suitable 200/201/204/400/401/403/404/409/422 status codes.
3. Ensure only authorized roles can create/edit/delete events or schedules.
4. Validate date/time ordering and event fields server-side.
5. Make event list/detail fit the future React UI and OpenAPI spec.
6. Add tests for list/detail, nonexistent ID, bad input, participant forbidden, coordinator create/update, and deletion guard.
7. Do not add real caching yet; cache phase is later.

## Acceptance criteria

- Seeded events appear in `GET /api/v1/events` and detail endpoint.
- Coordinator can create/update; participant cannot.
- API errors and OpenAPI are accurate.

Run tests/typecheck/build, update docs/TODO/PROJECT_MEMORY, and stop before Phase 05.


---

# Phase 05 — Teams, Membership and Registration

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

Implement teams/team members and the primary business workflow of registering a team for an event.

## Required APIs

- `POST /api/v1/teams`.
- `GET /api/v1/teams` and `GET /api/v1/teams/:teamId` if required by the UI; ownership rules apply.
- `POST /api/v1/teams/:teamId/members`.
- `DELETE /api/v1/teams/:teamId/members/:participantId`.
- `POST /api/v1/registrations`.
- `GET /api/v1/registrations` and `GET /api/v1/registrations/:registrationId` for authorized views.
- A narrow `PATCH` may support allowed cancellation transitions only; reject arbitrary client status changes.

## Registration service rules

1. Validate the event exists and is open/eligible.
2. Validate the requester belongs to the team and has the required leader/permission role.
3. Validate team membership and event-specific min/max team size.
4. Reject duplicate registration for the same team/event if FA1/business rules require uniqueness.
5. Check schedule conflicts using the `Schedule` domain/table and agreed rule.
6. Compute required fee on the server from event/registration data. Ignore any fee or status sent by the browser.
7. Store registration and initial payment-required state in a transaction.
8. Handle concurrent duplicate requests with a database constraint and convert duplicate-key errors into a stable `409 Conflict` response.
9. Keep participant/registration ownership checks in backend services/middleware.

## Tests

- Valid team creation and member add/remove.
- Add duplicate member rejected.
- Team-size limit enforced.
- Valid registration returns 201 and persists.
- Duplicate registration returns 409.
- Missing event/team and wrong owner handled correctly.
- Schedule conflict rejected where applicable.
- Transaction rolls back on persistence failure.

Update OpenAPI and UI contract docs to match implemented routes. Run tests/typecheck/build, update TODO and PROJECT_MEMORY, then stop before Phase 06.


---

# Phase 06 — Payment Factory, Adapter and Development Mock

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

Implement payment orchestration with the Factory and Adapter patterns while keeping the workflow safe for a student demo.

## Architecture

- `PaymentProcessor` interface defines payment operation contract.
- `PaymentFactory` chooses processor based on supported method/configuration.
- `PaymentGateway` interface isolates provider operations.
- `PaymentGatewayAdapter` translates the app contract into provider-specific calls.
- `MockPaymentGatewayAdapter` works only in local development/demo mode until a real provider is selected.
- `PaymentService` owns amount computation, status transition and persistence using `Payment` entity/repository.

Do not add Kafka or a microservices split.

## APIs

- `POST /api/v1/payments` — accepts registration ID and selected payment method; server computes amount.
- `GET /api/v1/payments/:paymentId` — authorized payment status.
- A mock-completion operation/button may be implemented only for `NODE_ENV=development` and `PAYMENT_PROVIDER=mock`. The route must not be registered/enabled in production.

## Non-negotiable safety rules

1. UI may never submit `paymentStatus=SUCCESS` as an authoritative result.
2. Payment starts as pending.
3. Success is set only by the verified adapter result. For mock demo mode, the mock adapter itself returns the result and backend guards prove mock mode is enabled.
4. Verify payment amount and registration association against database records.
5. Use idempotent state transitions so repeated callbacks/retries do not create duplicate payments or passes.
6. Do not include a real payment key or charge real money.
7. Display “Demo payment — no money is charged” in the UI when mock provider is active.
8. Ensure production startup refuses mock mode or mock-completion endpoints.

## Tests

- Payment attempt created with server-computed amount.
- Mock success/failure possible only in development configuration.
- Production-mode configuration rejects mock-completion route/flow.
- Client cannot spoof status/amount/owner.
- Repeated completion is idempotent.
- Failed/pending payment cannot generate a pass.

Update API docs, TODO and PROJECT_MEMORY with exact tests/results; stop before Phase 07.


---

# Phase 07 — Digital Pass and Observer-Based Email

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

Implement `PassReceipt` creation/retrieval and schedule-change email notification using Observer, plus a safe Gmail integration boundary.

## Pass requirements

- Use existing `PassReceipt`/pass receipt data concept from FA1.
- Generate only after server verifies that payment and registration satisfy the pass rule.
- Make pass creation idempotent. Enforce unique pass number/token and a unique registration link where business rule supports one pass per registration.
- Never allow public pass enumeration. `GET /api/v1/registrations/:registrationId/pass` must check owner/role and state.
- Use a non-guessable pass reference/QR payload; do not treat the QR itself as authorization for private APIs.

## Observer and email design

- `ScheduleObserver` interface defines schedule-change reaction.
- `ScheduleService` persists valid changes, then notifies observers.
- `EmailNotificationObserver` finds affected registrations/participants and requests delivery.
- `EmailService` interface has `ConsoleEmailAdapter` (local default) and `GmailSmtpAdapter` (only if environment credentials are present).
- Nodemailer/Gmail uses environment variables; never commit any credential.
- If credentials are absent, show “Email preview generated in server logs” and not “Email sent”.
- Email delivery failure must not roll back a committed schedule or verified payment. Capture/return a safe failure and allow retry/preview without a message broker.
- No Kafka, worker fleet or service split; keep Observer delivery straightforward for this demo.

## Acceptance tests

- Paid/eligible registration gets exactly one pass.
- Pending/failed payment does not produce a pass.
- Another participant cannot retrieve the pass.
- Schedule changes notify affected participants after persistence.
- Console adapter produces safe preview without credentials.
- Gmail adapter requires configured credentials and has testable failure handling.
- Repeat observer invocation doesn't create duplicate passes or falsely duplicate core business state.

Update OpenAPI/UI docs, TODO and PROJECT_MEMORY; stop before Phase 08.


---

# Phase 08 — Complete React UI and API Integration

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

Build a cohesive React frontend that exercises the implemented API. Do not create fake success states or store business state only in the browser.

## Required screens

1. Event discovery `/events` with search/filter, event cards, fee/date/team-size info and loading/empty/error states.
2. Event detail `/events/:eventId` with registration action.
3. Login and participant sign-up.
4. Participant dashboard/my registrations.
5. Team list/detail/create and member management.
6. Registration flow selecting event/team and showing server validation.
7. Payment/status screen. Clearly show “Demo payment — no money is charged” for mock mode.
8. Digital pass screen available only after API confirms entitlement.
9. Coordinator dashboard with event create/update/delete and schedule details.
10. Role-aware navigation and unauthorized/error handling.

## API integration

Use API client helpers with typed request/response shapes. Credentials/session behavior must match backend auth. Always handle pending, success, empty and error states. Disable duplicate submit while requests are in flight. Map 409 conflict and 422 validation responses into understandable messages.

Expected core endpoints include:
- `GET /api/v1/events`, `GET /api/v1/events/:eventId`.
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- Team and membership endpoints.
- `POST /api/v1/registrations`, authorized registration reads.
- `POST /api/v1/payments`, `GET /api/v1/payments/:paymentId`.
- `GET /api/v1/registrations/:registrationId/pass`.
- Coordinator event/schedule endpoints.

## Design requirements

- Follow `docs/DESIGN.md`: clean college-tech aesthetic, green primary actions, responsive layout and accessible labels.
- Reuse components for EventCard, FormField, StatusBadge, Alert, LoadingState, TeamMemberList, PaymentStatusPanel and PassCard where sensible.
- Do not claim Gmail delivery when using console preview.
- Don't place secret/API provider keys in client environment variables.
- No mobile app; responsive web behavior is allowed.

## Acceptance criteria

A human can complete the documented demo path through real API calls; UI tests cover important components and error states. Run web build/typecheck/tests, report which flows were manually verified, update memory/TODO and stop before Phase 09.


---

# Phase 09 — Redis Cache, Invalidation and Security Review

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

Add cache-aside caching for public event data and perform a focused security/data-integrity review. Avoid adding unrequested infrastructure.

## Cache implementation

1. Use Redis for public event listing/detail only.
2. Use keys with normalized filters/IDs, e.g. `events:list:<queryHash>` and `events:detail:<eventId>`.
3. Use default 60-second TTL, configurable from validated env.
4. Invalidate event list/detail keys after event creation, update, deletion, schedule or visibility change.
5. Redis unavailable/time-out means fall back to MySQL; no public event endpoint should hard-fail only because cache is unavailable.
6. Do not cache participant private data, registration, payment, or personal pass responses.
7. Add tests for cache hit, miss, expiry/invalidation and Redis-down fallback.
8. Don't claim the cache improves response time unless a repeatable comparison has been run.

## Security review checklist

- Login rate limiting and hashed passwords.
- Auth and role middleware on every protected endpoint.
- Resource-ownership checks for teams/registrations/payments/passes.
- Public participant signup cannot create admin/coordinator accounts.
- Zod/route validation for every input.
- Parameterized SQL only.
- No secrets in source, response, logs or frontend bundle.
- Secure cookie/Origin/CSRF measures consistent with selected auth strategy.
- CORS restricted appropriately; request body size limits and security headers.
- No client-controlled payment success, amount, owner or pass entitlement.
- Production mode rejects mock-payment simulation.
- Error responses don't leak stack traces or SQL.

## Acceptance criteria

Tests prove both expected cache behavior and security denials. Redis is optional for startup/demo and the application falls back safely. Update `docs/TRD.md`, `docs/ARCHITECTURE.md`, TODO and PROJECT_MEMORY if code choices changed. Stop before Phase 10.


---

# Phase 10 — Automated Tests, Docker Compose and Integration Verification

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

Make the current codebase reproducibly runnable locally and verify the fullstack workflow.

## Docker requirements

- Frontend container serves the production React build through Nginx.
- API container runs the Express TypeScript build.
- MySQL container has an explicit persistent volume and health check.
- Redis container is optional to business correctness; include if the cache phase implemented it.
- Use environment variables for connection/configuration. Commit only `.env.example` placeholders.
- Use a private Compose network for internal dependencies. Do not expose MySQL publicly by default.
- Nginx serves frontend and proxies `/api/` to API. Document that a one-instance local compose setup does not prove horizontal scaling.
- Define service health/dependency behavior so API does not race MySQL startup.
- Provide migrations/seed instructions that work on a fresh DB.
- Never use destructive commands against an unknown or production database.

## Testing requirements

- Run API unit/integration tests and frontend tests.
- Run lint, typecheck and production builds.
- Start Compose from a fresh local state (only after checking data loss implications); run migrations and seeds.
- Verify health endpoints and main API routes.
- Manually or with Playwright test: sign in → browse events → create team → add member → register → complete mock payment → verify DB state → open pass → preview email.
- Test schedule edit and Observer/email preview if coordinator flow exists.
- Test failure cases: bad login, unauthorized event edit, duplicate registration, invalid team size, schedule clash, failed payment, pass before payment, other-user pass access, Redis unavailable.
- Confirm mock payment mode and endpoint are unavailable when `NODE_ENV=production`.

## OpenAPI and docs

Check that `openapi.yaml`/Swagger contract is synchronized with actual API routes. README must document local setup, test commands, demo accounts, mock payment caveat and email preview behavior accurately.

## Acceptance criteria

A fresh local setup follows README successfully and the integration path passes. Record exact commands and actual outcomes. Update TODO and PROJECT_MEMORY. Stop before Phase 11.


---

# Phase 11 — Demo Polish and Handover

## Instructions for Antigravity

You are implementing FestConnect in the currently open workspace. Read `AGENTS.md`, `PROJECT_MEMORY.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/TODO.md` and `docs/DEVELOPMENT_RULES.md` before acting. Follow `AGENTS.md` as persistent project rules.

Use the chosen stack unless Phase 00 discovers an actual blocker: React + TypeScript + Vite; Node.js LTS + Express + TypeScript; MySQL; Redis optional; Nginx; Docker Compose. This is a Layered Architecture / modular monolith, not microservices. Preserve the FA1 domain classes and relationships. If exact FA1 columns differ from the proposed design, preserve FA1 and make only documented additive changes.

Work only on this phase. Inspect existing files before editing; do not destroy or replace working code unnecessarily. Prefer small, clear changes. Run applicable tests, type checks, lint and build commands. Do not claim success unless the commands were actually run and passed. Update `docs/TODO.md` and append a truthful phase entry to `PROJECT_MEMORY.md`. Report blockers rather than silently inventing facts. Do not start the next phase automatically.


## Task

Prepare FestConnect for a reliable academic demonstration and handover. Do not add new scope unless needed to fix a verified issue.

## Requirements

1. Inspect every user journey in `docs/PRD.md`; mark actual implemented status in `docs/FEATURES.md` and `docs/TODO.md`.
2. Ensure README setup is accurate from a clean checkout: prerequisites, environment creation, start commands, migration, seed, test commands and URLs.
3. Document local demo accounts and passwords only if safe demo credentials are intentionally seeded. Label them local-only; never use them in production.
4. Document demo payment behavior and show clear “no money is charged” messaging.
5. Document email behavior: console preview by default, Gmail delivery only when correctly configured.
6. Ensure no missing environment variable fails with an actionable message and no secret is printed.
7. Check accessible UI details, blank/error/loading/success states and responsive layout.
8. Validate OpenAPI file syntax and route accuracy.
9. Verify that architecture diagrams/docs do not call application modules microservices, and the exact class/table/resource names are consistent.
10. Create `docs/DEMO_SCRIPT.md` describing a repeatable walkthrough, expected results, negative tests and known limitations.
11. Add a `docs/KNOWN_LIMITATIONS.md` listing unimplemented real payment, no production scaling evidence, Gmail credentials requirement, any open FA1 column reconciliation and any untested edge cases.
12. Make no claims about load/security/performance tests unless they were executed; include real test results.

## Final acceptance report

Provide:
- Feature status (implemented/partial/not implemented).
- Commands run and actual pass/fail output.
- Steps to run the app and access each role.
- End-to-end demo result.
- Security and data-integrity verification summary.
- Known limitations and recommended next tasks.
- Final update to `PROJECT_MEMORY.md` and `docs/TODO.md`.

Stop after producing the handover report; do not start another feature phase.
