# Technical Requirements Document (TRD)

**Version:** 0.1  
**Status:** Draft implementation baseline

## 1. Selected technology stack

This pack fixes a practical full-stack demonstration stack because the supplied project context did not mandate a backend framework. Confirm this with the guide before coding; if Java/Spring Boot is required, update this document and the prompts before scaffold.

| Layer | Selection | Reason |
|---|---|---|
| Frontend | React + TypeScript + Vite | Component UI; typed API models; straightforward dev server/build. |
| Routing | React Router | Event listing, event detail, auth, team, registration and pass pages. |
| Styling | Plain CSS or CSS modules, design tokens | Keep the project simple without needing a large UI framework. |
| Backend | Node.js LTS + Express + TypeScript | Familiar REST API server with typed services/controllers. |
| Validation | Zod or an equivalent schema validator | Validate request bodies, params and environment settings. |
| SQL driver | `mysql2/promise` | Parameterized MySQL queries and explicit DAO/repository layer. |
| Database | MySQL 8-compatible server | Relational constraints and transactions for domain data. |
| Cache | Redis | Optional cache-aside TTL for public event reads only. |
| Password hashing | bcrypt/bcryptjs | Store password hashes, never plaintext passwords. |
| Auth | Short-lived signed JWT in a secure HttpOnly cookie or equivalent reviewed approach | Authenticated sessions without exposing credentials in UI storage. If cookie auth is selected, enforce same-site/Origin/CSRF protections for write requests. |
| Frontend serving/proxy | Nginx | Serve production React build and route `/api/` to backend; can apply simple edge rate limiting. |
| Email | Nodemailer with Google Gmail SMTP when configured; console preview adapter otherwise | Works in local demo without exposing secrets or requiring Gmail credentials. |
| Payment | `PaymentGateway` interface + development-only mock adapter | Demonstrates Factory/Adapter/verification flow without real charges. |
| Tests | Node test runner or Vitest + Supertest; Vitest + React Testing Library for UI; optional Playwright E2E | Automated service/API/UI verification. Pick one consistent test stack during scaffold. |
| Local orchestration | Docker Compose | Repeatable web/API/MySQL/Redis demo. |

Use currently supported stable versions compatible with one another at implementation time; commit package lockfiles. Do not blindly pin stale versions from examples.

## 2. Repository layout target

```text
project/
├── apps/
│   ├── web/                  # React + TypeScript + Vite
│   └── api/                  # Express + TypeScript
├── infra/
│   ├── nginx/                # Static serving, /api reverse proxy/rate limits
│   └── mysql/                # Optional init scripts; schema migrations remain versioned
├── docs/
├── prompts/
├── scripts/                  # setup/seed/health helpers when useful
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json              # optional npm workspace scripts
├── AGENTS.md
├── PROJECT_MEMORY.md
└── README.md
```

The implementation agent may adjust this layout if it documents the change and retains the same clean frontend/backend/infra boundaries.

## 3. Architecture constraints

- Layered modular application, not microservices.
- Controller → service/domain logic → repository/DAO → MySQL.
- External payment and email integrations sit behind adapters/interfaces.
- Nginx is the entry/reverse-proxy component for the local demo. The logical architecture describes load balancing and gateway responsibilities; a single local API instance does not prove horizontal scaling.
- Redis is optional: disabling/unavailable cache must fall back to MySQL.
- No Kafka, mobile app, service registry, config server, dedicated monitoring/central logging product, or external secrets-management product in initial scope.

## 4. API standards

- Base prefix `/api/v1`.
- JSON request/response for API routes.
- Use GET for reads, POST for creation/actions, PUT for complete replace semantics, PATCH for partial updates and DELETE for deletion where business rules permit.
- Validate bodies, route params and query params with schemas.
- Use stable error shape, e.g. `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }`; do not leak stack traces in production.
- Document the implemented endpoints in OpenAPI 3 and keep it synchronized with code.
- Common codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502.
- Public event GET routes can be anonymous; write routes are role-protected. Apply object ownership checks to registrations, teams and passes.

## 5. Proposed API route inventory

### Authentication
- `POST /api/v1/auth/register` — create participant account/profile.
- `POST /api/v1/auth/login` — start authenticated session.
- `POST /api/v1/auth/logout` — clear session.
- `GET /api/v1/auth/me` — current account and role.

### Events and schedules
- `GET /api/v1/events`, `GET /api/v1/events/:eventId`.
- `POST /api/v1/events`, `PUT /api/v1/events/:eventId`, `PATCH /api/v1/events/:eventId`, `DELETE /api/v1/events/:eventId` for coordinator/admin.
- Schedule fields may be included in event management, but the code must preserve the `Schedule` domain entity/table if it exists in FA1.

### Participants and teams
- `GET /api/v1/participants/:participantId` (authorized).
- `POST /api/v1/teams`, `GET /api/v1/teams/:teamId`.
- `POST /api/v1/teams/:teamId/members`.
- `DELETE /api/v1/teams/:teamId/members/:participantId`.

### Registrations, payments, passes
- `POST /api/v1/registrations`.
- `GET /api/v1/registrations`, `GET /api/v1/registrations/:registrationId` with ownership/role checks.
- `PATCH /api/v1/registrations/:registrationId` only for explicitly permitted state transitions such as cancellation.
- `POST /api/v1/payments`, `GET /api/v1/payments/:paymentId`.
- `GET /api/v1/registrations/:registrationId/pass`.
- A mock-completion endpoint may exist only when `NODE_ENV=development` and `PAYMENT_PROVIDER=mock`; it must not be mounted in production.

## 6. Data and consistency

- Use MySQL foreign keys, appropriate unique constraints, explicit transaction boundaries and migrations.
- Use DECIMAL for currency values, not floating point.
- Store timestamps consistently (UTC internally; display in local timezone at UI boundary).
- Never trust client-provided payment amounts, roles, paid status or pass IDs without server-side authorization/validation.
- Suggested unique constraint: `(team_id, event_id)` in registrations, only after confirming this matches the FA1 business rule.
- Store a unique provider transaction identifier when available.
- Store a unique pass number/token; expose only a non-guessable pass identifier/token and enforce access rules.
- Avoid collecting unnecessary sensitive participant data. Exact fields from the FA1 schema take priority.

## 7. Authentication and security requirements

- Hash passwords with a suitable password-hashing library.
- Use HttpOnly, SameSite cookies if cookie-based JWT/session is selected; enable Secure in production and protect state-changing routes from CSRF/origin misuse. If bearer auth is selected instead, keep tokens out of persistent browser storage where feasible and document its risk trade-off.
- Enforce roles in the API and ownership per resource.
- Use HTTPS in deployed environments; localhost may use HTTP for development.
- Parameterize every SQL value; never concatenate user-provided data into SQL.
- Add Helmet/security headers, request-size limits, rate limiting for login and sensitive endpoints, input validation, and consistent errors.
- Never put secrets into git, client-side code, logs, fixtures or screenshots.

## 8. Payment adapter requirements

- Use `PaymentGateway` interface and `PaymentGatewayAdapter` to isolate the provider protocol.
- Use `PaymentFactory` to choose the appropriate payment processor/method, not to manufacture fake verification.
- Default local demo to `MockPaymentGatewayAdapter` with an explicit UI badge such as “Demo payment — no money is charged”.
- Only permit simulated outcomes in development mode. Production must reject all mock completion routes/actions.
- Success must be server-derived and idempotent. Verify the transaction reference and amount against persisted payment/registration state.
- Create the pass only after the verified successful payment transition when payment is required.
- Do not add a real provider until one is selected and its documented signature/webhook or verification flow is implemented.

## 9. Email requirements

- `EmailService` interface with `ConsoleEmailAdapter` (default locally) and `GmailSmtpAdapter` (when environment credentials are present).
- Email failure must not roll back an already valid schedule update or confirmed payment/pass transaction. Report delivery failure honestly and allow a safe retry path or visible demo preview.
- Gmail user/app password or other credentials must come from environment configuration. Do not commit any credential.
- Schedule update notification uses Observer pattern: after saved schedule changes, notify the in-process observer, which identifies participants registered for the event and asks the email service to deliver messages. No message broker is included.

## 10. Cache requirements

- Cache-aside Redis keys, e.g. `events:list:<normalizedQuery>` and `events:detail:<eventId>`.
- Default TTL: 60 seconds, configurable by env.
- Invalidate affected event detail and list keys after event create/update/delete or schedule/visibility changes.
- Do not cache private user data, registration state, payment status or individual pass response.
- Fall back to MySQL if Redis is down; log a concise warning without secrets.

## 11. Quality gates

Before each phase is complete:
- TypeScript type check passes.
- Lint and tests for changed code pass where scripts are configured.
- Build passes for apps changed by that phase.
- Migrations run from an empty local database and seed scripts are repeatable/safe.
- OpenAPI matches the route implementation.
- `.env.example` is complete, while `.env` is git-ignored.
- `PROJECT_MEMORY.md` and `docs/TODO.md` are updated with actual verification results.
