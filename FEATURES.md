# Feature Inventory and Definition of Done
**Project:** FestConnect — Centralized Technical Fest & Event Registration System  
**Status:** **Fully Implemented & Verified (Phases 01–11 Complete)**  

Every feature listed below has been implemented in code, validated with automated tests, and verified live in the containerized deployment.

---

## P0 — Foundation
- [x] Monorepo/workspace structure and root scripts (`apps/web`, `apps/api`, `infra/nginx`).
- [x] TypeScript configuration, strict compiler static analysis (`noUnusedLocals`, `noUnusedParameters`), and `.gitignore`.
- [x] `.env.example` and validated environment configuration (Zod schema in `apps/api/src/config/env.ts`).
- [x] Docker Compose services for API, web, MySQL 8, and Redis 7 with isolated networking (`festconnect-data-net` with `internal: true`).
- [x] Health/readiness endpoints (`/api/health`, `/api/ready`) and comprehensive setup instructions in `README.md`.

## P1 — Authentication and roles
- [x] Participant sign-up (`POST /api/v1/auth/register`) and login/logout (`POST /api/v1/auth/login`, `POST /api/v1/auth/logout`).
- [x] Password hashing using bcrypt with secure salt rounds.
- [x] Role model: `PARTICIPANT`, `COORDINATOR`, `ADMIN` enforced server-authoritatively.
- [x] Coordinator/admin demo seed with safe local-only credentials (`demo1234`), strictly disabled in production.
- [x] Backend role and ownership enforcement via `requireAuth` and `requireRole` middleware.
- [x] Current-account endpoint (`GET /api/v1/auth/me`) and protected routes with Double-Submit CSRF cookie verification.

## P2 — Event catalogue and coordinator CRUD
- [x] Public event list (`GET /api/v1/events`) with pagination, type, and status filtering.
- [x] Search, category filter, and status filter validated with Zod schemas.
- [x] Create/update event (`POST /api/v1/events`, `PATCH /api/v1/events/:id`) restricted to assigned coordinators and admins.
- [x] Schedule representation preserving FA1 `Schedule` class and table (`GET/POST/PATCH /api/v1/events/:id/schedules`).
- [x] Event delete guards preventing deletion or modification if active registrations exist.
- [x] Error, empty, loading, and skeleton UI states in React SPA.

## P3 — Teams and membership
- [x] Create team (`POST /api/v1/teams`); creator automatically becomes team leader (`team.leader_id` and role `LEADER`).
- [x] Team detail/list restricted to eligible team members, event coordinators, or administrators.
- [x] Add/remove team members (`POST/DELETE /api/v1/teams/:id/members`) subject to leader permissions, duplicate checks, and registration status.
- [x] Team size validation enforced against selected event rules (`min_team_size <= count <= max_team_size`).

## P4 — Registration
- [x] Registration API (`POST /api/v1/registrations`) and responsive modal UI (`RegisterEventModal`).
- [x] Strict validation: event status (`ACTIVE`/`UPCOMING`), team membership bounds, duplicate team-event registration rejection (`409 Conflict`), and multi-member schedule conflict overlap detection (`400 Bad Request`).
- [x] Transactional registration persistence with server-authoritative initial state: `PENDING_PAYMENT`.
- [x] Standardized TRD-compliant HTTP error envelope (`201`, `400`, `401`, `403`, `404`, `409`, `422`).
- [x] Coordinator registration overview and attendee rosters in `CoordinatorDashboard`.

## P5 — Payment Factory and Adapter
- [x] `PaymentProcessor` interface and `PaymentFactory` pattern selecting provider via `PAYMENT_PROVIDER`.
- [x] `PaymentGatewayAdapter` interface and `MockPaymentGatewayAdapter` simulating `SUCCESS`, `FAILED`, and `PENDING` states.
- [x] Development-only mock provider with visible "Demo Payment — No Money Charged" label.
- [x] Server-side guard prevents mock completion routes when `NODE_ENV=production`.
- [x] Server-side fee calculation derived strictly from `event.registration_fee`; client-provided amounts and statuses rejected.
- [x] Idempotent atomic state transitions using row-level locking (`SELECT ... FOR UPDATE`) and virtual generated column `success_registration_id` with unique constraint `uk_payment_success_registration`.

## P6 — Digital pass and email/Observer
- [x] `PassReceipt` generated strictly once after verified successful payment within a database transaction.
- [x] Server-authoritative cryptographic pass token signed with HMAC-SHA256 (`PASS_HMAC_SECRET`) and timing-safe verification.
- [x] `ScheduleObserver` interface, `ScheduleSubject`, and `EmailNotificationObserver` implementing Gang-of-Four Observer pattern.
- [x] Schedule updates persist before notification is requested asynchronously.
- [x] Zero-dependency `ConsoleEmailAdapter` formatting ASCII email previews in server logs.
- [x] Optional `GmailSmtpAdapter` configured via environment variables.
- [x] Email delivery decoupled from database transactions; notification failures logged without rolling back registrations or passes. Anti-spam duplicate cooldown (`409 Conflict`) with force resend support.

## P7 — React UI
- [x] Event discovery (`/events`) and dedicated event detail views (`/events/:id`) with schedule timeline.
- [x] Auth screens (`/login`, `/register`) with role demo switchers and dynamic top navigation.
- [x] Dedicated team management screen (`/teams`) with member roster management.
- [x] Participant dashboard (`/dashboard`) integrating registration lists, payment modals, and pass links.
- [x] Dedicated Pass Screen (`/pass/:id`) with scannable QR code data URL, email status, and CSS `@media print` badge layout.
- [x] Coordinator dashboard (`/coordinator`) with event management, schedule forms, and live Gate Pass Verifier.
- [x] Fully responsive layout (mobile breakpoint `<768px`) with loading skeletons, error toasts, and empty states.
- [x] All UI actions route strictly through documented REST API endpoints (`/api/v1/*`); zero direct database access.

## P8 — Cache and quality
- [x] Redis 7.0 cache-aside for public event list, event detail, and schedule queries.
- [x] 60-second TTL configured via `CACHE_DEFAULT_TTL_SECONDS`.
- [x] Proactive cache invalidation purging affected event/schedule keys on coordinator mutations.
- [x] Transparent fallback to MySQL if Redis is stopped or unreachable.
- [x] Database indexes optimized via MySQL `EXPLAIN`: `idx_schedule_event_timeline` (eliminates filesort), `idx_event_type_status`, `idx_registration_event_status`.
- [x] Sensitive state data (passwords, payments, registrations, gate passes) is NEVER cached in Redis.

## P9 — Verification/security
- [x] 297 automated tests passing across 20 test suites (260 in `@festconnect/api`, 37 in `@festconnect/web`).
- [x] Unit tests for services, factories, adapters, and observers.
- [x] Integration tests for authentication, roles, events, teams, registrations, and payment/pass invariants.
- [x] UI component tests for screens, forms, modals, and error states.
- [x] Negative security tests: non-coordinators blocked with 403; cross-user pass access blocked; client payment tampering rejected; duplicate registration rejected; forged pass rejected with 400.
- [x] Parameterized SQL queries eliminating SQL injection; Double-Submit CSRF cookie defenses.
- [x] OpenAPI 3.0.3 specification (`openapi.yaml` and `docs/openapi.yaml`) synchronized and documenting all 35 endpoints.

## P10 — Demo readiness
- [x] Multi-tier Docker Compose (`docker compose -p festconnect up -d --build`) verified operational on port 80.
- [x] Database migrations (001, 002, 003) and safe demo seeds execute idempotently on startup.
- [x] Local-only demo credentials documented in `README.md` and `docs/DEMO_SCRIPT.md`.
- [x] Comprehensive documentation: `docs/FA2_SUBMISSION_DOSSIER.md`, `docs/DEMO_SCRIPT.md`, `docs/VIVA_QUESTIONS_AND_ANSWERS.md`, `docs/KNOWN_LIMITATIONS.md`.
- [x] All tests, typecheck, lint, build, and container checks executed and verified.
