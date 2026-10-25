# Implementation TODO and Phase Tracker

**Rule:** Mark `[x]` only after Antigravity provides evidence (command output, test, or manual verification). The starting status of every item is incomplete.

## Phase 00 — Reconnaissance / plan
- [x] Read `AGENTS.md` (noted missing, rules supplied in prompts/DEVELOPMENT_RULES.md), `PROJECT_MEMORY.md` and all docs.
- [x] Inspect repository state and identify existing code before modifying (confirmed 9 markdown docs, zero code).
- [x] Confirm backend stack with group/guide; this pack proposes Express + TypeScript (Node v24, Docker v29 verified).
- [x] List unresolved FA1 schema fields and assumptions (absence of reference/ folder documented).
- [x] Produce phase plan and risk list; no application code yet.

## Phase 01 — Scaffold
- [x] Create frontend/backend workspace (`apps/web`, `apps/api`), shared config, scripts and ignore rules (`.gitignore`, root `package.json`).
- [x] Add `.env.example`, validated configuration and basic health route (`GET /api/health` returning truthful liveness & unconfigured readiness).
- [x] Add placeholder README setup instructions and quality scripts (`dev`, `build`, `typecheck`, `test`, `lint`).
- [x] Typecheck/lint/build baseline passes (`npm run typecheck`, `npm run test` [5/5 passed], `npm run build` [tsc & vite build: 0 errors]).

## Phase 02 — MySQL schema
- [x] Translate exact FA1 entities/relations into versioned SQL migrations (`001_initial_fa1_schema.sql` reconciled from `ER Diagram.drawio` and `UMl_Project_final.drawio`).
- [x] Add only necessary auth/technical fields/tables; document extensions (`password_hash`, `role`, Data Dictionary in `DESIGN.md`).
- [x] Add foreign keys, unique constraints and indexes (`uk_team_event`, `uk_team_participant`, `uk_payment_success_registration`, `uk_pass_registration`, `uk_pass_payment`, `idx_team_name`).
- [x] Audit & remediate payment retries: support multiple attempts, virtual generated column `success_registration_id` enforces single SUCCESS per registration.
- [x] Audit & remediate pass receipt: dual foreign keys (`registration_id`, `payment_id`), enforces pass generation after verified payment (`generate(teamId, paymentId)`).
- [x] Audit & remediate team leader: canonical team creator/leader represented by `team.leader_id`, `team_member.role` reflects functional role.
- [x] Audit & remediate deletion behavior: `ON DELETE RESTRICT` protects financial (`payment`) and ticket (`pass_receipt`) records from accidental cascade loss.
- [x] Audit & remediate reset/seed safeguards: `assertDisposableDatabase()` blocks execution in production, on production-named databases, or on non-local hosts.
- [x] Establish canonical migration source of truth: `apps/api/src/db/migrations/` is canonical; `infra/mysql/migrations/` is synchronized replica.
- [x] Fresh migration and reset/seed tests pass (30/30 tests pass across workspaces; schema DDL, retry idempotency, FKs, types, and connection checks validated).
- [x] Final Live MySQL 8 Database Verification passed: verified against live MySQL 8.4 container (`db.live.test.ts` 10/10 tests pass, duplicate registration/membership rejection, failed payment retry, single-success unique virtual column, ON DELETE RESTRICT protection, migration runner idempotency 1st & 2nd run, repeatable seeds, and resetDatabase execution).


## Phase 03 — API foundation and authentication
- [x] Express app, config validation (`getEnv()` with Zod), TRD-compliant error envelope, request validation middleware (`validateBody`, `validateQuery`, `validateParams`), auth middleware (`authenticate`, `requireAuth`, `requireRole`).
- [x] Registration (`POST /api/v1/auth/register`), login (`POST /api/v1/auth/login`), logout (`POST /api/v1/auth/logout`), current user (`GET /api/v1/auth/me`), health/readiness (`GET /api/health`, `GET /api/ready`).
- [x] Roles (`PARTICIPANT`, `COORDINATOR`, `ADMIN`) server-enforced; public registration restricted to PARTICIPANT only; coordinator profiles linked to `event_coordinator`; CSRF protection for cookie mutations.
- [x] Auth and security tests pass: 70 total tests passing (67 API tests + 3 Web tests), including 19 dedicated security invariant tests in `tests/security.test.ts` verifying HS256 algorithm enforcement, claims validation, production JWT_SECRET strength, Double-Submit CSRF cookie protection with `timingSafeEqual`, Bearer bypass defense, readiness failure detection (503), and production error redaction. OpenAPI 3.0.3 specification updated in `docs/openapi.yaml` and mirrored at project root.

## Phase 04 — Events and schedules
- [x] Public list/detail routes and filters: `GET /api/v1/events` (paginated, filtering by `event_type`, `status`, `search`), `GET /api/v1/events/:id` (complete event details + schedules).
- [x] Coordinator and Admin event CRUD: `POST /api/v1/events` (authorized coordinator/admin creation, coordinator boundary enforcement, server-authoritative ownership), `PATCH /api/v1/events/:id` (partial updates, validation, min/max team size validation, cross-coordinator mutation prevention).
- [x] Schedule management: `GET /api/v1/events/:id/schedules`, `POST /api/v1/events/:id/schedules`, `PATCH /api/v1/events/:id/schedules/:scheduleId` with start/end time validation (`start_time < end_time`), event existence verification, and coordinator ownership checks.
- [x] Frontend event and schedule discovery: React + Vite responsive UI (`EventList`, `EventDetailModal`, `EventFormModal`, `ScheduleFormModal`), category/status filters, keyword search, loading/error/empty states, role-aware management actions, demo user switcher.
- [x] Unit/API and UI tests pass: 106 tests passing monorepo-wide (97 API tests across 8 test suites including 30 in `event.test.ts` + 9 Web tests across 2 test suites). Typecheck, build, and lint passing with 0 errors. OpenAPI 3.0.3 specification updated in `docs/openapi.yaml` and mirrored at root `openapi.yaml`.

## Phase 05 — Teams and registration
- [x] Team CRUD/read + add/remove team member: `POST /api/v1/teams`, `GET /api/v1/teams`, `GET /api/v1/teams/:id`, `DELETE /api/v1/teams/:id`, `GET /api/v1/teams/:id/members`, `POST /api/v1/teams/:id/members`, `DELETE /api/v1/teams/:id/members/:participantId`.
- [x] Team leader invariance & consistency: Server-enforced `team.leader_id` and `team_member.role = 'LEADER'`; leader cannot be removed or leave without transferring or disbanding; transactional team creation enrolls leader automatically.
- [x] Registration service and transactional persistence: `POST /api/v1/registrations`, `GET /api/v1/registrations`, `GET /api/v1/registrations/:id`, `PATCH /api/v1/registrations/:id` (cancellation). Initial state is server-authoritative `PENDING_PAYMENT`.
- [x] Duplicate, team-size, membership, event availability and schedule conflict checks: Enforces event status (`ACTIVE`/`UPCOMING`), team size bounds (`min_team_size` <= count <= `max_team_size`), duplicate registration rejection (409), and multi-member schedule time-window overlap collision detection (400).
- [x] Frontend screens & components: Responsive Teams tab (`TeamList`, `TeamDetailModal`), Registrations tab (`RegistrationList`), Event Registration modal (`RegisterEventModal`), status badges, real-time validation, and tab switching.
- [x] Integration and UI tests pass: 143 total tests passing monorepo-wide (128 API tests across 9 test suites including 31 in `team.test.ts` + 15 Web tests across 3 test suites including 6 in `Team.test.tsx`). Typecheck, build, and lint passing with 0 errors. Both OpenAPI 3.0.3 specifications (`docs/openapi.yaml` and `openapi.yaml`) synchronized and identical.

## Phase 06 — Payment Factory and Adapter
- [x] PaymentGatewayAdapter interface, MockPaymentGatewayAdapter (simulating SUCCESS, FAILED, PENDING outcomes), and PaymentFactory selecting provider based on `PAYMENT_PROVIDER` env variable.
- [x] Mock gateway allowed only in development/testing/demo; PaymentFactory and adapter strictly reject mock operations in production (`NODE_ENV === 'production'`).
- [x] Server-authoritative payment amount derived strictly from trusted event registration fee (`event.registration_fee`); client-provided amounts and statuses rejected.
- [x] Atomic transactional transitions: payment attempt created as PENDING, processed via adapter, and on verified SUCCESS atomically transitions registration to CONFIRMED.
- [x] Concurrency and idempotency protection: row-level locking (`SELECT ... FOR UPDATE`), single-success unique constraint (`uk_payment_success_registration`) on virtual generated column `success_registration_id`, and attempt number tracking.
- [x] Payment endpoints implemented: `POST /api/v1/registrations/:id/payments`, `GET /api/v1/registrations/:id/payments`, `POST /api/v1/payments`, `GET /api/v1/payments/:id`.
- [x] Frontend payment experience: `PaymentModal` with "Demo Payment — No Real Money Charged" disclosure, simulated outcome selector, dynamic retry flow on failure, disabled duplicate submission, and integration with `RegistrationList`.
- [x] Full test suite passing: 176 total tests monorepo-wide (156 API tests across 10 test suites including 28 in `payment.test.ts` + 20 Web tests across 4 test suites including 5 in `Payment.test.tsx`). Typecheck, build, and lint passing with 0 errors. Both OpenAPI 3.0.3 specifications (`docs/openapi.yaml` and `openapi.yaml`) synchronized and identical.

## Phase 07 — Pass and Observer/email
- [x] PassReceipt generated only after verified payment: server-authoritative generation verifies `registration.status = 'CONFIRMED'` and presence of verified `SUCCESS` payment; transactional row-locking (`SELECT ... FOR UPDATE`), database constraints `uk_pass_registration`, `uk_pass_payment`, `uk_pass_number`, and `ON DELETE RESTRICT` protect integrity.
- [x] Pass endpoints verify ownership/role: `GET /api/v1/registrations/:id/pass`, `POST /api/v1/registrations/:id/pass`, `GET /api/v1/passes/:id`, and gate verification `POST /api/v1/passes/verify` check authentication, role-based access, and cryptographic HMAC-SHA256 signatures with timing-safe validation.
- [x] ScheduleObserver and EmailNotificationObserver: Gang-of-Four Observer Pattern implemented with `ScheduleSubject`, `ScheduleObserver`, and `EmailNotificationObserver`. Schedule updates atomically notify observers, querying confirmed participants for the event and dispatching alerts.
- [x] Console email preview; optional Gmail SMTP adapter: Email Adapter pattern with `EmailFactory`, default zero-dependency `ConsoleEmailAdapter` printing ASCII formatted email previews, and `GmailSmtpAdapter` using nodemailer when valid credentials exist.
- [x] Email failure handling, notification retry endpoints, and tests completed: email delivery operates asynchronously and decoupled from database transactions; notification errors are suppressed with clear logging and never rollback payments or invalidate passes. Implemented `POST /api/v1/passes/validate`, `GET /api/v1/registrations/:id/notifications/email`, and `POST /api/v1/registrations/:id/notifications/email` with duplicate-send cooldown protection. Full suite of 219 passing tests monorepo-wide (192 API tests across 11 test suites including 36 in `pass.test.ts` + 27 Web tests across 5 test suites including 7 in `Pass.test.tsx`). Both OpenAPI 3.0.3 specifications (`docs/openapi.yaml` and `openapi.yaml`) synchronized and identical.
- [x] Phase 07 Security & Reliability Hardening Complete:
  - Persistent email notification state and audit history in MySQL via migration `002_email_notifications.sql` (`email_notification` and `email_notification_attempt` tables) with atomic `INSERT ... ON DUPLICATE KEY UPDATE` to eliminate InnoDB gap-lock deadlocks on concurrent retries.
  - Cryptographic QR security hardened with dedicated `PASS_HMAC_SECRET` enforced in production (>= 32 chars, non-default), full 64-hex HMAC-SHA256 signature, timing-safe verification, and state validation of pass, registration, and payment.
  - Resource-level authorization audit: Coordinator scope strictly gated by event assignment (blocks cross-event coordinators with 403), team membership enforced, and recipient email derived server-authoritatively.
  - Contract alignment: Notification statuses standardized to `DELIVERED`, `FAILED`, `NOT_SENT` across API, Web (`PassModal`), and OpenAPI specs. OpenAPI specifications (`openapi.yaml` and `docs/openapi.yaml`) synchronized with identical SHA256 hashes (`78269EEA32393E52EC04A08FFE9B678C9FD91E4F0C0BE316CF07E08D207CC4B1`).
  - Total automated tests passing: 235/235 tests monorepo-wide (208 in API across 11 suites including 49 in `pass.test.ts` and 22 in `security.test.ts`, and 27 in Web across 5 suites). All typecheck, lint, build, and test checks passing.

## Phase 08 — React screens
- [x] Event listing/detail: Comprehensive responsive event discovery (`/events`) with search/filter by event type and status, pagination, and dedicated `/events/:id` view (`EventDetailScreen`) displaying description, rules, schedules timeline, coordinator contact information, and registration CTA.
- [x] Auth and role-aware navigation: `AuthScreen` (`/login`, `/register`) supporting both Sign In and Sign Up with validation, role demo switcher buttons, and persistent auth session; responsive top navigation bar dynamically adapts based on authenticated role (`PARTICIPANT`, `COORDINATOR`, `ADMIN`); catch-all 404 screen (`*`) handles unmatched routes.
- [x] Team creation/membership: Dedicated teams view (`/teams`) using `TeamList` and `TeamDetailModal`, enabling team creation, member roster inspection, email-based invitations, and leader transference/leave handling.
- [x] Registration/payment/pass journey: End-to-end journey integrating `ParticipantDashboard` (`/dashboard`, `/registrations`), `RegisterEventModal` with server-side validation, `PaymentModal` with "Demo Payment — No Money Charged" notice and mock outcome selector, and dedicated `PassScreen` (`/pass/:id`) displaying official pass number, QR code data URL, event/venue info, email notification status with resend action, and `window.print()` print capability.
- [x] Coordinator event/schedule dashboard: Dedicated `CoordinatorDashboard` (`/coordinator`) strictly restricted to `COORDINATOR` and `ADMIN` roles (403 Forbidden Access Denied guard for participants); features coordinated event CRUD, schedule management modal, registrations and passholders roster, and live Gate Pass Verifier scanner tool (`POST /api/v1/passes/verify`) with rejection of forged passes.
- [x] API error/loading/empty/success handling; UI tests pass: Clear states across all screens; 37 tests passing in `@festconnect/web` (including 10 in `tests/Screens.test.tsx`), 231 tests passing in `@festconnect/api` (including 23 in `tests/verification.checks.test.ts`); monorepo total 268/268 tests passing. `npm run typecheck`, `npm run lint`, and `npm run build` all pass with 0 errors.
- [x] Phase 08 Pre-Acceptance Verification Checks Completed:
  - Check A (Demo Credentials & Role Switching): Gated via `isDemoMode` in `env.utils.ts` (`import.meta.env.DEV`), completely hidden in production builds; backend enforces server-authoritative role assignment (public registration forced to `PARTICIPANT`, claims verified via JWT).
  - Check B (Backend Authorization Guards): Backend routes return HTTP 403 Forbidden for participants attempting event/schedule/pass-verification mutations; coordinators blocked with 403 from editing or validating events they do not coordinate.
  - Check C (End-to-End Participant Workflow): 12-step test executes complete user registration -> team creation -> member addition -> event registration (PENDING_PAYMENT) -> pass 404 block -> failed payment retry -> success payment (CONFIRMED) -> pass generation with visual QR -> pass direct retrieval -> email delivery & cooldown -> gate approval.
  - Check D (Data Correctness & Screen/API Mappings): `/pass/:id` maps directly to underlying `registration_id` for email notifications; participant dashboard strictly isolates registrations and teams to member rosters; coordinator screens isolate events and registrations to assigned events.
  - Check E (Usability & Responsive Layout): CSS media queries (`max-width: 768px`, `max-width: 640px`) handle mobile header stacking, nav wrapping, single-column grid collapses, scrollable tables, and full-viewport modals; dedicated `@media print` styles clean pass cards for physical ticket printing.

## Phase 09 — Redis caching and DB tuning
- [x] Cache-aside event list/detail with 60-second TTL: Implemented `RedisCacheService` and `NoopCacheService` with `ioredis`; caches public event catalog (`festconnect:events:list:*`), event details (`festconnect:events:detail:<id>`), and schedules (`festconnect:events:schedules:<id>`) with configurable TTL (default 60s via `CACHE_DEFAULT_TTL_SECONDS`).
- [x] Invalidation and cache-down fallback tests: Mutations in `EventService` (`createEvent`, `updateEvent`) and `ScheduleService` (`createSchedule`, `updateSchedule`) deterministically invalidate affected event detail/schedule keys and list patterns using non-blocking SCAN (`festconnect:events:list:*`); silent fallback to MySQL on any Redis error/outage without 500s or service disruption.
- [x] Review SQL plans/query indexes and constraints: Added migration `003_database_tuning.sql` introducing composite performance indexes: `idx_event_coordinator_id` on `event(coordinator_id)`, `idx_event_type_status` on `event(event_type, status)`, `idx_schedule_event_timeline` on `schedule(event_id, event_date, start_time)` (eliminates filesort), and `idx_registration_event_status` on `registration(event_id, status)`. Canonical migration replicated in `infra/mysql/migrations/`.
- [x] No sensitive or state-critical public caching: Zero private participant, team, registration, payment, authentication, or pass-validation responses written to Redis; authoritative state queries continue to query MySQL with row-level locks and transactions.
- [x] Full test suite passing: Dedicated Phase 09 test suite `tests/cache.test.ts` (12 tests) passing; monorepo total **280/280 tests passing** across 19 test files (243 in `@festconnect/api` and 37 in `@festconnect/web`). `npm run typecheck`, `npm run lint`, and `npm run build` all passing with 0 errors.
- [x] Phase 09 Final Audit complete: Verified invalidation rules across all mutation routes; verified deterministic key normalization and TTL; confirmed database tuning indexes via live `EXPLAIN` (eliminating filesort and row-filtering overhead); audited Redis connection lifecycle and graceful error fallback; converted placeholder lint commands to strict compiler checks (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`); documented production-scale limitations. Stop before Phase 10 preserved.

## Phase 10 — Docker / integration / security verification
- [x] Dockerfiles for web and API; Compose includes web, API, MySQL, Redis.
- [x] Persistent database volume; health checks and service dependencies.
- [x] Fresh compose startup, migrations, seeds and API tests pass.
- [x] Auth, authorization, payment/pass rules and input-security tests pass.
- [x] Local email preview works without Gmail credentials.

## Phase 11 — Final demo/handover
- [x] README setup/demo/troubleshooting accurate.
- [x] OpenAPI is accurate and importable (`docs/openapi.yaml` and `openapi.yaml` synchronized, 35 endpoints).
- [x] Demo seed accounts work and are clearly local-only (`adwait@festconnect.edu`, `coordinator@festconnect.edu`, `admin@festconnect.edu`).
- [x] Main workflow manually verified in live containerized browser session (`scratch/verify-live-container.mjs` 12/12 passed).
- [x] Screenshots/demo script (`docs/DEMO_SCRIPT.md`), viva defense (`docs/VIVA_QUESTIONS_AND_ANSWERS.md`), and limitations (`docs/KNOWN_LIMITATIONS.md`) documented.
- [x] Full FA2 Submission Dossier created in `docs/FA2_SUBMISSION_DOSSIER.md` mapping to all 6 rubric criteria (10/10 marks).
- [x] Event & Workshop Date Scheduling Enhancement: Added integrated date, time slot, and venue picker into `EventFormModal.tsx` allowing coordinators to configure calendar dates directly upon event/workshop creation.
- [x] Remote Repository Push: Codebase committed and pushed to GitHub repository (`https://github.com/adwaitkamble/Fest-Connect.git`) with strictly preserved `.gitignore` exclusion for `.env`.
- [x] PROJECT_MEMORY.md updated with verified final status.

## Blockers / decisions
- Confirm whether backend stack is allowed by guide (proposed: Node.js/Express/TypeScript).
- Verify exact FA1 field names and relationships before final SQL migration.
- Choose actual payment provider only if the group has sandbox credentials; until then use the mock adapter.
- Gmail credentials optional; console preview is the default for local demo.
