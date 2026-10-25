# Product Requirements Document (PRD)

**Product:** FestConnect — A Centralized Technical Fest & Event Registration System  
**Version:** 0.1 (implementation baseline)  
**Status:** Draft — validate with project group and guide  
**Course:** OOMSD / BCER27PC02

## 1. Product overview

FestConnect is a web application for a college technical fest. It centralizes public event discovery, participant/team management, event registration, payment-status tracking, digital pass generation and email communication. The MVP is a full-stack academic demonstration; it is not assumed to be production payment software.

## 2. Problem statement

When events are managed through separate forms and manual processes, participants can receive inconsistent information, duplicate registration attempts may occur, teams may exceed permitted sizes, schedule clashes may be missed, and payment confirmation/pass distribution may become manual. FestConnect provides a common portal and a validated registration workflow.

## 3. Goals

- Provide a single event catalogue.
- Allow participants to create and manage teams.
- Allow a valid team to register for an eligible event.
- enforce team-size, duplicate registration and schedule checks in the backend.
- Record payment attempts and verified outcomes.
- Issue a digital pass only after the configured payment rule is satisfied.
- Allow authorized coordinators to manage events and schedules.
- Send or preview confirmation and schedule-update emails.
- Demonstrate an end-to-end flow through React, REST APIs, MySQL and containers.

## 4. User roles

### Visitor
Can view public event listings/details. Cannot create registrations or view private records.

### Participant
Can sign in, maintain profile, create teams, manage membership, register eligible teams, initiate payment, view own registrations and retrieve authorized passes.

### Event Coordinator
Can create/update events and schedules, review relevant registrations, and trigger schedule-change notifications, subject to authorization rules.

### Administrator
Can manage users/roles and system-wide event administration in the demo. Admin-only functions must not be available to ordinary participants.

## 5. MVP functional requirements

| ID | Requirement | Acceptance condition |
|---|---|---|
| FR-01 | Authentication | Users can log in/logout; password hashes, not plaintext passwords, are stored. |
| FR-02 | Role protection | Backend enforces participant/coordinator/admin permissions. |
| FR-03 | Event listing | Public event listing supports event details and useful filtering/pagination. |
| FR-04 | Event detail | A visitor can view an individual event's description, schedule/venue, team rules and fee. |
| FR-05 | Event management | Coordinator/admin can create and update events; deletion follows registration constraints. |
| FR-06 | Team creation | Signed-in participant can create a team as the leader. |
| FR-07 | Team membership | Authorized leader can add/remove eligible members within event/team rules. |
| FR-08 | Registration | Team can register for an event only if eligible. Duplicate team/event registration is prevented. |
| FR-09 | Schedule validation | Registration checks applicable schedule-conflict rules in the backend. |
| FR-10 | Payment attempt | A registration can start a payment attempt and see its state. Local demo uses a clearly labelled mock provider. |
| FR-11 | Payment verification | Only server-verified provider results can mark a payment successful. Client payload cannot set success. |
| FR-12 | Digital pass | PassReceipt is generated once only after successful payment when payment is required. |
| FR-13 | Email | Confirmation/schedule emails are previewed in development; Gmail delivery is optional and requires valid environment credentials. |
| FR-14 | API contract | Core APIs use `/api/v1/`, JSON, validation and consistent error responses. |
| FR-15 | Cache | Optional Redis cache-aside with 60-second TTL applies only to public event listing/detail data. |
| FR-16 | Deployment | Web, API, MySQL and optional Redis can run locally through Docker Compose. |
| FR-17 | Health/readiness | API exposes a health endpoint; database readiness is checked without leaking secrets. |
| FR-18 | Audit-friendly state | Registration/payment transitions are recorded consistently and invalid transitions are rejected. |

## 6. Primary user journeys

### Journey A — Browse events
1. Open the event catalogue.
2. Search/filter events.
3. View event details and rules.

### Journey B — Register and obtain pass
1. Sign in as a participant.
2. Create/select team and ensure valid team membership.
3. Submit registration.
4. Backend validates event, team, duplicate registration and schedule conflicts.
5. Initiate test payment.
6. Backend verifies the test result and updates payment state.
7. Generate and persist the pass receipt after success.
8. Retrieve the pass and preview/receive email confirmation.

### Journey C — Manage schedule
1. Coordinator signs in.
2. Creates or updates event date/time/venue.
3. The change is persisted.
4. Observer-based notification handling identifies affected registrations and requests email delivery.

## 7. Non-functional requirements

- **Security:** password hashing, authentication, role/ownership checks, validation, parameterized SQL, secure cookie/token handling, no secrets in source.
- **Maintainability:** layered/modular backend, clear controller/service/repository boundaries, TypeScript, tests and documentation.
- **Performance:** indexing and public-event caching; avoid claiming a speedup without measurement.
- **Scalability:** backend is designed to be stateless so more identical instances can run behind a load balancer.
- **Reliability:** database transactions protect related state updates; cache/email failure must not corrupt registrations.
- **Usability:** clear loading/empty/error/success states, responsive layout, accessible labels and confirmation feedback.
- **Portability:** repeatable local setup via Docker Compose and documented environment variables.

## 8. Planning assumptions (not measurements)

The current presentation plan uses 1,500 participants, 25 active events, 250 concurrent visitors, a peak of 30 API requests per second, brief registration bursts of 5 attempts per second and approximately 5,000 registrations per fest cycle. These are discussion assumptions and must be labelled as such until tested/confirmed.

A performance goal discussed is API response time below 2 seconds at the 95th percentile under a defined test workload. It is not a measured result.

## 9. Out of scope for the first demo

- Native mobile application.
- Microservices split or separate deployable service per domain.
- Kafka or another message broker.
- Service registry, configuration server, dedicated CI/CD platform, monitoring stack, centralized logging service, or Vault/AWS KMS deployment.
- Live real-money transactions without a selected provider, credentials, webhook/signature verification and explicit testing.
- Production-grade refunds, tax invoicing, identity verification, QR scanner/check-in device workflow, or institution-wide SSO unless separately approved.

Basic console logs, environment-based configuration, input validation and safe secret handling are still required.

## 10. Demo acceptance criteria

The MVP is accepted for demonstration when a user can browse events, log in, create a team, add a member, register without duplicate/team/schedule violations, complete the mock payment path in development, observe database state change, retrieve a pass only after success, and preview confirmation email. A coordinator must be able to update an event or schedule through protected screens/API. Core automated tests and setup documentation must pass.

## 11. Risks and dependencies

- Actual FA1 attribute names/relationships must be checked against the original class and ER diagram before migrations are finalized.
- Backend framework selection must be confirmed with the guide; this pack proposes Node.js/Express/TypeScript.
- Real payment provider and Gmail credentials are not provided; mock payment and console email mode are the safe default.
- Team leadership, event cancellation/refunds, capacity and schedule-conflict rules need group confirmation.
