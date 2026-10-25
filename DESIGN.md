# FestConnect — Product & Interaction Design

**Status:** Proposed design for MVP demo.

## 1. UX principles

- Keep event discovery public and easy to navigate.
- Show important rules before registration: fee, team size, date/time, venue and capacity/status where available.
- Use explicit states: loading, empty, error, success, pending payment, failed payment, cancelled registration, pass ready.
- Keep business rules in the backend; frontend checks are for user feedback, not security.
- Make the application responsive and accessible (labels, keyboard focus, contrast, clear errors).
- Label mock transactions visibly: “Demo payment — no money is charged.”

## 2. Main screens

### A. Event Discovery (`/events`)
Components: brand/header, search field, category/event-type filter, event cards, status/fee/team-size/date summary, pagination if needed, empty/error/loading states.

API calls:
- `GET /api/v1/events?search=&eventType=&page=&limit=`
- `GET /api/v1/events/:eventId` when opening detail.

Public cache may be used on the server for listing/detail responses. Client-side stale data must not be used to authorize registration.

### B. Event Detail (`/events/:eventId`)
Shows event name, description, event type, eligibility, team-size limits, fee, schedule, venue and registration availability. `Register` redirects to login if signed out and then proceeds to team/registration flow.

API: `GET /api/v1/events/:eventId`.

### C. Authentication (`/login`, `/register`)
Participant registration and login. Coordinator/admin accounts are seeded only for local demo or created via authorized admin process. Public sign-up must never allow selecting the `ADMIN` role.

APIs: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.

### D. Team Management (`/teams`, `/teams/new`, `/teams/:teamId`)
Show teams owned/led by the signed-in participant and member list. Allow team create/add/remove operations only after backend ownership/role checks.

APIs: `POST /api/v1/teams`, `GET /api/v1/teams/:teamId`, `POST /api/v1/teams/:teamId/members`, `DELETE /api/v1/teams/:teamId/members/:participantId`.

### E. Registration (`/registrations/new?eventId=...`)
Shows selected event, team selection, applicable team-size constraints, fee and validation feedback. Submitting the form starts server-side validation.

API: `POST /api/v1/registrations` with `eventId` and `teamId`; do not accept authoritative amount/status from the client.

### F. Payment and result (`/registrations/:registrationId/payment`)
Shows amount computed by the backend, payment method and current status. Mock mode shows a persistent demo banner and buttons/actions that call only a development-enabled mock workflow. Do not simulate client-side setting `SUCCESS` in production.

APIs: `POST /api/v1/payments`, `GET /api/v1/payments/:paymentId`. Any mock completion route is development-only and not part of public production API.

### G. Pass (`/registrations/:registrationId/pass`)
Displays pass number and QR code/token only if the backend confirms ownership and eligible payment/registration state. Provide print/download option if implemented. Never rely on an unguessable-looking URL alone as authorization.

API: `GET /api/v1/registrations/:registrationId/pass`.

### H. Coordinator Dashboard (`/coordinator`)
Protected event CRUD, schedule edits and registration overview. Show warnings for changes affecting registered participants and trigger observer-based email requests only after saving valid changes.

APIs: `POST /api/v1/events`, `PUT/PATCH /api/v1/events/:eventId`, `DELETE /api/v1/events/:eventId`, plus appropriate event/registration read endpoints.

## 3. Design tokens and visual direction

- Brand feel: college-tech event platform; clean, approachable, professional.
- Color direction: deep green for primary actions; dark navy/green text; pale green/blue surfaces; amber for warnings/pending payment; red for destructive/failure states.
- Use consistent spacing, corner radius, headings, input heights and button states.
- Avoid heavy decorative cards or fake dashboards. Keep screens focused on event info and the registration journey.
- Reuse components: `AppHeader`, `EventCard`, `StatusBadge`, `FormField`, `Alert`, `LoadingState`, `ErrorState`, `TeamMemberList`, `PaymentStatusPanel`, `PassCard`.

## 4. API-to-screen mapping

| Screen | API endpoints |
|---|---|
| Event discovery | `GET /api/v1/events` |
| Event detail | `GET /api/v1/events/:eventId` |
| Login/register | `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` |
| Team list/detail | `GET /api/v1/teams`, `GET /api/v1/teams/:teamId` (add routes only if implemented) |
| Team creation/membership | `POST /api/v1/teams`, `POST /api/v1/teams/:teamId/members`, `DELETE /api/v1/teams/:teamId/members/:participantId` |
| Registration | `POST /api/v1/registrations`, `GET /api/v1/registrations`, `GET /api/v1/registrations/:registrationId` |
| Payment | `POST /api/v1/payments`, `GET /api/v1/payments/:paymentId` |
| Digital pass | `GET /api/v1/registrations/:registrationId/pass` |
| Coordinator | Event CRUD, schedule and authorized registration read APIs |

Any additional route must be reflected in the OpenAPI document and relevant docs.

## 5. UI state rules

- Disable duplicate submit buttons while request is pending.
- Present backend validation messages beside the relevant form or as a clear summary.
- Treat `409 Conflict` as a business-rule conflict, such as duplicate registration.
- Treat `401` as a session/authentication issue; do not silently show private data.
- Treat payment as `PENDING` until a server-verified outcome is returned.
- Show pass link only once the backend confirms the pass is available.
- If Gmail is running in console mode, show “Email preview generated in server logs” rather than “Email sent”.

## 6. Design patterns in the UI-facing flow

- Factory selects the server-side payment processor.
- Adapter isolates provider-specific payment operations.
- Observer reacts to persisted schedule updates and asks email service to deliver notifications.
- React components should not implement these business patterns directly or contain database/business rules.

## 7. Data Dictionary & FA1 Schema Reconciliation

This Data Dictionary defines the verified physical relational tables implementing the conceptual and logical entities from the original FA1 documents: `ER Diagram.drawio`, `UMl_Project_final.drawio`, `usecase.drawio`, `SequenceDiagram`, and `project _crc.drawio`.

### 1. `participant` (Logical Entity: `PARTICIPANT` / `Participant`)
| Column Name | Data Type | Nullable | Key / Constraint | Provenance & Notes |
|---|---|---|---|---|
| `participant_id` | `INT` | NO | `PRIMARY KEY AUTO_INCREMENT` | Confirmed: ER (`participant_id`), UML (`participantId`) |
| `first_name` | `VARCHAR(100)` | NO | | Confirmed: ER (`First_Name`) |
| `last_name` | `VARCHAR(100)` | NO | | Confirmed: ER (`last_Name`) |
| `email` | `VARCHAR(255)` | NO | `UNIQUE KEY` | Confirmed: ER (`email`), UML (`email`) |
| `phone` | `VARCHAR(20)` | YES | | Confirmed: UML (`phone`) |
| `college_name` | `VARCHAR(255)` | YES | | Confirmed: UML (`collegeName`) |
| `date_of_birth` | `DATE` | YES | | Confirmed: ER (`date_of_birth`), basis for derived `age` |
| `password_hash` | `VARCHAR(255)` | NO | | Technical Additive Extension for secure authentication |
| `role` | `ENUM` | NO | DEFAULT 'PARTICIPANT' | Technical Additive Extension ('PARTICIPANT', 'COORDINATOR', 'ADMIN') |
| `created_at` | `TIMESTAMP` | NO | DEFAULT CURRENT_TIMESTAMP | Technical Additive Extension |
| `updated_at` | `TIMESTAMP` | NO | ON UPDATE CURRENT_TIMESTAMP | Technical Additive Extension |

### 2. `participant_skill` (Logical Entity: `Participant_Skill`)
| Column Name | Data Type | Nullable | Key / Constraint | Provenance & Notes |
|---|---|---|---|---|
| `participant_id` | `INT` | NO | `PRIMARY KEY`, `FK -> participant` | Confirmed: ER multivalued attribute / weak entity |
| `skill` | `VARCHAR(100)` | NO | `PRIMARY KEY` | Confirmed: ER (`skill`) |
| `created_at` | `TIMESTAMP` | NO | DEFAULT CURRENT_TIMESTAMP | Technical Additive Extension |

### 3. `event_coordinator` (Logical Entity: `EVENT_COORDINATOR` / `EventCoordinator`)
| Column Name | Data Type | Nullable | Key / Constraint | Provenance & Notes |
|---|---|---|---|---|
| `coordinator_id` | `INT` | NO | `PRIMARY KEY AUTO_INCREMENT` | Confirmed: ER (`coordinator_id`), UML (`coordinatorId`) |
| `participant_id` | `INT` | YES | `FK -> participant` | Technical link connecting coordinator to login account |
| `name` | `VARCHAR(100)` | NO | | Confirmed: ER (`name`), UML (`name`) |
| `email` | `VARCHAR(255)` | NO | `UNIQUE KEY` | Confirmed: ER (`email`), UML (`email`) |
| `phone` | `VARCHAR(20)` | YES | | Confirmed: ER (`Phone`) |
| `created_at` | `TIMESTAMP` | NO | DEFAULT CURRENT_TIMESTAMP | Technical Additive Extension |
| `updated_at` | `TIMESTAMP` | NO | ON UPDATE CURRENT_TIMESTAMP | Technical Additive Extension |

### 4. `event` (Logical Entity: `EVENT` / `Event`)
| Column Name | Data Type | Nullable | Key / Constraint | Provenance & Notes |
|---|---|---|---|---|
| `event_id` | `INT` | NO | `PRIMARY KEY AUTO_INCREMENT` | Confirmed: ER (`event_id`), UML (`eventId`) |
| `coordinator_id` | `INT` | YES | `FK -> event_coordinator` | Confirmed: ER relationship `MANAGES` (Coordinator -> Event) |
| `event_name` | `VARCHAR(255)` | NO | | Confirmed: ER (`event_name`), UML (`title`) |
| `event_type` | `VARCHAR(100)` | NO | | Confirmed: ER (`event_type`), UML (`eventType`) |
| `description` | `TEXT` | YES | | Confirmed: ER (`description`) |
| `min_team_size` | `INT` | NO | DEFAULT 1 | Confirmed: UML (`minTeamSize`) |
| `max_team_size` | `INT` | NO | DEFAULT 1 | Confirmed: ER (`max_team_size`), UML (`maxTeamSize`) |
| `registration_fee` | `DECIMAL(10,2)` | NO | DEFAULT 0.00 | Confirmed: ER (`registration_fee`); exact currency representation |
| `status` | `ENUM` | NO | DEFAULT 'UPCOMING' | Inferred: event lifecycle ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED') |
| `created_at` | `TIMESTAMP` | NO | DEFAULT CURRENT_TIMESTAMP | Technical Additive Extension |
| `updated_at` | `TIMESTAMP` | NO | ON UPDATE CURRENT_TIMESTAMP | Technical Additive Extension |

### 5. `schedule` (Logical Entity: `SCHEDULE` / `Schedule`)
| Column Name | Data Type | Nullable | Key / Constraint | Provenance & Notes |
|---|---|---|---|---|
| `schedule_id` | `INT` | NO | `PRIMARY KEY AUTO_INCREMENT` | Confirmed: ER (`schedule_id`), UML (`scheduleId`) |
| `event_id` | `INT` | NO | `FK -> event` | Confirmed: ER relationship `HAS` (Event -> Schedule) |
| `event_date` | `DATE` | NO | | Confirmed: ER (`event_date`), UML (`day`) |
| `start_time` | `TIME` | NO | | Confirmed: ER (`start_time`), UML (`slotStart`) |
| `end_time` | `TIME` | NO | | Confirmed: ER (`end_time`), UML (`slotEnd`) |
| `venue` | `VARCHAR(255)` | NO | | Confirmed: ER (`venue`), UML (`venue`) |
| `created_at` | `TIMESTAMP` | NO | DEFAULT CURRENT_TIMESTAMP | Technical Additive Extension |
| `updated_at` | `TIMESTAMP` | NO | ON UPDATE CURRENT_TIMESTAMP | Technical Additive Extension |

### 6. `team` (Logical Entity: `TEAM` / `Team`)
| Column Name | Data Type | Nullable | Key / Constraint | Provenance & Notes |
|---|---|---|---|---|
| `team_id` | `INT` | NO | `PRIMARY KEY AUTO_INCREMENT` | Confirmed: ER (`team_id`), UML (`teamId`) |
| `team_name` | `VARCHAR(150)` | NO | | Confirmed: ER (`Team Name`), UML (`teamName`) |
| `leader_id` | `INT` | NO | `FK -> participant` | Confirmed: ER relationship `LEADS` (Participant -> Team) |
| `status` | `ENUM` | NO | DEFAULT 'FORMING' | Confirmed: UML (`status`: 'FORMING', 'READY', 'REGISTERED', 'DISBANDED') |
| `created_at` | `TIMESTAMP` | NO | DEFAULT CURRENT_TIMESTAMP | Confirmed: ER (`created_at`) |
| `updated_at` | `TIMESTAMP` | NO | ON UPDATE CURRENT_TIMESTAMP | Technical Additive Extension |

### 7. `team_member` (Logical Entity: `TEAM_MEMBER` / `TeamMember`)
| Column Name | Data Type | Nullable | Key / Constraint | Provenance & Notes |
|---|---|---|---|---|
| `team_member_id` | `INT` | NO | `PRIMARY KEY AUTO_INCREMENT` | Confirmed: ER (`team_member_id`), UML (`teamMemberId`) |
| `team_id` | `INT` | NO | `FK -> team` | Confirmed: ER & UML (`team_id`) |
| `participant_id` | `INT` | NO | `FK -> participant` | Confirmed: ER & UML (`participant_id`) |
| `role` | `VARCHAR(50)` | NO | DEFAULT 'MEMBER' | Confirmed: ER (`role`), UML (`roleInTeam`) |
| `joined_at` | `TIMESTAMP` | NO | DEFAULT CURRENT_TIMESTAMP | Confirmed: ER (`joined_at`), UML (`joinedAt`) |
| — | — | — | `UNIQUE KEY (team_id, participant_id)` | Enforces unique participant membership per team |

### 8. `registration` (Logical Entity: `REGISTRATION` / `RegistrationManager`)
| Column Name | Data Type | Nullable | Key / Constraint | Provenance & Notes |
|---|---|---|---|---|
| `registration_id` | `INT` | NO | `PRIMARY KEY AUTO_INCREMENT` | Confirmed: ER (`registration_id`), UML (`RegistrationManager`) |
| `team_id` | `INT` | NO | `FK -> team` | Confirmed: ER (`team_id(FK)`) |
| `event_id` | `INT` | NO | `FK -> event` | Confirmed: ER (`event_id(FK)`) |
| `registration_date`| `TIMESTAMP` | NO | DEFAULT CURRENT_TIMESTAMP | Confirmed: ER (`registration_date`), UML (`registrationDate`) |
| `status` | `ENUM` | NO | DEFAULT 'PENDING_PAYMENT' | Confirmed: ER (`status`), UML (`registrationStatus`) |
| `created_at` | `TIMESTAMP` | NO | DEFAULT CURRENT_TIMESTAMP | Technical Additive Extension |
| `updated_at` | `TIMESTAMP` | NO | ON UPDATE CURRENT_TIMESTAMP | Technical Additive Extension |
| — | — | — | `UNIQUE KEY (team_id, event_id)` | Enforces one registration per team per event |

### 9. `payment` (Logical Entity: `PAYMENT` / `Payment`)
| Column Name | Data Type | Nullable | Key / Constraint | Provenance & Notes |
|---|---|---|---|---|
| `payment_id` | `INT` | NO | `PRIMARY KEY AUTO_INCREMENT` | Confirmed: ER (`payment_id`), UML (`paymentId`) |
| `registration_id` | `INT` | NO | `FK -> registration ON DELETE RESTRICT` | Confirmed: ER relationship `HAS PAYMENT` (1:N attempts; financial audit protected) |
| `attempt_number` | `INT` | NO | DEFAULT 1 | Additive: Supports multiple attempts / retries per Use Case 16 |
| `amount` | `DECIMAL(10,2)` | NO | | Confirmed: ER & UML (`amount`); exact currency representation |
| `payment_status` | `ENUM` | NO | DEFAULT 'PENDING' | Confirmed: ER & UML (`payment_status`: 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') |
| `payment_method` | `VARCHAR(50)` | NO | DEFAULT 'MOCK' | Inferred: provider isolation (MOCK, RAZORPAY, STRIPE) |
| `transaction_id` | `VARCHAR(255)` | YES | `UNIQUE KEY` | Confirmed: ER & UML (`transaction_id`) |
| `payment_date` | `TIMESTAMP` | YES | | Confirmed: ER (`payment_date`), UML (`paymentDate`) |
| `success_registration_id` | `INT` | YES | `UNIQUE KEY` (Virtual Generated) | Enforces at most ONE 'SUCCESS' payment per registration: `IF(payment_status = 'SUCCESS', registration_id, NULL)` |
| `created_at` | `TIMESTAMP` | NO | DEFAULT CURRENT_TIMESTAMP | Technical Additive Extension |
| `updated_at` | `TIMESTAMP` | NO | ON UPDATE CURRENT_TIMESTAMP | Technical Additive Extension |

### 10. `pass_receipt` (Logical Entity: `PASS_RECEIPT` / `PassReceipt`)
| Column Name | Data Type | Nullable | Key / Constraint | Provenance & Notes |
|---|---|---|---|---|
| `pass_id` | `INT` | NO | `PRIMARY KEY AUTO_INCREMENT` | Confirmed: ER (`pass_id`), UML (`receiptId`) |
| `registration_id` | `INT` | NO | `UNIQUE KEY`, `FK -> registration ON DELETE RESTRICT` | Confirmed: ER relationship `GENERATES` (1:1 with registration) |
| `payment_id` | `INT` | NO | `UNIQUE KEY`, `FK -> payment ON DELETE RESTRICT` | Confirmed: Sequence Diagram Step 15 `generate(teamId, paymentId)` |
| `pass_number` | `VARCHAR(64)` | NO | `UNIQUE KEY` | Confirmed: ER (`pass_number`) |
| `qr_code` | `TEXT` | NO | | Confirmed: ER & UML (`qr_code` / `qrCode`) |
| `issue_date` | `TIMESTAMP` | NO | DEFAULT CURRENT_TIMESTAMP | Confirmed: ER (`issue_date`) |


