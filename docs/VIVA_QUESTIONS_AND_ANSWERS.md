# FestConnect — Viva Defense Questions & Technical Answers (FA2)
**Course:** Object Oriented Modelling and System Design (BCER27PC02)  
**Units Covered:** Unit 3 (System & Service Design) & Unit 4 (Architectural Integration & Deployment)  
**Target Group Size:** 2 to 3 Students  

This guide provides technically deep, syllabus-aligned answers partitioned by project responsibility so that every group member can confidently defend their contribution.

---

## Member 1: System Architecture, Domain Logic & Design Patterns

### Q1. What architecture pattern did you choose and why?
**Answer:**  
We chose a **Layered Architecture (Modular Monolith)** with 5 layers: Presentation (React), Edge/Proxy (Nginx), API & Controllers (Express), Domain Services (Business Logic), and Persistence (Repositories + MySQL/Redis).  
For our scenario of 5,000 students and 50 events, operations such as event registration, mock payment, and pass generation must be strictly atomic. Layered architecture allows us to run these operations within a single ACID transaction (`SELECT ... FOR UPDATE`), eliminating the partial failure states and distributed rollback complexity (Sagas/2-Phase Commit) of microservices.

### Q2. What architecture pattern did you reject and why?
**Answer:**  
We rejected **Microservices**. A 5,000-student university fest has a peak load of ~200 req/sec, which a single Node.js instance easily handles. Microservices would introduce network serialization latency between services, require distributed tracing, and force eventual consistency on payments and gate ticket issuance. The operational overhead for a campus system was unjustified.

### Q3. Explain how you applied the Factory and Adapter design patterns.
**Answer:**  
We applied the **Factory Pattern** in `PaymentFactory` to instantiate the payment processor dynamically based on the `PAYMENT_PROVIDER` environment variable. In development, it supplies `MockPaymentGatewayAdapter`. In production, the factory guards the system and throws a `SecurityError` if mock payments are attempted.  
We applied the **Adapter Pattern** with `PaymentGatewayAdapter` and `EmailAdapter` to decouple our domain logic from third-party APIs. `MockPaymentGatewayAdapter` allows simulating SUCCESS, FAILED, and PENDING transaction outcomes without real financial charges, while `ConsoleEmailAdapter` prints ASCII email previews to the server log without external SMTP credentials.

### Q4. How does the Observer Pattern work in your system?
**Answer:**  
We implemented the Gang-of-Four **Observer Pattern** using `ScheduleSubject`, `ScheduleObserver`, and `EmailNotificationObserver`. When an event coordinator updates an event schedule (e.g., shifts time or changes venue), `ScheduleService.updateSchedule()` commits the database change and notifies the `ScheduleSubject`. The subject invokes `EmailNotificationObserver`, which asynchronously queries all confirmed attendees for that event and dispatches notification alerts. This decouples notification dispatch from schedule persistence.

### Q5. Where is the single point of truth for business rules?
**Answer:**  
The **Domain Services Layer** (`apps/api/src/services/`). The React UI contains zero authoritative business logic. All fee calculations, team size bounds, membership role invariance (leaders cannot leave active teams), and pass issuance eligibility are enforced server-authoritatively by the backend services.

---

## Member 2: Database Design, Caching & Performance Optimization

### Q6. How did you reconcile your FA1 Entity Relationship Diagram with your relational schema?
**Answer:**  
All core FA1 entities (`Participant`, `Event`, `Schedule`, `Team`, `TeamMember`, `Registration`, `Payment`, `PassReceipt`, `EventCoordinator`) were mapped 1:1 to MySQL InnoDB tables in migration `001_initial_fa1_schema.sql`.  
We added only minimal, documented technical fields: `password_hash` and `role` to `participant`, and `uk_team_event` unique constraint to prevent duplicate registrations. Financial records (`payment`) and gate passes (`pass_receipt`) use `ON DELETE RESTRICT` foreign keys to prevent accidental cascading deletion.

### Q7. Explain your caching strategy and how you handle cache invalidation.
**Answer:**  
We implemented the **Cache-Aside Pattern** using Redis 7.0 with a 60-second TTL (`CACHE_DEFAULT_TTL_SECONDS=60`) strictly for public read queries: event listings (`festconnect:events:list:*`), event details (`festconnect:events:detail:<id>`), and schedules (`festconnect:events:schedules:<id>`).  
On mutation (creating or updating an event or schedule), `EventService` and `ScheduleService` proactively invalidate matching key patterns using non-blocking Redis `SCAN`. Furthermore, sensitive state data (registrations, payments, passes) is **never cached**.

### Q8. What happens if the Redis cache server crashes or goes offline?
**Answer:**  
Redis is treated as an optional performance accelerator, not a single point of failure. The `RedisCacheService` is configured with `lazyConnect: true`, a 2000ms connection timeout, and zero offline queue buffering. If Redis is unreachable, errors are caught silently in the service layer, and queries fall back transparently to MySQL InnoDB, returning HTTP 200 OK without any service interruption.

### Q9. How did you optimize query execution in MySQL?
**Answer:**  
We analyzed execution plans with live MySQL `EXPLAIN` and created composite B-Tree indexes in migration `003_database_tuning.sql`:
1. `idx_schedule_event_timeline` on `schedule(event_id, event_date, start_time)` eliminates `Using filesort`, sorting timeline slots directly in the index tree.
2. `idx_event_type_status` on `event(event_type, status)` optimizes multi-column public filtering.
3. `idx_registration_event_status` on `registration(event_id, status)` optimizes coordinator roster retrieval.

### Q10. How do you prevent duplicate payments and race conditions?
**Answer:**  
We enforce a virtual generated column `success_registration_id` in MySQL with a unique constraint `uk_payment_success_registration`. When a payment succeeds, the column computes the registration ID; for failed or pending payments, it computes `NULL`. Since MySQL allows multiple `NULL` values in a unique constraint but enforces uniqueness for non-null values, it is mathematically impossible to record more than one SUCCESS payment for any registration, even under concurrent burst attempts.

---

## Member 3: Frontend Architecture, Security & Containerized DevOps

### Q11. Why did you choose React SPA over traditional HTML or HTMx?
**Answer:**  
A tech fest portal requires rich client interactivity: live category filtering, modal wizard dialogs for simulated payments, instant role switching for campus organizers, and client-side QR generation. Traditional server-side HTML requires full page reloads on every interaction, and HTMx requires server-side rendering of binary QR images. React 18 with Vite provides a compiled, lightweight bundle (78.15 kB gzip) with client-side canvas QR rendering and CSS `@media print` support for gate tickets.

### Q12. How do you prevent ticket fraud and forged passes?
**Answer:**  
Gate passes are never generated or signed on the client. When a payment transitions to `CONFIRMED`, `PassService` generates a deterministic pass number (`FEST-2026-REG...`) and cryptographically signs a payload containing the registration ID, event ID, and issue timestamp using HMAC-SHA256 with a 32-character secret key (`PASS_HMAC_SECRET`). When scanned at the gate, the server verifies the signature using `crypto.timingSafeEqual` and checks that the registration is in `CONFIRMED` status. Forged pass numbers are rejected with HTTP 400.

### Q13. How does your authentication and CSRF protection work?
**Answer:**  
We use stateless JWT authentication stored in an `HttpOnly`, `SameSite=Lax` cookie (`festconnect_token`), which shields tokens from JavaScript XSS theft. To protect mutative cookie requests (POST, PATCH, DELETE) against Cross-Site Request Forgery, we implement the **Double-Submit CSRF Cookie Pattern**. The server sets a readable `festconnect_csrf` cookie, and client requests must include this token in the `X-CSRF-Token` header. The middleware verifies token equality using timing-safe comparison and checks Origin/Referer headers against `CORS_ORIGIN`.

### Q14. Explain your Docker Compose network architecture and security isolation.
**Answer:**  
We implement three distinct Docker bridge networks:
1. `festconnect-frontend-net`: Bridges external client traffic on port 80 to Nginx.
2. `festconnect-backend-net`: Connects Nginx and the Express API for internal reverse proxying.
3. `festconnect-data-net`: Configured with `internal: true`.  
Neither MySQL (3306) nor Redis (6379) are exposed to host interfaces or the external internet. Only the `api` container can communicate with the database and cache. The only publicly open port is web entrypoint port 80.

### Q15. How do you guarantee database migrations run safely in Docker?
**Answer:**  
The Express API container uses an entrypoint script (`apps/api/docker-entrypoint.sh`) that executes `node dist/db/migrate.js` before launching the server. The migration script has a 15-attempt retry loop with exponential backoff to wait for MySQL health, creates the `schema_migrations` tracking table, and applies unapplied `.sql` scripts idempotently. On subsequent container restarts, the script recognizes that migrations 001, 002, and 003 are already applied and skips them without modifying existing data.

---

## General Technical Questions (Any Member)

### Q16. How many automated tests exist in the project, and what do they verify?
**Answer:**  
The repository has **297 automated tests across 20 test suites** (260 in `@festconnect/api` and 37 in `@festconnect/web`), with a 100% pass rate.  
They verify live MySQL 8 schema constraints, password hashing, JWT token validation, Double-Submit CSRF defenses, event/schedule CRUD, team leader invariance, mock payment state transitions, HMAC-SHA256 pass verification, email notification duplicate cooldown, Redis cache-aside invalidation and outage fallback, and the complete 12-step participant-to-coordinator integration workflow.

### Q17. What are the key Architecture Decision Records (ADRs) you created?
**Answer:**  
We documented 5 formal ADRs:
1. **ADR-001:** Layered Architecture Pattern (Modular Monolith) vs Microservices.
2. **ADR-002:** Redis Cache-Aside with 60s TTL and Graceful Fallback vs Direct DB Reads.
3. **ADR-003:** React 18 Single Page Application (SPA) vs Traditional Multi-Page UI vs HTMx.
4. **ADR-004:** Server-Authoritative Cryptographic HMAC-SHA256 Digital Pass vs Client QR.
5. **ADR-005:** Decoupled Observer Notification Pattern with Console Adapter Fallback vs Blocking SMTP.

### Q18. What are the main limitations of your academic implementation?
**Answer:**  
1. *Payments:* We use `MockPaymentGatewayAdapter` for academic safety; live payments require third-party sandbox credentials (Razorpay/Stripe).
2. *Email:* Emails default to `ConsoleEmailAdapter` printing ASCII previews; live SMTP delivery requires Gmail credentials in `.env`.
3. *Single-Node Infrastructure:* The system runs as a multi-tier Docker Compose stack on a single workstation node; horizontal API autoscaling across multiple physical servers would require Kubernetes or AWS ECS with CloudFront CDN.
