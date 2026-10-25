# PROJECT MEMORY — FestConnect

> This file is the durable project context for Antigravity. Update it at the end of every phase. Keep confirmed facts separate from assumptions and implementation status.

## Project identity

- Name: FestConnect — A Centralized Technical Fest & Event Registration System.
- Subject: Object Oriented Modelling and System Design (OOMSD), code BCER27PC02.
- Guide: Shalu Mahajan.
- Members: Adwait Kamble (123B1D002), Shivam Kasodekar (123B1D024), Nikhil Puppalwar (123B1D040).
- Academic context: FA2 extends the same project/case study as FA1.

## Confirmed design decisions from project discussions

- Main architecture: Layered Architecture with a modular backend (not microservices).
- UI choice: React-based web UI; no mobile application in the initial scope.
- Database: MySQL.
- API versioning: URL prefix `/api/v1/`.
- Main domains: participants, events, coordinators, teams, team members, schedules, registrations, payments, digital passes/receipts.
- External integrations: payment provider (mock/sandbox for demonstration until a real provider is chosen) and Google Gmail for email when configured.
- Cache: Redis may be used for cache-aside public event listing/details with a proposed TTL of 60 seconds.
- Patterns required in the design: Factory, Adapter, Observer.
- Remove from initial scope: mobile app, Kafka/message broker, service registry, configuration server, dedicated CI/CD system, monitoring stack, separate centralized logging service, separate secrets-management product. Basic logging and environment-based secret configuration are still required.
- Workload numbers previously drafted are only planning assumptions: 1,500 participants, 25 active events, 250 peak concurrent visitors, 30 API requests/second, brief registration bursts of 5 attempts/second, and 5,000 registrations per fest cycle. Do not describe them as measured results.

## Selected implementation baseline for this starter pack

This is a proposed build choice because the available FA1 context did not fix a backend programming language/framework.

- Frontend: React + TypeScript + Vite.
- Backend: Node.js LTS + Express + TypeScript.
- Persistence: MySQL with versioned SQL migrations and explicit Repository/DAO modules using parameterized queries.
- Cache: Redis optional; the app must still work if cache is unavailable.
- Proxy/static serving: Nginx.
- Local orchestration: Docker Compose.
- Email: console preview by default; Google Gmail SMTP through environment variables when configured.
- Payment: mock adapter available only in development/demo mode until a real provider is selected and configured.
- Validation: Zod or an equivalent schema validator. Tests should use the actual framework and dependencies selected in `docs/TRD.md`.

## Existing FA1 domain names to preserve

`Participant`, `Event`, `EventCoordinator`, `Team`, `TeamMember`, `RegistrationManager`, `Schedule`, `Payment`, `PassReceipt`.

Logical relational names referred to in our project discussions:
`PARTICIPANT`, `EVENT`, `EVENT_COORDINATOR`, `TEAM`, `TEAM_MEMBER`, `SCHEDULE`, `REGISTRATION`, `PAYMENT`, `PASS_RECEIPT`.

For portability, physical MySQL table names may be lower-case snake_case (`participant`, `event`, etc.), but the mapping must be documented and consistent. Do not rename or drop existing conceptual relationships. If the original FA1 file supplies exact column names, preserve them and use additive migrations for technical needs.

## Main use case / demo path

1. Participant logs in.
2. Browses events: `GET /api/v1/events`, `GET /api/v1/events/{eventId}`.
3. Creates a team: `POST /api/v1/teams`.
4. Adds team members: `POST /api/v1/teams/{teamId}/members`.
5. Registers: `POST /api/v1/registrations`.
6. Initiates payment: `POST /api/v1/payments`.
7. Server verifies the mock/sandbox outcome; payment and registration states update in MySQL.
8. `PassReceipt` is created only after the payment condition is satisfied.
9. Retrieves pass: `GET /api/v1/registrations/{registrationId}/pass`.
10. Email is previewed locally or sent through Gmail if correctly configured.
11. Coordinator updates a schedule; Observer-based notification handling requests email delivery.

## API and security invariants

- Public GET event listing/details may be unauthenticated; all write operations require authentication and appropriate role.
- Roles planned: `PARTICIPANT`, `COORDINATOR`, `ADMIN`.
- A signed-in participant may access only their own account, team/registration/pass where applicable unless role policy explicitly allows otherwise.
- Event management and schedule changes require `COORDINATOR` or `ADMIN`.
- Never trust client-supplied amount, payment success, owner ID, pass ID, role, or registration status without server-side checks.
- Registration uniqueness should be enforced with application validation and a database unique constraint on `(team_id, event_id)` if consistent with the FA1 rule.
- Use database transactions for registration/payment/pass state changes that must remain consistent.
- Secrets belong in `.env` (ignored by git); commit only `.env.example` placeholders.

## Current implementation status

- Status: documentation and prompt pack preparation; codebase has not yet been implemented in this starter pack.
- No live payment gateway has been selected or configured.
- No Gmail credentials are available in this repository.
- No load tests or security tests have been run for the application.
- Do not state otherwise.

## Decisions / open items to confirm with the group

1. Verify exact FA1 attribute names and relationships against the original class and ER diagrams before finalizing migrations.
2. Confirm whether Node.js/Express/TypeScript is allowed by the course/guide. If Java/Spring Boot is required, revise `docs/TRD.md`, this file and all prompts before scaffolding.
3. Confirm the actual payment provider; otherwise keep the mock provider only for the demo.
4. Configure Gmail SMTP only when account/app-password settings are safely available; default to console preview.
5. Confirm event cancellation, refund, capacity and team-leader rules before enforcing them.

## Phase update log

- Initial context: created from project discussions and the chosen implementation plan. Code not yet generated.
- Antigravity must append each phase's date, completed work, tests, known issues and next step below.
- **2026-10-22 — Phase 00 (Reconnaissance) Completed:**
  - Inspected workspace: found 9 markdown documentation files at root (`PRD.md`, `TRD.md`, `DESIGN.md`, `FEATURES.md`, `TODO.md`, `DEVELOPMENT_RULES.md`, `ARCHITECTURE.md`, `PROJECT_MEMORY.md`, `ANTIGRAVITY_PHASE_PROMPTS_ALL.md`).
  - Confirmed missing items: `reference/` folder (raw FA1 diagrams/submission files), `docs/` and `prompts/phases/` subdirectories, `README.md`, `AGENTS.md`, and any application source tree.
  - Verified local environment: Node.js `v24.13.0`, npm `11.6.2`, git `2.55.0`, Docker `29.4.0`.
  - Identified core architecture baseline: Modular monolith with React + Vite + TypeScript frontend, Express + TypeScript backend, MySQL 8, optional Redis for public event caching, Nginx proxy, Docker Compose.
  - Documented risks & mitigations: strict mock payment guard (`NODE_ENV !== 'production'`), fallback to MySQL if Redis is unavailable, console preview default for email, server-authoritative registration/payment invariants.
  - Current status: Phase 00 complete. Stopped and awaiting explicit Phase 01 instruction from user.
- **2026-10-23 — Phase 01 (Scaffold and Developer Experience) Completed:**
  - Monorepo initialized: npm workspaces configuring `@festconnect/api` (`apps/api`) and `@festconnect/web` (`apps/web`).
  - Environment & configuration: `.gitignore`, `.env.example`, `package.json`, `package-lock.json`, `AGENTS.md`, `README.md`.
  - Backend scaffold: Express + TypeScript with Helmet security headers, CORS, body parser, and `/api/health` endpoint distinguishing liveness from readiness (`subsystems.database: 'not_configured_in_phase_01'`).
  - Frontend scaffold: React 18 + TypeScript + Vite with College-Tech aesthetic, shared design tokens from `DESIGN.md`, responsive layout, and live `/api/health` connection checker.
  - Infrastructure placeholders: `infra/nginx` (`nginx.conf.example`, `README.md`), `infra/mysql` (`README.md`), and `scripts/` (`README.md`).
  - Automated verification:
    - `npm run typecheck`: Passed with 0 errors across workspaces.
    - `npm run test`: 5 tests passed (2 API health/error tests, 3 Web App component tests).
    - `npm run build`: Production builds for `@festconnect/api` (`tsc`) and `@festconnect/web` (`vite build`) completed cleanly.
    - Live runtime health verification: Started dev server, queried `GET http://localhost:4000/api/health`, confirmed 200 OK JSON response with accurate status reporting.
  - Next step: Stop and await explicit Phase 02 instruction.
- **2026-10-23 — Phase 02 (MySQL Schema, Migrations and Demo Seed) Completed:**
  - Reference reconciliation completed: Inspected all original FA1 files (`ER Diagram.drawio`, `UMl_Project_final.drawio`, `usecase.drawio`, `SequenceDiagram`, `project _crc.drawio`, and `FA2 Instructions.docx (1).pdf`).
  - Schema definition: Created versioned migration `001_initial_fa1_schema.sql` (in both `apps/api/src/db/migrations/` and `infra/mysql/migrations/`) mapping all 10 verified FA1 relational entities: `participant`, `participant_skill`, `event_coordinator`, `event`, `schedule`, `team`, `team_member`, `registration`, `payment`, `pass_receipt`.
  - Invariants encoded: Relational foreign keys with referential integrity, `DECIMAL(10,2)` for currency, unique constraints for team membership (`uk_team_participant`), registration per team/event (`uk_team_event`), 1:1 payment to registration (`uk_payment_registration`), 1:1 pass to registration (`uk_pass_registration`), and unique pass number (`uk_pass_number`).
  - Tooling & scripts implemented:
    - `apps/api/src/db/connection.ts`: MySQL connection pool with truthful connectivity checker.
    - `apps/api/src/db/migrate.ts`: Schema migration runner tracking executed files in `schema_migrations`.
    - `apps/api/src/db/seed.ts`: Safe demo seeder with bcrypt-hashed credentials and strict production guard.
    - `apps/api/src/db/reset.ts`: Reset utility dropping tables in reverse FK order and re-migrating/seeding.
  - Data Dictionary: Added comprehensive Section 7 to `DESIGN.md` documenting table structures, keys, and provenance against FA1 diagrams.
  - Automated verification:
    - `npm run typecheck`: Passed with 0 errors across workspaces.
    - `npm run test`: All 13 tests passed (10 API tests including schema syntax, FK constraints, monetary precision, and connection check; 3 Web tests).
    - `npm run build`: Production builds succeeded cleanly.
- **2026-10-23 — Phase 02 Verification and Remediation Gate Completed:**
  - Audited against original diagrams (`ER Diagram.drawio`, `UMl_Project_final.drawio`, `usecase.drawio`, `SequenceDiagram`, `project _crc.drawio`, `FA2 Instructions.docx (1).pdf`).
  - Remediated Payment Retries (Finding 1): Supported multiple payment attempts per registration (1:N attempts per Use Case 16). Implemented virtual generated column `success_registration_id INT GENERATED ALWAYS AS (IF(payment_status = 'SUCCESS', registration_id, NULL)) VIRTUAL` with `UNIQUE KEY uk_payment_success_registration (success_registration_id)`. Mathematically prevents duplicate successful payments while preserving failed/retry attempts.
  - Remediated Pass Receipt (Finding 2): Added `payment_id INT NOT NULL UNIQUE FK -> payment(payment_id) ON DELETE RESTRICT` alongside `registration_id INT NOT NULL UNIQUE FK -> registration(registration_id) ON DELETE RESTRICT`. Reconciles sequence diagram Step 15 `generate(teamId, paymentId)` and ER diagram `GENERATES`.
  - Canonical Team Leader (Finding 3): Established `team.leader_id` as the single canonical reference for team creation and ownership per ER `LEADS`. `team_member.role` reflects functional role (`LEADER`, `MEMBER`).
  - Corrected Team-Name Uniqueness Documentation (Finding 4): Verified `team` table has no `event_id` column. Added search index `idx_team_name`. Uniqueness per event is strictly enforced in `registration (team_id, event_id)`.
  - Reconciled Attributes (Finding 5): Fully reconciled original FA1 attributes (`Participant.collegeName`, `date_of_birth`, derived `age`, `event_name` vs `title`, `min_team_size`, `max_team_size`, `registration_fee` exact decimal, weak entity `participant_skill`) and distinguished additive implementation fields (`password_hash`, `role`, `status`, `attempt_number`).
  - Remediated Deletion Safety (Finding 6): Changed `payment` -> `registration`, `pass_receipt` -> `registration`, and `pass_receipt` -> `payment` foreign keys to `ON DELETE RESTRICT` to protect financial transaction and ticket audit history from accidental cascade deletion.
  - Implemented Reset & Seed Safety (Finding 7): Created `apps/api/src/db/safety.ts` with `assertDisposableDatabase()` enforcing checks against `NODE_ENV === 'production'`, database names matching production patterns, and non-local database hosts without explicit developer override.
  - Established Migration Authority (Finding 8): Formally documented `apps/api/src/db/migrations/001_initial_fa1_schema.sql` as the canonical source of truth, with `infra/mysql/migrations/` synchronized as a container initialization replica.
  - Verification & Testing:
    - `npm run test`: All 20 static/mock tests passed across workspaces (17 API tests + 3 Web tests).
    - `npm run typecheck`: Passed with 0 errors across workspaces.
    - `npm run build`: Production builds completed cleanly.
- **2026-10-23 — Final Phase 02 Live MySQL 8 Database Verification Completed:**
  - Active environment: Live MySQL 8.4 container (`festconnect_db_test`) started via Docker Desktop on port 3306.
  - SQL Types Inspected: `registration.registration_id` is `int(11) NOT NULL PK AUTO_INCREMENT`; `payment.success_registration_id` is `int(11) NULL VIRTUAL GENERATED` with generation expression `if((payment_status = 'SUCCESS'), registration_id, NULL)`.
  - Migration Runner Idempotency Verified: Clean first execution (`Total newly applied: 1`); second execution detected existing migration in `schema_migrations` (`Already applied: 001_initial_fa1_schema.sql`, `Total newly applied: 0`).
  - Seed Repeatability Verified: Successfully seeded demo data across all 10 tables on first and subsequent runs without duplicate key collisions.
  - Integration Test Suite (`apps/api/tests/db.live.test.ts`): All 10 live database tests passed against the active MySQL 8 instance:
    1. SQL column data types, nullability, virtual generated column expression, and unique index verified against `information_schema`.
    2. Migration runner idempotency on second run verified.
    3. Seed runner idempotency and row counts verified.
    4. Duplicate team membership `(team_id, participant_id)` rejected with MySQL error 1062 (`ER_DUP_ENTRY`).
    5. Duplicate event registration `(team_id, event_id)` rejected with MySQL error 1062 (`ER_DUP_ENTRY`).
    6. Failed payment retry permitted (attempt 1 FAILED, attempt 2 SUCCESS, attempt 3 FAILED); duplicate SUCCESS rejected with MySQL error 1062 on `uk_payment_success_registration`.
    7. Foreign key protection: Deleting registered registration rejected with MySQL error 1451 (`ER_ROW_IS_REFERENCED_2`).
    8. Foreign key protection: Deleting paid payment with active pass rejected with MySQL error 1451 (`ER_ROW_IS_REFERENCED_2`).
    9. Pass receipt integrity: Rejects duplicate pass issuance for same registration with MySQL error 1062; rejects pass referencing non-existent payment with MySQL error 1452 (`ER_NO_REFERENCED_ROW_2`).
    10. Team leadership consistency: `team.leader_id` verified matching `team_member.role = 'LEADER'`, other members verified with `role = 'MEMBER'`.
  - Reset Safety Verified: `resetDatabase()` executed cleanly and safely on designated disposable test database.
  - Test Suite Status: **30/30 tests passed** (27 in `@festconnect/api`, 3 in `@festconnect/web`).
  - Next step: Phase 02 is 100% complete and verified against live MySQL 8. Await explicit user instruction before starting Phase 03.

---

## Phase 03 — Backend Foundation and Authentication
- **Status:** COMPLETED and VERIFIED.
- **Architectural & Security Deliverables:**
  1. **Config Layer (`apps/api/src/config/env.ts`):** Validated environment configuration via Zod (`getEnv()`), parsing `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `DB_*`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_NAME`, `COOKIE_SAME_SITE`.
  2. **Error Standards (`apps/api/src/errors/app-error.ts`, `apps/api/src/middleware/error.middleware.ts`):** TRD-standard error shape `{ error: { code, message, details } }` implemented with typed error hierarchy (`ValidationError`, `AuthenticationError`, `ForbiddenError`, `NotFoundError`, `ConflictError`).
  3. **Input Validation (`apps/api/src/schemas/auth.schema.ts`, `apps/api/src/middleware/validate.middleware.ts`):** Strict Zod schemas for registration and login. Extra client-injected fields (e.g. `role: 'ADMIN'`) are rejected with `400 VALIDATION_ERROR`.
  4. **Persistence Repositories (`apps/api/src/repositories/`):**
     - `ParticipantRepository`: Parameterized queries for `findByEmail`, `findById`, `create` (strictly forcing `role = 'PARTICIPANT'`), `getSkills`, `addSkills`.
     - `CoordinatorRepository`: Parameterized queries linking `event_coordinator` to participant accounts.
  5. **Domain AuthService (`apps/api/src/services/auth.service.ts`):**
     - Passwords hashed with bcrypt (10 rounds). Plaintext passwords and `password_hash` never leaked.
     - Signed JWTs with configurable expiration.
     - Login verifies hash and returns sanitized `AuthenticatedUser` without credentials.
  6. **Auth & Authorization Middleware (`apps/api/src/middleware/auth.middleware.ts`):**
     - `authenticate`: Extracts JWT from HttpOnly cookie `festconnect_token` or `Authorization: Bearer <token>` fallback for API tests.
     - `requireAuth`: Guards protected routes with `401 AUTHENTICATION_FAILED`.
     - `requireRole(...roles)`: Server-side role guard rejecting unauthorized roles with `403 FORBIDDEN`.
  7. **CSRF Protection (`apps/api/src/middleware/csrf.middleware.ts`):**
     - Enforces Origin / Referer validation and custom header checks for cookie-authenticated state-changing operations (POST, PUT, PATCH, DELETE).
  8. **Endpoints Implemented under `/api/v1/auth` & Health Probes:**
     - `POST /api/v1/auth/register` (201 Created, sets HttpOnly cookie)
     - `POST /api/v1/auth/login` (200 OK, sets HttpOnly cookie)
     - `POST /api/v1/auth/logout` (200 OK, clears cookie)
     - `GET /api/v1/auth/me` (200 OK, returns authenticated profile & role)
     - `GET /api/health` (200 OK, liveness status)
     - `GET /api/ready` (200 OK / 503, database readiness probe)
  9. **API Documentation (`docs/openapi.yaml` & `openapi.yaml`):**
     - OpenAPI 3.0.3 specification documenting all Phase 03 routes, request/response schemas, security schemes (`CookieAuth`, `BearerAuth`), and error envelopes.
- **Verification & Test Results:**
  - Automated Tests: **70/70 tests passing** across workspaces (67 API tests + 3 Web tests).
  - Test Suites:
    - `tests/security.test.ts` (19 tests): Dedicated security gate testing HS256 algorithm enforcement, claims validation, production JWT_SECRET strength, Double-Submit CSRF cookie protection with `timingSafeEqual`, Bearer bypass defense, readiness failure detection (503), and production error redaction.
    - `tests/auth.test.ts` (21 tests): Participant registration, duplicate detection, schema validation, privilege elevation prevention, password hashing, valid/invalid login, logout cookie clearing, `/me` authentication via cookie and Bearer token, and role guards.
    - `tests/db.live.test.ts` (10 tests): Live MySQL 8 verification of schema constraints, payment retry single-success uniqueness, delete cascades, idempotency.
    - `tests/schema.test.ts` (9 tests), `tests/safety.test.ts` (4 tests), `tests/seed.test.ts` (2 tests), `tests/health.test.ts` (2 tests).
    - `apps/web/tests/App.test.tsx` (3 tests).
  - Typecheck: `npm run typecheck` passed (zero errors across `@festconnect/api` and `@festconnect/web`).
  - Production Build: `npm run build` passed (zero errors across `@festconnect/api` and `@festconnect/web`).
  - Lint: `npm run lint` passed.
- **Security Gate Invariants Verified:**
  1. JWT Algorithm Confusion Defense: `verifyToken` strictly restricts `algorithms: ['HS256']`. Tokens signed with `none` or other algorithms are rejected.
  2. Token Claim Validation: Decoded JWT claims validated via Zod schema before trusting identity or role.
  3. Production Secret Policy: `env.ts` superRefine blocks default development secret in production and requires at least 32 characters.
  4. Double-Submit CSRF Protection: Validates readable `festconnect_csrf` cookie against `X-CSRF-Token` header using `crypto.timingSafeEqual` and checks Origin/Referer against `CORS_ORIGIN`.
  5. Bearer Bypass Prevention: Requests attempting Bearer authentication cannot fall back to cookie auth to bypass CSRF.
  6. Database Readiness & Error Redaction: `/api/ready` truthfully detects database failure (503), and production error handler redacts exception details and stack traces.
  7. Database Name Reconciliation: Verified that `festconnect_db_test` is the Docker container name running on port 3306, while the internal schema name is `festconnect`. `assertDisposableDatabase()` protects against non-local and production targets.
- **Next Step:** Stop and report Phase 03 Security Gate results. Await explicit user instruction before proceeding to Phase 04.
- **2026-10-23 — Phase 04 (Event & Schedule Management) Completed:**
  - **Public Event Discovery:**
    - `GET /api/v1/events`: Paginated event listings (`page`, `limit` up to 100), deterministic ordering (`ORDER BY e.event_id ASC`), category filtering (`event_type`), lifecycle status filtering (`status`), and keyword searching (`search`).
    - `GET /api/v1/events/:id`: Complete event detail retrieval, including assigned coordinator contact information and associated event schedule slots.
  - **Authorized Event Management:**
    - `POST /api/v1/events`: Authorized for `ADMIN` and `COORDINATOR` roles. Enforces strict Zod schema validation (`createEventSchema`), rejects unknown fields, prevents inverted team sizes (`min_team_size <= max_team_size`). Server-authoritatively binds the created event to the authenticated coordinator's `coordinator_id`; rejects coordinator attempts to assign events to others with `403 FORBIDDEN`.
    - `PATCH /api/v1/events/:id`: Partial event updates with strict input validation. Non-existent events return `404 NOT_FOUND`. Enforces server-authoritative ownership: coordinators attempting to modify an event assigned to another coordinator are blocked with `403 FORBIDDEN`. Coordinators attempting to reassign ownership are rejected with `403 FORBIDDEN`. Validates effective team size ranges.
  - **Schedule Management:**
    - `GET /api/v1/events/:id/schedules`: Retrieves all schedule entries for an event sorted chronologically (`event_date ASC, start_time ASC`). Returns `404 NOT_FOUND` for non-existent events.
    - `POST /api/v1/events/:id/schedules`: Adds a schedule slot for an event. Verifies event existence and coordinator ownership. Rejects invalid chronological time ranges (`start_time >= end_time`) with `400 VALIDATION_ERROR`.
    - `PATCH /api/v1/events/:id/schedules/:scheduleId`: Updates a schedule slot. Verifies event and schedule existence (404), coordinator ownership (403), and chronological consistency.
  - **Frontend Implementation (`apps/web`):**
    - `EventList`: Responsive grid of event cards with category tags, status badges, team size badges, fee representation, coordinator info, search bar, category dropdown, status dropdown, pagination controls, skeleton loading, error retry card, and empty results state.
    - `EventDetailModal`: Complete event modal showing full description, coordinator card, and interactive schedule timeline with slot editing/addition.
    - `EventFormModal`: Modal form for event creation and updates with client-side validation and server-error display.
    - `ScheduleFormModal`: Modal form for schedule slot creation and updates with time validation.
    - Header User Bar & Demo Switcher: Shows logged-in user profile with role badge (`ADMIN`, `COORDINATOR`, `PARTICIPANT`) and quick demo switcher buttons for interactive demonstration.
  - **Security & CSRF Protection:**
    - All mutative routes (`POST /api/v1/events`, `PATCH /api/v1/events/:id`, `POST /api/v1/events/:id/schedules`, `PATCH /api/v1/events/:id/schedules/:scheduleId`) require Double-Submit CSRF cookie and Origin validation for cookie-based browser sessions, while supporting Authorization: Bearer tokens.
    - All SQL queries use parameterized arguments through repository methods.
  - **Documentation & OpenAPI:**
    - `docs/openapi.yaml` and root `openapi.yaml` synchronized with 7 new endpoints, request/response schemas, and parameter specifications.
  - **Verification & Test Results:**
    - Automated Tests: **106/106 tests passing** across monorepo workspaces:
      - `@festconnect/api`: 97 tests across 8 suites (including 30 in `tests/event.test.ts`, 19 in `tests/security.test.ts`, 21 in `tests/auth.test.ts`, 10 in `tests/db.live.test.ts`, 9 in `tests/schema.test.ts`, 4 in `tests/safety.test.ts`, 2 in `tests/seed.test.ts`, 2 in `tests/health.test.ts`).
      - `@festconnect/web`: 9 tests across 2 suites (`tests/App.test.tsx` [3], `tests/Event.test.tsx` [6]).
    - Typecheck: `npm run typecheck` passed (0 errors across `@festconnect/api` and `@festconnect/web`).
    - Production Build: `npm run build` passed (0 errors; tsc for api, tsc + vite build for web).
    - Lint: `npm run lint` passed.
  - **Next Step:** Phase 04 complete. Stop and report outcome. Do not proceed to Phase 05 without explicit user authorization.
- **2026-10-23 — Phase 05 (Team & Registration Management) Completed:**
  - **Team Management Domain:**
    - `POST /api/v1/teams`: Transactional team creation ensuring authenticated participant is designated as `team.leader_id` and auto-enrolled into `team_member` with `role = 'LEADER'`. Enforces name uniqueness and Zod validations.
    - `GET /api/v1/teams`: Lists teams where the authenticated user is either a leader or a member, with member counts and leader details.
    - `GET /api/v1/teams/:id`: Retrieves complete team details, roster members, and registered events. Restricted to team members, event coordinators, or administrators.
    - `DELETE /api/v1/teams/:id`: Disbands team. Restricted to team leader or admin. Rejects disbanding if active registrations exist.
    - `GET /api/v1/teams/:id/members`: Retrieves full team roster. Restricted to team members, event coordinators, or administrators.
    - `POST /api/v1/teams/:id/members`: Adds member by participant ID or email address. Restricted to team leader. Rejects duplicate membership (409) and modification on registered/disbanded teams (400).
    - `DELETE /api/v1/teams/:id/members/:participantId`: Removes a member or allows a member to leave. Invariant: Team leader cannot be removed or leave without transferring or disbanding. Rejects unauthorized removals (403).
  - **Event Registration Domain:**
    - `POST /api/v1/registrations`: Registers an eligible team for an event. Enforces server-authoritative validations:
      - Event must exist and have `ACTIVE` or `UPCOMING` status.
      - Team must exist and requesting user must be the team leader or admin.
      - Team size must satisfy event rules (`min_team_size <= member_count <= max_team_size`).
      - Prevents duplicate registration for the same team and event (409).
      - Multi-member schedule conflict detection: verifies that no team member is enrolled in another event whose schedule overlaps in date and time window with this event (400 with detailed conflicting member and event information).
      - Creates registration in server-authoritative initial status `PENDING_PAYMENT`. Transitions team status to `REGISTERED`.
    - `GET /api/v1/registrations`: Retrieves user registrations (or all registrations with filters for coordinators/admins).
    - `GET /api/v1/registrations/:id`: Detailed registration view with team and event summary.
    - `PATCH /api/v1/registrations/:id`: Allows cancelling a registration (`status = 'CANCELLED'`). Accessible to team leader, member, or coordinator/admin.
  - **Frontend Implementation (`apps/web`):**
    - `TeamList`: Renders user's teams with status badges (`FORMING`, `READY`, `REGISTERED`, `DISBANDED`), member counts, leader details, "Create Team" modal, and "View Team" launch.
    - `TeamDetailModal`: Full team modal displaying roster members with roles, "Add Member by Email" form for leaders, "Remove" / "Leave" actions, and list of registered events.
    - `RegisterEventModal`: Event registration modal displaying eligible teams, team size validation indicators, warning messages for ineligible sizes or schedule conflicts, and registration confirmation.
    - `RegistrationList`: Registrations dashboard tab with status filtering (`ALL`, `PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`), fee display, event details, and leader cancellation button.
    - Responsive tab switching in `App.tsx` between Events, My Teams, and My Registrations.
  - **Documentation & OpenAPI:**
    - `docs/openapi.yaml` and root `openapi.yaml` synchronized and identical (1987 lines each), documenting all 8 Phase 05 endpoints, request/response schemas (`TeamSummary`, `TeamMember`, `TeamDetail`, `CreateTeamRequest`, `AddMemberRequest`, `CreateRegistrationRequest`, `UpdateRegistrationRequest`, `RegistrationSummary`, `RegistrationDetail`), authorization, CSRF headers, and error responses.
  - **Verification & Test Results:**
    - Automated Tests: **143/143 tests passing** across monorepo workspaces:
      - `@festconnect/api`: 128 tests across 9 suites (including 31 in `tests/team.test.ts`, 30 in `tests/event.test.ts`, 19 in `tests/security.test.ts`, 21 in `tests/auth.test.ts`, 10 in `tests/db.live.test.ts`, 9 in `tests/schema.test.ts`, 4 in `tests/safety.test.ts`, 2 in `tests/seed.test.ts`, 2 in `tests/health.test.ts`).
      - `@festconnect/web`: 15 tests across 3 suites (`tests/App.test.tsx` [3], `tests/Event.test.tsx` [6], `tests/Team.test.tsx` [6]).
    - Typecheck: `npm run typecheck` passed (0 errors across `@festconnect/api` and `@festconnect/web`).
    - Production Build: `npm run build` passed (0 errors; tsc for api, tsc + vite build for web).
    - Lint: `npm run lint` passed.
  - **Phase 05 Boundary & Hard Stop:**
    - No payment processing, no digital passes, and no email notifications were implemented. Initial registration status is strictly `PENDING_PAYMENT`.
    - Stopped after Phase 05. Awaiting explicit user instruction before Phase 06.
- **2026-10-23 — Phase 06 (Payment Factory & Adapter) Completed:**
  - **Payment Architecture & Design Patterns:**
    - **Adapter Pattern:** Defined `PaymentGatewayAdapter` interface (`types/payment.types.ts`) specifying contract (`name`, `processPayment(req)` returning `PaymentGatewayResponse`). Implemented `MockPaymentGatewayAdapter` (`adapters/payment/mock-payment-gateway.adapter.ts`) for testing and local demonstrations. Simulates `SUCCESS`, `FAILED`, and `PENDING` states with realistic structured transaction IDs (`MOCK-SUCC-...`, `MOCK-FAIL-...`).
    - **Factory Pattern:** Implemented `PaymentFactory` (`factories/payment.factory.ts`) returning the configured adapter based on `PAYMENT_PROVIDER` environment configuration (`env.ts`). Fails safely for unsupported providers (`razorpay`, `stripe`), and strictly forbids mock gateway instantiation when `NODE_ENV === 'production'`.
    - **Production Security:** Zero mock payment operations or outcomes are permitted in production. No real money charged, and no real credit card or banking credentials requested or stored.
  - **Payment Service & Transactional State Transitions:**
    - `PaymentRepository` (`repositories/payment.repository.ts`): Parameterized queries for `createAttempt`, `updateAttempt`, `findById`, `findByRegistrationId`, `getNextAttemptNumber`, and `findSuccessfulByRegistrationId`.
    - `PaymentService` (`services/payment.service.ts`):
      - Verifies registration exists and user is authorized (team leader or admin).
      - Rejects cancelled registrations (`400`).
      - Server-authoritative computation: Payable amount is derived strictly from trusted `event.registration_fee`. Client cannot override amount, currency, or payment status.
      - Enforces database constraint and row-level locking (`SELECT ... FOR UPDATE` on registration within a transaction).
      - Tracks attempt numbers sequentially (`attempt_number = 1, 2, ...`).
      - On verified `SUCCESS` result from adapter, atomically transitions registration from `PENDING_PAYMENT` to `CONFIRMED`.
      - On `FAILED` or `PENDING` result, registration remains `PENDING_PAYMENT` and allows subsequent retries.
      - Rejects duplicate payment attempts if registration already has a verified `SUCCESS` payment (`409 Conflict`).
  - **Payment Endpoints:**
    - `POST /api/v1/registrations/:id/payments`: Initiates a payment attempt for registration `:id`. Team leader or admin only. CSRF protected.
    - `GET /api/v1/registrations/:id/payments`: Lists payment attempts for registration `:id`. Restricted to team members or admin.
    - `POST /api/v1/payments`: Initiates payment attempt via `registration_id` in request body.
    - `GET /api/v1/payments/:id`: Retrieves individual payment attempt details. Restricted to team members or admin.
  - **Frontend Payment Experience (`apps/web`):**
    - `PaymentModal.tsx`: Displays event details, team name, and server-provided registration fee with prominent banner: *"Demo Payment — No Real Money Charged"*. Allows selecting simulated outcome (`SUCCESS`, `FAILED`, `PENDING`) for demonstration, shows loading state, prevents duplicate submissions, provides instant feedback, and enables retrying upon simulated failure.
    - `RegistrationList.tsx`: Integrated with "Pay Now" action button strictly for eligible `PENDING_PAYMENT` registrations when user is team leader or admin. Automatically refreshes server registration state upon payment completion.
  - **Documentation & OpenAPI:**
    - `docs/openapi.yaml` and root `openapi.yaml` kept 100% identical and synchronized (2232 lines each). Documented all 4 Phase 06 payment routes, `Payments` tag, and schemas (`InitiatePaymentRequest`, `PaymentRecord`, `PaymentDetailResponse`).
  - **Verification & Test Results:**
    - Automated Tests: **176/176 tests passing** across monorepo workspaces:
      - `@festconnect/api`: 156 tests across 10 suites (including 28 in `tests/payment.test.ts`, 31 in `tests/team.test.ts`, 30 in `tests/event.test.ts`, 19 in `tests/security.test.ts`, 21 in `tests/auth.test.ts`, 10 in `tests/db.live.test.ts`, 9 in `tests/schema.test.ts`, 4 in `tests/safety.test.ts`, 2 in `tests/seed.test.ts`, 2 in `tests/health.test.ts`).
      - `@festconnect/web`: 20 tests across 4 suites (`tests/App.test.tsx` [3], `tests/Event.test.tsx` [6], `tests/Team.test.tsx` [6], `tests/Payment.test.tsx` [5]).
  - **Phase 06 Boundary & Hard Stop:**
    - Digital passes (`PassReceipt`), QR codes, email notifications, and schedule observers remain strictly out of scope for Phase 06 and are deferred to Phase 07.
    - Stopped after Phase 06. Awaiting explicit user instruction before Phase 07.
- **2026-10-24 — Phase 07 (Digital Passes and Notifications) Completed:**
  - **Digital Pass Generation & Constraints:**
    - `PassReceiptRecord` and database entity `pass_receipt` implemented following original FA1 schema and design documents.
    - Strict server-authoritative generation rule: Passes are issued ONLY when `registration.status = 'CONFIRMED'` and a verified `SUCCESS` payment record belongs to the registration in MySQL.
    - Transactional concurrency & idempotency: Row-level locking (`SELECT ... FOR UPDATE`), database constraints `uk_pass_registration` (1 pass per registration), `uk_pass_payment` (1 pass per successful payment), and `uk_pass_number` (unique human-readable ticket code) physically prevent duplicate passes.
    - Automated creation: `PaymentService` automatically triggers pass generation upon successful payment transitions. Repeated requests return existing pass idempotently without duplicating database rows.
    - Cryptographic QR Token: Generates secure QR validation token formatted as `FESTCONNECT::PASS::REG{id}::EVENT{id}::TEAM{id}::PAY{id}::SIG{hmac}` using HMAC-SHA256 with timing-safe comparison (`crypto.timingSafeEqual`).
    - QR Code visual rendering: Renders high-resolution Data URL PNG image via `qrcode.toDataURL` for frontend visual presentation.
  - **Email Service & Adapter Pattern:**
    - `EmailAdapter` interface (`types/email.types.ts`) with contract `sendEmail(payload: EmailPayload): Promise<EmailSendResult>`.
    - `ConsoleEmailAdapter` (`adapters/email/console-email.adapter.ts`): Default, zero-dependency development and testing adapter printing rich ASCII-boxed email previews to server logs with memory audit trail (`getSentEmails()`, `clearSentEmails()`).
    - `GmailSmtpAdapter` (`adapters/email/gmail-smtp.adapter.ts`): Optional Gmail SMTP adapter using `nodemailer` when `GMAIL_USER` and `GMAIL_APP_PASSWORD` are supplied. Safely suppresses live transport when unconfigured without throwing unhandled exceptions.
    - `EmailFactory` (`factories/email.factory.ts`): Instantiates the appropriate adapter based on `EMAIL_PROVIDER` environment variable (`console` or `gmail`).
    - Decoupled Delivery: Email dispatch is asynchronous and independent of payment/pass database transactions. Email failure never rolls back payments or invalidates passes. Accidental credential leaks prevented.
  - **Observer Pattern for Schedule Notifications:**
    - Implemented Gang-of-Four Observer Pattern: `ScheduleSubject`, `ScheduleObserver`, and `EmailNotificationObserver`.
    - `ScheduleService` implements `ScheduleSubject` (`registerObserver`, `removeObserver`, `notifyObservers`).
    - `EmailNotificationObserver` registers with `ScheduleService`. When a coordinator or admin updates an event schedule (`updateSchedule`), the subject notifies observers, which query all confirmed registered participants for that event and dispatches email update notices.
    - Resilient Observer execution: Failures within individual observers are logged and caught so the core schedule update is never blocked.
  - **Endpoints Implemented:**
    - `GET /api/v1/registrations/:id/pass`: Retrieves digital pass, visual QR code data URL, team roster, and schedule for confirmed registration. Restricted to team participants, coordinators, and admins.
    - `POST /api/v1/registrations/:id/pass`: Generates or retrieves digital pass on-demand for confirmed registration with verified payment. CSRF protected. Prevents duplicate passes via transactional locking and MySQL unique constraints.
    - `GET /api/v1/passes/:id`: Retrieves pass by primary key `pass_id`. Restricted to authorized team participants, coordinators, or administrators.
    - `POST /api/v1/passes/verify` & `POST /api/v1/passes/validate`: Server-side pass and QR token validation endpoints for gate verification staff and coordinators. Accepts `pass_number`, `qr_code`, `pass_token`, or `token` with HMAC-SHA256 signature verification and timing-safe checks.
    - `GET /api/v1/registrations/:id/notifications/email`: Retrieves real-time email delivery status (`DELIVERED`, `FAILED`, `NOT_SENT`), delivery attempts, timestamps, and recipient info for an authorized user.
    - `POST /api/v1/registrations/:id/notifications/email`: Requests or retries email dispatch for an eligible confirmed registration. Enforces duplicate-send cooldown protection (rejects re-sends within 60s with HTTP 409 unless `force: true` is specified).
  - **Frontend Digital Pass & Email Presentation (`apps/web`):**
    - `PassModal.tsx`: Displays official entry pass ticket with active status badge, visual QR code image, pass code, event venue/date/time, team member roster with roles, payment audit details, live backend-confirmed email delivery status badge, a "Resend Email" / "Send Pass Email" button with cooldown feedback, and a "Print / Save Pass" action. Provides informative error state for unconfirmed or unpaid registrations.
    - `RegistrationList.tsx`: Integrated `PassModal` accessible via "🎟️ View Pass" button for all confirmed registrations.
    - `api/passes.api.ts` & `types/pass.types.ts`: Type-safe client functions for pass retrieval, generation, verification, and email notification status tracking and retries.
  - **Documentation & OpenAPI:**
    - `docs/openapi.yaml` and root `openapi.yaml` kept 100% identical and synchronized (verified by matching SHA256 hashes: `2D589A49DC44C37CC465394AD1302917CACE7421854E91F621F87C60B324EE80`). Documented `Passes` and `Notifications` tags, all pass and notification endpoints, and schemas (`PassReceiptRecord`, `PassDetailResponse`, `VerifyPassRequest`, `VerifyPassResponse`, `EmailNotificationStatus`).
  - **Phase 07 Security & Reliability Hardening:**
    - **Persistent MySQL Notification State:** Added migration `002_email_notifications.sql` (`email_notification` tracking `status`, `attempts`, `provider`, `last_sent_at`, `last_attempted_at`, `last_error` and `email_notification_attempt` tracking historical attempts). Implemented atomic `INSERT ... ON DUPLICATE KEY UPDATE` in `NotificationService` to prevent InnoDB gap-lock deadlocks on concurrent requests. Unhandled provider network failures safely caught to mark `FAILED` status and log error details without server crashes. State survives process restarts.
    - **Hardened QR Token Cryptography:** Implemented dedicated `PASS_HMAC_SECRET` in `config/env.ts` with Zod `superRefine` enforcing non-default, length >= 32 in production. Full 64-hex HMAC-SHA256 signature generated in `generateQrToken` and verified with timing-safe comparison (`crypto.timingSafeEqual`). Server-side verification validates active pass status, `CONFIRMED` registration state, and verified `SUCCESS` payment.
    - **Resource-Level Authorization Audit:** Enforced event coordinator scope: coordinators can only verify passes, access details, and trigger email notifications for events they are assigned to (cross-event attempts return `403 FORBIDDEN`). Participant access strictly checks team membership (leader or roster member). Authoritative recipient email derived from verified database participants.
    - **API Contract & OpenAPI Synchronization:** Notification statuses standardized to `DELIVERED`, `FAILED`, `NOT_SENT` across backend, frontend (`PassModal.tsx`), client types, and OpenAPI. Documented intentional extra endpoints (`GET /api/v1/passes/{id}` and `POST /api/v1/passes/verify`). Root `openapi.yaml` and `docs/openapi.yaml` synchronized with identical SHA256 hashes (`78269EEA32393E52EC04A08FFE9B678C9FD91E4F0C0BE316CF07E08D207CC4B1`).
  - **Verification & Test Results:**
    - Full Automated Test Suite: **235/235 tests passing** monorepo-wide (0 failures):
      - `@festconnect/api`: 208 tests across 11 suites (including 49 in `tests/pass.test.ts`, 28 in `tests/payment.test.ts`, 31 in `tests/team.test.ts`, 30 in `tests/event.test.ts`, 22 in `tests/security.test.ts`, 21 in `tests/auth.test.ts`, 10 in `tests/db.live.test.ts`, 9 in `tests/schema.test.ts`, 4 in `tests/safety.test.ts`, 2 in `tests/seed.test.ts`, 2 in `tests/health.test.ts`).
      - `@festconnect/web`: 27 tests across 5 suites (`tests/Pass.test.tsx` [7], `tests/Payment.test.tsx` [5], `tests/Team.test.tsx` [6], `tests/Event.test.tsx` [6], `tests/App.test.tsx` [3]).
    - Static analysis: `npm run typecheck` passed (0 errors across `apps/api` and `apps/web`), `npm run lint` passed, and `npm run build` passed (production bundle built successfully).
- **2026-10-24 — Phase 08 (Dedicated React Screens & Dashboards) Completed:**
  - **Routing & Navigation Architecture (`apps/web`):**
    - Refactored `App.tsx` to leverage React Router v6 (`Routes`, `Route`, `useNavigate`, `useLocation`, `useInRouterContext`).
    - Added dedicated URL routes:
      - `/` & `/events`: Main event discovery screen (`EventList` with search, category/status filters, pagination).
      - `/events/:id`: Dedicated event detail view (`EventDetailScreen`) displaying full event rules, schedule timeline, coordinator contact information, and registration CTA.
      - `/login` & `/register`: Dedicated authentication screen (`AuthScreen`) with tabbed Sign In and Create Account forms, client-side input validation, CSRF integration, and quick demo role switchers (`Student`, `Coordinator`, `Admin`).
      - `/dashboard` & `/registrations`: Dedicated participant workspace (`ParticipantDashboard`) showing user identification card, quick action links, and registrations list with payment status and pass access.
      - `/teams`: Dedicated team management workspace (`TeamList`, `TeamDetailModal`) with member management and team creation.
      - `/pass/:id`: Dedicated digital pass screen (`PassScreen`) rendering verified ticket card, QR code data URL, schedule/venue details, team roster, email delivery status with resend button, and `window.print()` print action.
      - `/coordinator`: Dedicated coordinator operations console (`CoordinatorDashboard`) restricted to `COORDINATOR` and `ADMIN` users. Includes metric cards, coordinated events manager, registrations & passholders table, and an interactive Gate Pass Verifier scanner tool (`POST /api/v1/passes/verify`).
      - `*`: Responsive 404 Catch-All screen ("Screen Not Found") with redirect back to overview.
    - Preserved backward compatibility for unit testing and manual tab switching via `initialTab`, `initialPath`, and `useMemoryRouter` options.
  - **Component Implementation & Experience:**
    - `AuthScreen.tsx`: Complete authentication portal supporting login and participant registration (`POST /api/v1/auth/register`), error banner alerts, and rapid role-switching helpers for demonstration.
    - `EventDetailScreen.tsx`: Complete event viewer displaying event status badge, fee, team constraints, rules/description, timeline schedule entries, coordinator contact card (with email/phone), and an "Event Registration" modal trigger with server-side validation.
    - `ParticipantDashboard.tsx`: Participant header banner with participant ID, email, role, quick navigation links to Events and Teams, and embedded `RegistrationList` displaying payment and pass action buttons.
    - `PassScreen.tsx`: Standalone ticket screen displaying official pass number, verified QR code data URL, venue/date/time details, team roster, email delivery status with live resend action, payment transaction ID, and browser print action.
    - `CoordinatorDashboard.tsx`: Dedicated operations console with summary metrics (total events, schedules, registered teams), Coordinated Events table with Edit Event and Manage Schedule modal triggers, Registrations & Passholders table, and an interactive Gate Pass Verifier scanner tool with real-time pass status and attendee details. Enforces a strict 403 Forbidden Access Denied guard if accessed by a participant role.
  - **Phase 08 Pre-Acceptance Verification Checks (Completed 2026-10-25):**
    - **Check A (Demo Credentials & Role Switching):** Created `apps/web/src/utils/env.utils.ts` (`isDemoMode` checked against `import.meta.env.DEV`). Quick demo login in `AuthScreen.tsx`, role switch buttons in `App.tsx`, and demo actions in `CoordinatorDashboard.tsx` are conditionally rendered only when `isDemoMode` is true. In production builds, these are stripped completely. Backend authorization in `auth.service.ts` forces public registration to `role: 'PARTICIPANT'` and ignores any role parameter in request bodies.
    - **Check B (Backend Authorization & Role Enforcement):** Verified that coordinator-only endpoints (`POST /api/v1/events`, `PUT /api/v1/events/:id`, `POST /api/v1/events/:id/schedules`, `POST /api/v1/passes/verify`) return HTTP 403 Forbidden for participants. Verified cross-coordinator isolation: Coordinator 2 is blocked with HTTP 403 from updating events, adding schedules, or verifying passes for events coordinated by Coordinator 1.
    - **Check C (End-to-End Participant Workflow):** 12-step automated integration test in `apps/api/tests/verification.checks.test.ts` successfully executed: user registration -> team creation -> member addition -> event registration (`PENDING_PAYMENT`) -> digital pass 404 rejection -> failed payment simulation (remains `PENDING_PAYMENT`) -> second pass 404 rejection -> success payment simulation (`CONFIRMED`) -> unlocked digital pass retrieval with QR data URL -> pass retrieval by ID -> email notification status (`DELIVERED`) & duplicate cooldown suppression (409) with force override -> Gate Pass Verifier approval by Coordinator 1 (`APPROVED`).
    - **Check D (Screen Mappings & Tenant Isolation):** `/pass/:id` correctly routes to `PassScreen.tsx`, retrieving the pass record and passing its `registration_id` to notification status requests (`/api/v1/registrations/:id/notifications/email`). `GET /api/v1/registrations` and `GET /api/v1/teams` return strictly the participant's own enrolled records (cross-team inspection returns 403 Forbidden). `CoordinatorDashboard.tsx` filters event lists by `currentUser.coordinator_id`, and `GET /api/v1/registrations` returns only registrations for the coordinator's assigned events.
    - **Check E (Usability & Responsive Layout):** Added mobile/tablet responsive media queries (`max-width: 768px`, `max-width: 640px`) in `apps/web/src/App.css` for stacked headers, responsive navigation, single-column grid collapses, horizontal table scrolling, and modal sizing. Added `@media print` styles for pass printing (hiding navigation, buttons, and alerts; formatting clean physical ticket layout).
  - **Verification & Test Results:**
    - Full Automated Test Suite: **268/268 tests passing** monorepo-wide (0 failures):
      - `@festconnect/web`: 37 tests across 6 suites (`tests/Screens.test.tsx` [10], `tests/Pass.test.tsx` [7], `tests/Payment.test.tsx` [5], `tests/Team.test.tsx` [6], `tests/Event.test.tsx` [6], `tests/App.test.tsx` [3]).
      - `@festconnect/api`: 231 tests across 12 suites (`tests/verification.checks.test.ts` [23], `tests/pass.test.ts` [49], `tests/payment.test.ts` [28], `tests/team.test.ts` [31], `tests/event.test.ts` [30], `tests/security.test.ts` [22], `tests/auth.test.ts` [21], `tests/db.live.test.ts` [10], `tests/schema.test.ts` [9], `tests/safety.test.ts` [4], `tests/seed.test.ts` [2], `tests/health.test.ts` [2]).
    - Static analysis & build checks:
      - `npm run typecheck`: Passed with 0 errors across `@festconnect/api` and `@festconnect/web`.
      - `npm run lint`: Passed with 0 errors.
      - `npm run build`: Passed with 0 errors (`@festconnect/api` compiled via tsc, `@festconnect/web` bundled cleanly via Vite).
  - **Phase 08 Boundary & Hard Stop:**
    - All 5 Pre-Acceptance Checks (A, B, C, D, E) verified and documented. Accepted by user on 2026-10-25.
- **2026-10-25 — Phase 09 (Redis Caching and Database Tuning) Completed:**
  - **Cache Architecture & Implementation (`apps/api`):**
    - Installed `ioredis` package in `@festconnect/api`.
    - Created `apps/api/src/cache/`:
      - `cache.types.ts`: Defined `CacheService` interface, cache key prefixes (`festconnect`), and deterministic query parameter normalizers: `buildEventListCacheKey`, `buildEventDetailCacheKey`, `buildEventSchedulesCacheKey`.
      - `redis.service.ts`: Implemented `RedisCacheService` with `ioredis`. Configured with `lazyConnect: true`, `enableOfflineQueue: false` (fast-fail on disconnect without memory buildup), `maxRetriesPerRequest: 1`, connection timeout (2000ms), linear retry backoff, and non-blocking `SCAN`-based `delPattern` iteration. Includes silent error trapping and automatic fallback to MySQL on any network or cluster failure.
      - `noop.service.ts`: Implemented `NoopCacheService` for disabled cache mode and offline testing fallback.
      - `cache.factory.ts`: Singleton factory with runtime environment inspection (`REDIS_ENABLED`) and test override hook (`setCacheService`).
  - **Cache-Aside Integration & Invalidation:**
    - `EventService`:
      - `listEvents`: Cache-aside lookup using `festconnect:events:list:limit=...&page=...`. Cache hit returns cached JSON; cache miss queries MySQL, stores in cache, and returns.
      - `getEventById`: Cache-aside lookup using `festconnect:events:detail:<id>`.
      - `createEvent`: Automatically invalidates listing cache pattern `festconnect:events:list:*`.
      - `updateEvent`: Automatically invalidates `festconnect:events:detail:<id>`, `festconnect:events:schedules:<id>`, and `festconnect:events:list:*`.
    - `ScheduleService`:
      - `listSchedulesByEventId`: Cache-aside lookup using `festconnect:events:schedules:<id>`.
      - `createSchedule` & `updateSchedule`: Automatically invalidate event schedules, detail, and listings cache.
  - **Database Tuning & Index Optimizations:**
    - Added migration `003_database_tuning.sql` (canonical in `apps/api/src/db/migrations/`, replica in `infra/mysql/migrations/`):
      1. `idx_event_coordinator_id` on `event(coordinator_id)` for coordinator-scoped filtering.
      2. `idx_event_type_status` composite index on `event(event_type, status)` for public catalog discovery without filesort.
      3. `idx_schedule_event_timeline` composite index on `schedule(event_id, event_date, start_time)` eliminating filesort on timeline queries.
      4. `idx_registration_event_status` composite index on `registration(event_id, status)` for coordinator roster filtering.
  - **Security Invariant:**
    - Zero private data (auth, credentials, participant profiles, team rosters, registrations, payments, passes) is ever cached in Redis. Authoritative transactional and validation logic queries MySQL directly.
  - **Verification & Test Results:**
    - Dedicated Phase 09 Test Suite (`apps/api/tests/cache.test.ts`): 12 tests covering cache miss/hit, deterministic query normalization, mutation invalidation, TTL expiration, concurrent requests, Redis outage/offline MySQL fallback, and private data isolation.
    - Full Automated Test Suite: **280/280 tests passing** monorepo-wide (0 failures):
      - `@festconnect/api`: 243 tests across 13 suites (`tests/cache.test.ts` [12], `tests/verification.checks.test.ts` [23], `tests/pass.test.ts` [49], `tests/payment.test.ts` [28], `tests/team.test.ts` [31], `tests/event.test.ts` [30], `tests/security.test.ts` [22], `tests/auth.test.ts` [21], `tests/db.live.test.ts` [10], `tests/schema.test.ts` [9], `tests/safety.test.ts` [4], `tests/seed.test.ts` [2], `tests/health.test.ts` [2]).
      - `@festconnect/web`: 37 tests across 6 suites (`tests/Screens.test.tsx` [10], `tests/Pass.test.tsx` [7], `tests/Payment.test.tsx` [5], `tests/Team.test.tsx` [6], `tests/Event.test.tsx` [6], `tests/App.test.tsx` [3]).
    - Static analysis & build checks:
      - `npm run typecheck`: Passed with 0 errors across `@festconnect/api` and `@festconnect/web`.
      - `npm run lint`: Passed with 0 errors.
      - `npm run build`: Passed with 0 errors (`@festconnect/api` compiled via tsc, `@festconnect/web` bundled cleanly via Vite in 1.60s).
  - **Phase 09 Boundary & Hard Stop:**
    - Phase 09 completed. Stopped per instructions. Do not begin Phase 10 without explicit user approval.
- **2026-10-25 — Phase 09 Final Cache and Database Audit Completed:**
  - **Audit Checklist & Empirical Results:**
    1. Event/Schedule Cache Invalidation: PASS. Verified all mutations (`POST /events`, `PUT/PATCH /events/:id`, `POST /events/:id/schedules`, `PATCH /events/:id/schedules/:scheduleId`) invalidate all affected keys (`festconnect:events:list:*`, `festconnect:events:detail:<id>`, `festconnect:events:schedules:<id>`).
    2. Key Normalization & Security Invariants: PASS. Keys use sorted URL params; TTL defaults to 60s; auth/passes/payments/registrations query MySQL directly and never bypass verification.
    3. EXPLAIN Query Tuning Verification: PASS. Empirical `EXPLAIN` verified in live MySQL:
       - `idx_event_coordinator_id`: Replaced full table scan with `ref` index lookup.
       - `idx_event_type_status`: Composite index resolves filter in B-Tree (`ref: const,const`), eliminating row filter step.
       - `idx_schedule_event_timeline`: Composite index eliminates `Using filesort` on schedule timeline queries (`WHERE event_id = ? ORDER BY event_date ASC, start_time ASC`).
       - `idx_registration_event_status`: Composite index eliminates `Using where` on coordinator roster status filters.
    4. Redis Lifecycle & Outage Fallback: PASS. `lazyConnect: true`, `enableOfflineQueue: false`, `connectTimeout: 2000ms`, `maxRetriesPerRequest: 1`, graceful shutdown in `server.ts`, transparent failover to MySQL without 500 errors.
    5. Linting Configuration Audit: PASS (with fix). Updated `package.json` lint scripts to invoke real compiler static analysis (`tsc --noEmit`); enabled `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true` in `apps/api/tsconfig.json` (matching `apps/web`); purged 3 unused type imports. Avoided introducing 70+ unnecessary ESLint packages per instruction.
    6. Quality Gates & Test Suite: PASS. Monorepo total **280/280 tests passed** (0 failed across 19 suites), `typecheck` 0 errors, `lint` 0 errors, `build` clean.
    7. Unperformed Checks: Noted absence of multi-node Redis cluster failover benchmarking and 10,000 req/sec synthetic load testing.
- **2026-10-25 — Phase 10 (Docker Compose, Integration & Final Verification) Completed:**
  - **Container Infrastructure & Orchestration:**
    - `apps/api/Dockerfile`: Multi-stage production container (`node:22-alpine`), non-root security context, production-only dependencies, built with compiled TypeScript (`dist/`), SQL migrations bundled via `copy-assets.js`, and healthcheck probe via `curl -f http://localhost:4000/api/health`.
    - `apps/api/docker-entrypoint.sh`: Container entrypoint ensuring automated database migrations run on startup (`node dist/db/migrate.js`) with retry backoff, followed by optional demo seeds (`node dist/db/seed.js` when `RUN_SEEDS=true`), and starting Express server (`node dist/server.js`).
    - `apps/web/Dockerfile`: Multi-stage production build (`node:22-alpine` builder running `tsc && vite build`, `nginx:1.27-alpine` runtime).
    - `infra/nginx/nginx.conf`: Nginx Alpine reverse proxy routing `/api/` traffic to `http://api:4000/api/` with streaming buffers, serving SPA static assets with SPA fallback (`try_files $uri $uri/ /index.html`), gzip compression, and security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`).
    - `docker-compose.yml`: Fully isolated 4-service topology (`web`, `api`, `mysql`, `redis`), 3 bridge networks (`festconnect-frontend-net`, `festconnect-backend-net`, and `festconnect-data-net` with `internal: true` preventing database/cache exposure), 2 persistent named volumes (`festconnect_mysql_data`, `festconnect_redis_data`), health checks on all 4 services, and strict `service_healthy` dependency chaining. Validated via `docker compose config` (exit 0) and `docker compose build` (exit 0).
    - `docker-compose.override.yml.example`: Provided for optional host port exposure during local debugging (ports 3306, 6379, 4000).
  - **End-to-End Integration Suite (`apps/api/tests/integration.e2e.test.ts`):**
    - 17 comprehensive tests executing the full 12-step participant-to-coordinator journey and resilience invariants:
      1. Health Probes: `GET /api/health` and `GET /api/ready` verify liveness and MySQL readiness.
      2. Participant Onboarding: Registration, login, session cookie issue, and CSRF token extraction.
      3. Catalog Discovery: Filtered event browsing and schedule timeline queries.
      4. Team Formation: Team creation and member addition with leader invariance.
      5. Event Registration: Register team for Event 1 -> server-authoritative `PENDING_PAYMENT` state.
      6. Pass Gating: Attempt to retrieve pass before payment -> strictly returns HTTP 404.
      7. Payment Failure Simulation: Mock payment simulation failure -> remains `PENDING_PAYMENT`, no pass issued.
      8. Payment Success Transition: Mock payment simulation success -> transitions registration to `CONFIRMED`, atomically generates `PassReceipt`.
      9. Pass Issuance & QR: Retrieve digital pass and visual base64 QR code with cryptographic HMAC signature.
      10. Email Notification & Resend Protection: Verifies initial notification status, email dispatch via `ConsoleEmailAdapter`, duplicate suppression (HTTP 409 cooldown), and forced resend (`{ force: true }`).
      11. Gate Pass Verification: Coordinator login and verification (`POST /api/v1/passes/verify`) approving entry for valid pass.
      12. Gate Pass Forgery Defense: Coordinator verification rejects invalid / forged pass numbers with HTTP 400 (`valid: false`).
      13. Production Safeguard (Payments): `PaymentFactory` rejects mock payment provider when `NODE_ENV=production`.
      14. Production Safeguard (Destructive DB): Reset/seed utilities (`assertDisposableDatabase`) reject execution when `NODE_ENV=production`.
      15. Authorization Boundaries: Non-coordinators and participants blocked with HTTP 403 from updating event schedules.
      16. Redis Outage Resilience: Transparent fallback to MySQL when Redis is unreachable.
  - **Documentation Artifacts Created:**
    - `docs/ARCHITECTURE_AND_DEPLOYMENT.md`: Comprehensive specification of the Layered Architecture Pattern (5 layers, design patterns: Factory, Adapter, Observer, Cache-aside, unidirectional dependencies) and complete Mermaid UML Deployment Diagram with hardware/container nodes, networks, volumes, and ports.
    - `docs/REST_API_ENDPOINTS.md`: Complete protocol reference covering all 35 endpoint routes across 9 modules with request/response schemas and examples.
    - `README.md`: Complete production deployment instructions, Docker Compose quickstart, environment configuration guide, and demo credentials table.
  - **Verification & Test Results:**
    - Automated Tests: **297/297 tests passing** monorepo-wide (0 failures across 20 test suites):
      - `@festconnect/api`: 260 tests across 14 suites (`tests/integration.e2e.test.ts` [17], `tests/cache.test.ts` [12], `tests/verification.checks.test.ts` [23], `tests/pass.test.ts` [49], `tests/payment.test.ts` [28], `tests/team.test.ts` [31], `tests/event.test.ts` [30], `tests/security.test.ts` [22], `tests/auth.test.ts` [21], `tests/db.live.test.ts` [10], `tests/schema.test.ts` [9], `tests/safety.test.ts` [4], `tests/seed.test.ts` [2], `tests/health.test.ts` [2]).
      - `@festconnect/web`: 37 tests across 6 suites (`tests/Screens.test.tsx` [10], `tests/Pass.test.tsx` [7], `tests/Payment.test.tsx` [5], `tests/Team.test.tsx` [6], `tests/Event.test.tsx` [6], `tests/App.test.tsx` [3]).
    - Static analysis & build checks:
      - `npm run typecheck`: Passed with 0 errors across `@festconnect/api` and `@festconnect/web`.
      - `npm run lint`: Passed with 0 errors across both workspaces.
      - `npm run build`: Passed with 0 errors (`@festconnect/api` compiled via tsc + copy-assets, `@festconnect/web` bundled via Vite).
      - `docker compose config`: Validated with exit code 0.
      - `docker compose build`: Succeeded with exit code 0.
  - **Phase 10 Boundary & Hard Stop:**
    - Phase 10 completed. Stopped per instructions. Do not begin Phase 11 without explicit user approval.
- **2026-10-25 — Phase 10 Final Live Container Verification Completed:**
  - **Live Multi-Tier Stack Startup (`docker compose -p festconnect up -d`):**
    - `festconnect-mysql` (MySQL 8.0): Started and reached healthy state (probed via `mysqladmin ping`). Volume `festconnect_mysql_data` initialized.
    - `festconnect-redis` (Redis 7.0): Started and reached healthy state (probed via `redis-cli ping`).
    - `festconnect-api` (Express Node 22): Started and reached healthy state (probed via `curl -f http://localhost:4000/api/health`). Entrypoint automatically executed migrations 001, 002, 003 and seeded initial demo accounts.
    - `festconnect-web` (React SPA + Nginx Alpine): Updated dual-stack `listen [::]:80` and healthcheck to `http://127.0.0.1:80/`. Started and reached healthy state.
  - **Browser-Facing End-to-End Workflow Verification (`scratch/verify-live-container.mjs`):**
    - Executed 12-step test suite purely through the public web entrypoint (`http://localhost:80`):
      1. Web SPA delivery: Returned 200 OK with FestConnect brand title and compiled bundle.
      2. Health & Readiness: `/api/health` returned `ok`; `/api/ready` verified live database connection pool.
      3. Public Event Discovery: Successfully queried `/api/v1/events?limit=5` via reverse proxy.
      4. Participant Authentication: Logged in as `adwait@festconnect.edu`, issued session cookie and CSRF token; `/api/v1/auth/me` confirmed identity.
      5. Team Formation: Created team `Live Squad` and added member `shivam@festconnect.edu`.
      6. Event Registration: Registered team for Event #1; server set status to `PENDING_PAYMENT`.
      7. Pre-Payment Pass Gating: Attempted to fetch pass; strictly returned HTTP 404 NOT FOUND.
      8. Failed Mock Payment: Simulated failure outcome; attempt recorded as FAILED; registration remained `PENDING_PAYMENT`.
      9. Successful Mock Payment: Simulated success outcome; payment recorded as SUCCESS; registration transitioned to `CONFIRMED`.
      10. Digital Pass & Visual QR Code: Successfully retrieved pass number (`FEST-2026-REG3-...`) and base64 PNG QR code data URL.
      11. Email Notification & Cooldown: Verified initial status `DELIVERED` via `ConsoleEmailAdapter`; duplicate dispatch returned HTTP 409 Conflict cooldown protection.
      12. Coordinator Gate Verification: Logged in as `coordinator@festconnect.edu`; verified valid pass (`valid: true`); rejected forged pass number with HTTP 400 (`valid: false`).
  - **Resilience & Fault-Tolerance Verification:**
    - Controlled Container Restart: Executed `docker compose -p festconnect restart mysql api`. Migrations ran idempotently (skipping 001, 002, 003). Queried Registration #3 and verified pass `FEST-2026-REG3-770C6F8A` persisted in MySQL with zero data loss.
    - Redis Outage Fallback: Executed `docker compose -p festconnect stop redis`. Queried `/api/v1/events` and `/api/v1/events/1`; API served all requests seamlessly via MySQL fallback with HTTP 200 OK. Restarted Redis; cache resumed with clean AOF loading.
    - Network Security Audit: Verified database (3306) and Redis (6379) ports are unexposed to host/WAN interfaces (`docker port` empty). Only port 80 is exposed.
  - **Quality Gates & Regression Test Suite:**
    - Automated Tests: **297/297 tests passing** (0 failures across 20 test suites).
    - Typecheck: 0 errors. Lint: 0 errors. Production Build: 0 errors.
  - **Phase 10 Stop Condition:**
    - Stopped after Phase 10 live verification. Awaiting explicit user approval before beginning Phase 11.
- **2026-10-25 — Phase 11 (Final Project Completion & FA2 Submission Readiness) Completed:**
  - **Roadmap & Assessment Alignment:**
    - Reconciled against original roadmap in `ANTIGRAVITY_PHASE_PROMPTS_ALL.md` and exact FA2 assessment instructions in `reference/FA2 Instructions.docx (1).pdf` (10 marks, Unit 3 & Unit 4).
    - Addressed all 6 assessment criteria in the FA2 rubric to target maximum marks (10/10).
  - **Academic Documentation Deliverables Created:**
    - `docs/FA2_SUBMISSION_DOSSIER.md`: Comprehensive 10-point master submission document covering:
      1. Architecture & Scalability Design (2 marks): Layered Modular Monolith pattern justified with 5,000-student scenario numbers; Microservices rejected; Nginx least-connections balancing; Redis cache-aside (60s TTL); MySQL composite indexing; CDN suitability.
      2. REST API Design & UI Approach (2 marks): 6 well-modeled FA1 domain resources; 35 REST endpoints documented with HTTP methods/status codes; `/api/v1/` versioning; Nginx API gateway; React SPA compared to SSR/HTMx and justified; screen-to-endpoint mappings.
      3. Design Patterns & Quality Attributes (2 marks): 4 patterns implemented (Factory, Adapter, Observer, Cache-Aside) with code snippets and diagrams; Performance, Scalability, Maintainability, Security evaluated with concrete tactics and explicit trade-off.
      4. Deployment Design & Integration View (2 marks): UML Deployment Diagram with hardware/containers/networks/volumes; multi-stage Alpine Dockerfiles; complete end-to-end integration trace of registration use case; consistent naming matrix across Class/ER/API/UI.
      5. ADRs & AI-Assisted Design Review (1 mark): 5 formal ADRs in standard template; AI-assisted design review log showing critical reasoning on accepted and rejected suggestions.
      6. Presentation, Live Demo & Viva (1 mark): 8–10 minute presentation outline; step-by-step live demo sequence with safe test accounts; member viva defense guide with technical answers; live container verification passing.
    - `docs/DEMO_SCRIPT.md`: Detailed minute-by-minute live presentation and demonstration script (8–10 minutes) with safe seeded test accounts and positive/negative test outcomes.
    - `docs/VIVA_QUESTIONS_AND_ANSWERS.md`: 18 technically rigorous viva questions and answers partitioned across 3 student roles (Backend/Architecture, Database/Performance, Frontend/DevOps).
    - `docs/KNOWN_LIMITATIONS.md`: Academic disclosures documenting mock payment boundaries, console email defaults, local demo scope, and production scaling prerequisites.
  - **Feature Tracking & Deliverables Alignment:**
    - `FEATURES.md`: Completely updated and marked 100% verified across P0 (Foundation), P1 (Auth), P2 (Events), P3 (Teams), P4 (Registrations), P5 (Payments), P6 (Passes), P7 (React UI), P8 (Cache), P9 (Security), and P10 (Demo).
    - `TODO.md`: Phase 11 marked completed.
    - `README.md`: Updated documentation tree, setup runbook, and project status table.
    - OpenAPI Specifications: Synchronized and byte-identical between root `openapi.yaml` and `docs/openapi.yaml` (35 endpoints).
  - **Quality Gates & Verification Results:**
    - Automated Tests: **297/297 tests passed** monorepo-wide (0 failures across 20 test suites: 260 in `@festconnect/api`, 37 in `@festconnect/web`).
    - TypeScript Typecheck: Passed with **0 errors** (`@festconnect/api` and `@festconnect/web`).
    - Compiler Static Analysis (Lint): Passed with **0 errors** (`noUnusedLocals`, `noUnusedParameters` strict).
    - Production Build: Passed with **0 errors** (tsc for api, tsc + Vite for web emitting 78.15 kB gzip bundle).
    - Live Container End-to-End Workflow: **12/12 live checks passed** against containerized Nginx port 80 (`scratch/verify-live-container.mjs`).
  - **Final Stop Condition:**
    - Phase 11 complete. Project is in 100% submission-ready state for FA2 evaluation. Stopped per instructions. Do not create Phase 12 or perform public deployment without explicit user approval.
- **2026-10-25 — Event & Workshop Date Scheduling Enhancement:**
  - Integrated interactive calendar date picker (`event_date`), start time (`start_time`), end time (`end_time`), and venue location (`venue`) into `EventFormModal.tsx`.
  - Enables coordinators to define event/workshop dates directly upon creation, automatically executing atomic schedule creation (`POST /api/v1/events/:id/schedules`) linked to the new event.
  - Supports editing existing schedule dates when updating events, with seamless fallback for draft events without dates.
  - All 37 web tests and monorepo typecheck passed cleanly with 0 errors. Production bundle build verified (0 errors).
