# Development Rules — FestConnect

## 1. Product and architecture
- Build the agreed FestConnect scope from `PRD.md` and `ARCHITECTURE.md`.
- Layered modular backend; no microservices split.
- React frontend calls the API; it never connects directly to MySQL or Redis.
- Keep REST paths versioned with `/api/v1/`.
- Use controllers for HTTP concerns, services/domain operations for rules, repositories/DAO for SQL, and adapters for external providers.
- Preserve FA1 names and relationships; document every new support class/table as an additive extension.

## 2. TypeScript and code style
- TypeScript strict mode; avoid `any` unless documented and contained.
- Prefer small functions and explicit types/contracts.
- Keep server-only and client-only code separated.
- Use consistent formatting and linting; include scripts in package files.
- Use descriptive names: `RegistrationService`, `PaymentFactory`, `PaymentGatewayAdapter`, `ScheduleService`, `ScheduleObserver`, `EmailNotificationObserver`.
- Centralize enums/status values; avoid magic strings repeated across layers.
- Never swallow errors; translate known domain errors into stable API errors and avoid leaking stack traces.

## 3. API and validation
- Validate inputs at every public API boundary (path, query, body).
- Return consistent JSON error responses.
- Use correct status codes and don't return secrets, password hashes or provider credentials.
- Implement `GET` as read-only; `POST` for create/action; `PUT` for complete replacement; `PATCH` for partial change; `DELETE` for permitted removal.
- Keep `openapi.yaml` updated whenever routes/schema/status codes change.

## 4. Database
- Use parameterized SQL in every repository.
- Use migrations; do not rely on an undocumented manually created database.
- Include foreign keys, unique constraints, appropriate indexes and `NOT NULL` constraints where valid.
- Use transactions when registration/payment/pass transitions must be consistent.
- Use DECIMAL for money; never float/double for currency storage.
- Document any schema additions relative to FA1.
- Use safe seeds; never delete or reset a user's non-demo database.

## 5. Security
- Hash passwords with a standard password-hashing library.
- Enforce roles and resource ownership in backend services/middleware.
- Do not allow public registration with the ADMIN role.
- Never trust client-provided role, amount, payment result, owner identifier or pass authorization.
- Use parameterized SQL, security headers, payload limits, rate limits and safe CORS/cookie rules.
- Keep `.env` out of version control; provide `.env.example` placeholders.
- Mock payment and simulation endpoints exist only in development mode and are rejected when `NODE_ENV=production`.
- Never log passwords, tokens, payment credentials or Gmail secrets.

## 6. Payment and pass invariants
- Payment status starts pending and becomes successful only after a trusted server-side adapter verification.
- Payment status transitions are idempotent.
- A registration can have at most one current pass per documented rule; create a unique constraint for pass and registration identifiers.
- Pass endpoint checks ownership/role; never expose another participant's pass.
- The mock provider must be clearly labelled “Demo payment — no money is charged.”

## 7. Email / Observer
- Use `EmailService` interface with console and Gmail SMTP adapters.
- Schedule changes are persisted before observers are notified.
- Email failure must not corrupt the saved schedule or verified payment record.
- Local console mode must not claim that an email was actually delivered.

## 8. Cache
- Cache public event listings/details only.
- Use cache-aside with 60-second default TTL.
- Invalidate cache entries when affected event data changes.
- Redis unavailable means fall back to MySQL rather than failing event reads.
- Never cache private registrations, payment states or personalized passes publicly.

## 9. Testing and reporting
- Write unit tests for business rules and design patterns.
- Write API integration tests for auth, roles, duplicates, schedule conflict, payment success/failure and pass access.
- Test both positive and negative conditions.
- Run the relevant test/lint/type-check/build before declaring the phase complete.
- Record actual command output and results in `PROJECT_MEMORY.md` and `docs/TODO.md`.
- Do not claim implementation, deployment, performance or email delivery without evidence.
