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

---

## 8. Frontend Redesign Specification — FestConnect UI/UX v2

**Status:** Implementation-ready specification. This section supersedes only the visual and interaction direction in sections 1–6; the data dictionary above remains authoritative. It reflects the current React application in `apps/web`, whose public routes are `/`, `/events`, `/events/:id`, `/teams`, `/registrations`, `/dashboard`, `/coordinator`, `/login`, `/register`, `/pass/:id`, and the catch-all 404 route.

### 8.1 Product intent and visual personality

FestConnect is a college event-management portal, not a generic admin template. The interface should feel energetic, trustworthy, and legible: a calm ink-blue foundation, a vivid festival violet primary, warm coral highlights, and restrained mint/amber/red semantic feedback. Use editorial event imagery only when genuine, local, licensed assets are available; otherwise use colour, type, date blocks, and simple CSS decoration rather than stock-photo placeholders or AI-looking graphics.

- Prioritise the participant journey: discover an event, understand its schedule and rules, assemble a team, register, make a clearly labelled demo payment, and retrieve a verified pass.
- Keep coordinator workflows dense enough to be useful but scannable, with the same component system rather than a visually unrelated “admin console”.
- Replace Phase/scaffold/technology-status content on the home route with product-oriented discovery content. Technical health information may remain available only as a compact, non-primary development indicator when the API exposes it.
- Never represent a client-side state as authoritative. Amounts, eligibility, registration status, payment status, pass access, roles, and validation all come from the existing server responses.

### 8.2 Foundations and tokens

Implement CSS custom properties centrally (prefer `src/index.css`) and consume them from `App.css` and component styles. Do not introduce a UI framework merely for this redesign.

| Token group | Required values / use |
|---|---|
| Brand | `--fc-ink: #111827`; `--fc-ink-soft: #374151`; `--fc-primary: #6D28D9`; `--fc-primary-hover: #5B21B6`; `--fc-coral: #F97360`; `--fc-sky: #38BDF8`; `--fc-mint: #10B981` |
| Surfaces | `--fc-page: #F8FAFC`; `--fc-surface: #FFFFFF`; `--fc-surface-muted: #F1F5F9`; `--fc-border: #E2E8F0`; use an ink-to-violet gradient only for hero/dashboard headers, never behind long body text |
| Semantic states | success `#047857` / pale `#D1FAE5`; warning `#B45309` / pale `#FEF3C7`; danger `#B91C1C` / pale `#FEE2E2`; info `#1D4ED8` / pale `#DBEAFE`. Ensure text and icon combinations meet contrast requirements. |
| Typography | System-first stack: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`; optional single display face only if locally/self-hosted. Body 16px / 1.5–1.65; compact metadata 12–14px; `h1` clamp(2rem, 4vw, 3.5rem), `h2` clamp(1.5rem, 2.5vw, 2.25rem). Avoid all-caps paragraphs. |
| Spacing | 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80. Content max-width 1200px, wide hero 1280px; page gutters 16px mobile, 24px tablet, 32px desktop. |
| Shape/shadow | 8px controls, 12px cards, 16px hero/large panels, pill only for tags; one soft low-elevation shadow, stronger shadow only on hover or modal. Do not use excessive glassmorphism or large blur. |
| Focus | `--fc-focus: #2563EB`; visible 3px focus ring with 2px offset on every interactive item; never remove outlines without a replacement. |

### 8.3 Global shell, navigation, and responsive behaviour

- Add a skip link as the first focusable element, linked to `<main id="main-content">`.
- Header: persistent but compact, brand mark plus **FestConnect**, primary links (Events, Teams, My registrations), role-aware Coordinator link, and a clear login/account area. Use `NavLink`/current-route styling and `aria-current="page"`; use real links for navigation rather than clickable non-semantic text.
- On small screens, use an accessible menu button (`aria-expanded`, labelled control), a focus-managed menu, and 44×44px minimum tap targets. Keep primary actions visible where feasible; do not cram desktop links into multiple wrapping rows.
- Footer contains concise academic attribution and useful links only; do not repeat project phase claims.
- Breakpoints: mobile 0–639px (one-column, stacked actions); tablet 640–1023px (two-column where safe); desktop 1024px+ (full grids). Tables must become horizontally scrollable with a visible label or transform into labelled cards on mobile.
- Preserve URL paths, IDs, query strings, direct navigation, `MemoryRouter` test support, and the current 404 route. The `/dashboard` route remains an alias of the participant dashboard.

### 8.4 Reusable component contract

Refactor duplicated markup progressively into small, typed presentational primitives without changing API modules, request bodies, endpoint paths, or business decisions.

- `AppShell`, `SiteHeader`, `MobileNav`, `PageHeader`, `SectionHeading`, `Breadcrumbs`.
- `Button` variants: primary, secondary, quiet, danger; sizes normal/small/icon; disabled and busy state preserve an accessible name.
- `StatusBadge` maps existing event/team/registration/payment states to text plus colour, never colour alone.
- `Card`, `EventCard`, `MetricCard`, `KeyValueList`, `EmptyState`, `ErrorState`, `LoadingState` (skeletons that preserve layout), `InlineAlert`, `ToastRegion` (`aria-live="polite"`).
- `FormField` with label, required indicator, help text and `aria-describedby`; `SelectField`; `FieldError`; `FormErrorSummary` focused after failed submission.
- `Dialog` primitive used by all current modals: `role="dialog"`, `aria-modal`, labelled title, initial focus, keyboard focus trap, Escape close when not submitting, focus restoration, scroll lock, and a close button. Backdrop clicks must not accidentally dismiss a destructive/pending action.
- `DataTable` / responsive list, `ConfirmDialog`, `ScheduleTimeline`, `PassCard`, and `DemoPaymentNotice`.

### 8.5 Route-by-route experience requirements

| Route | Audience and content | Primary actions and states |
|---|---|---|
| `/` | Public landing page: concise festival hero, upcoming/event-category preview fed by the existing event list, three-step “Discover → Register → Get your pass” journey, trust/support strip. | “Explore events” is primary; unauthenticated “Sign in” is secondary. Show an inline API-unavailable state only if data cannot load. No implementation roadmap, stack table, or phase banner as primary UI. |
| `/events` | Discovery page with page title, live result count, search, event-type filter, cards and pagination using existing list data. Each card shows type, status, fee/free label, team-size range, schedule/venue when available, and a purposeful detail CTA. | Debounce typing modestly (about 250–350ms) without changing server query semantics; reset page on filters; skeleton while loading, retryable error, no-results state with clear filters action. |
| `/events/:id` | Event detail: breadcrumb/back link, strong title/type/status, concise summary, facts panel (fee, team size, date/time, venue), schedule timeline, description and coordinator information. | Contextual CTA: sign in to register, create/manage team, or register team. Explain unavailable/cancelled states; preserve current API-backed detail and registration modal behaviour. |
| `/login` | Focused two-column-on-desktop / single-column-on-mobile sign-in card, short benefit copy, link to register, clear return action. | Email/password labels, show/hide password control, pending state, server error summary, and post-login destination logic unchanged. |
| `/register` | Participant-only registration form with plain language about account use and a sign-in link. | Preserve existing field schema and server validation; never offer role selection. Validate inline after blur/submit, retain entered values after server errors, and show submit progress. |
| `/teams` | Authenticated participant workspace: title, short explanation, create-team CTA, team cards showing status, leader, member count, and registered-event count. | Current create-team and detail/member-management flows remain API backed. Unauthenticated state has an explanatory sign-in CTA; empty state explains how teams support event registration. |
| `/registrations` and `/dashboard` | Participant dashboard: welcome/summary header, registrations ordered in an easy-to-scan list or cards, status and payment/pass actions. | Preserve existing registration list, payment modal, pass modal/link, cancellation rules and actions. Pending payment has a clearly distinct CTA; confirmed entries expose pass only after server confirmation. |
| `/coordinator` | Protected workspace with role guard, compact summary metrics, Events / Registrations / Pass verification sections or accessible tabs. | Preserve event CRUD, schedule CRUD, registration filtering/listing, pass verify/validate, current authorization guard, and demo-role controls where demo mode permits them. Delete is visually destructive and confirmed. Notify about attendee impact before schedule saves; the backend remains responsible for notifications. |
| `/pass/:id` | High-trust printable digital pass. Use a quiet, light background and an obvious verification/status panel. | Preserve existing pass fetch/verify/email and print behaviour. Never display sensitive QR/token values as decorative data; handle loading, access denied, not ready, and error states clearly. Print stylesheet hides navigation/actions and keeps pass facts/QR legible. |
| `*` | Friendly 404 with an explanation and return-to-events/home links. | Preserve routing fallback; no dead-end. |

### 8.6 Modal and task-flow requirements

- **Event detail modal** (where still invoked): same fact hierarchy as the detail page, and an unambiguous “View full details” path.
- **Register event modal:** selected event summary, team selector, visible member-count vs allowed range, fee from server event data, readiness/conflict feedback, request-in-progress lock, then a successful hand-off to registration/payment status.
- **Payment modal:** prominent immutable registration/event summary, backend-returned amount/status, method selection only when supported by current API, persistent text “Demo payment — no money is charged” in mock mode, and no optimistic “paid” UI before a server response.
- **Team detail/create:** clear leader/member roles, member add/remove controls, server errors next to the relevant action, and confirmation before irreversible removal when appropriate.
- **Event and schedule forms:** group related fields, native date/time controls where already compatible, field-level and summary validation, save/cancel controls in a stable footer, and no loss of valid entered data on failure.
- **Pass modal:** retain print and email-notification actions, label their outcome accurately (for example, console-email preview is not a delivered email).

### 8.7 State, content, and feedback rules

- Every asynchronous screen/action needs initial loading, empty, error/retry, success, and disabled/busy treatment appropriate to its purpose. Use skeletons only for initial content loading; do not use a spinner as the sole indicator for long operations.
- Announce saved/updated/payment/pass outcomes through the live region. Associate field errors with inputs and ensure errors describe recovery, not just failure.
- Keep domain terminology consistent: **event**, **team**, **registration**, **payment**, and **digital pass**. Use title case sparingly; write action labels such as “Create team”, “Retry loading”, and “View pass”.
- Formatting: INR amount uses existing supplied data and `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` when currency is INR; use locale-aware date/time formatting; do not change stored values or infer unavailable dates/venues.
- HTTP semantics: 401 invites sign-in without exposing private content; 403 presents permission guidance; 404 says unavailable; 409 explains the business conflict; 5xx/network errors offer retry. Do not swallow errors or silently substitute client data.

### 8.8 Motion and reduced motion

- Motion is functional and subtle: 140–180ms hover/focus colour and elevation transitions; 180–240ms dialog enter/exit and page-section fade/slide of no more than 8px; 900–1200ms gentle skeleton shimmer only while loading.
- No autoplay carousels, parallax, looping confetti, bouncing CTAs, or motion that blocks input. Never make motion the only success/failure signal.
- Implement `@media (prefers-reduced-motion: reduce)` to reduce animation/transition duration to near-zero, remove transforms/shimmer, and retain all state feedback. Respect it everywhere, including modal and navigation transitions.

### 8.9 Accessibility and quality bar

- Target WCAG 2.2 AA: 4.5:1 normal-text contrast, 3:1 large text and non-text UI boundaries, visible keyboard focus, semantic heading order, landmark regions, and descriptive labels.
- Full keyboard journey: skip link; header/mobile nav; filters; cards/links; all dialogs; forms; coordinator tables/actions; pass print action. Test Escape, Enter/Space, Tab/Shift+Tab, and focus restoration.
- All meaningful icons need text or an accessible name; decorative icons/images are `aria-hidden` or empty-alt. Do not communicate status by colour alone.
- Inputs require persistent labels (placeholder is supplementary only); errors use `aria-invalid`; tables have captions/headers; button hit targets are at least 44×44px where practical.
- Test at 320px, 375px, 768px, 1024px and 1440px widths; zoom 200%; keyboard-only use; screen reader landmarks/labels; and reduced-motion mode.

### 8.10 Non-negotiable implementation boundaries

- Frontend scope only: `apps/web` and documentation unless a test must be adjusted solely for updated UI semantics. Do not modify API, database, Docker, auth middleware, payment/pass services, OpenAPI, or business rules for this visual redesign.
- Preserve all current API client functions/endpoints, `credentials`/CSRF handling, React Router paths, role gating, demo-mode checks, server-authoritative values, and testable public component contracts unless a compatible update is necessary.
- Add no remote font, icon, analytics, image, payment, or UI dependency that can break offline/local demonstration. Prefer inline SVG/CSS or an already-installed dependency.

### 8.11 Delivery order and acceptance criteria

1. Audit current components, tests, route behaviour, API client contracts, and existing CSS; map duplicated patterns.
2. Establish tokens, reset/base styles, global shell, accessible navigation, live region, responsive utilities, and reduced-motion rules.
3. Build reusable primitives and migrate event discovery/detail plus authentication.
4. Migrate teams, registration/payment/pass flows without changing their data/control flow.
5. Migrate coordinator dashboard/forms/tables/verification, including protected/error states.
6. Add/adjust focused UI tests, run typecheck/lint/test/build, and manually inspect the route and viewport matrix.

The redesign is accepted only when all routes above remain reachable; no backend/API/auth/payment/pass contract is broken; every major state is readable and actionable; layouts work at the specified widths; dialogs and forms work by keyboard; reduced motion is honoured; and the existing web test suite plus production build pass.


