# FA1 Schema Reconciliation & Architectural Mapping

**Project:** FestConnect — A Centralized Technical Fest & Event Registration System  
**Course:** Object Oriented Modelling and System Design (BCER27PC02)  
**Status:** Reconciled, Remediated, and Verified against original FA1 reference files:
1. `ER Diagram.drawio` (Primary relational schema source)
2. `UMl_Project_final.drawio` (Class structure, attributes, and methods source)
3. `project _crc.drawio` (Class responsibilities and collaborators)
4. `SequenceDiagram` (Event registration, payment verification, and pass workflow)
5. `usecase.drawio` (Actor functionalities, failed/retry payment)
6. `FA2 Instructions.docx (1).pdf` (Design-to-Deployment requirements)

---

## 1. Domain Entities vs. Application Classes

In accordance with FA1 and OOMSD principles:
- **Relational Database Entities (9 Tables + 1 Weak Entity):**
  1. `PARTICIPANT`
  2. `PARTICIPANT_SKILL` (Weak entity from ER multivalued attribute)
  3. `EVENT_COORDINATOR`
  4. `EVENT`
  5. `SCHEDULE`
  6. `TEAM`
  7. `TEAM_MEMBER`
  8. `REGISTRATION`
  9. `PAYMENT`
  10. `PASS_RECEIPT`
- **Application Service Layer:** `RegistrationManager` is a **Controller / Service class** in the UML model and sequence diagram, responsible for orchestrating business rules (team size checks, schedule clash checks, payment initiation, and pass issuance). It is **not** a database entity; its state is persisted in `registration`.

---

## 2. Comprehensive Attribute Reconciliation Table

| Entity / Concept | Original Diagram Attribute | Diagram Source | Database Table | Database Column | SQL Type & Nullability | Status | Reconciliation Decision & Rationale |
|---|---|---|---|---|---|---|---|
| **PARTICIPANT** | `participant_id` | ER & UML | `participant` | `participant_id` | `INT AUTO_INCREMENT NOT NULL PK` | Confirmed | Exact primary key match across ER and UML diagrams. |
| | `First_Name` | ER | `participant` | `first_name` | `VARCHAR(100) NOT NULL` | Confirmed | Preserves ER first name attribute. |
| | `last_Name` | ER | `participant` | `last_name` | `VARCHAR(100) NOT NULL` | Confirmed | Preserves ER last name attribute. |
| | `name` | UML | `participant` | — | — | Reconciled | Split into `first_name` and `last_name` per 3NF ER schema; concatenated in API layer. |
| | `email` | ER & UML | `participant` | `email` | `VARCHAR(255) NOT NULL UNIQUE` | Confirmed | Unique participant email for identity and notifications. |
| | `phone` | UML | `participant` | `phone` | `VARCHAR(20) NULL` | Confirmed | Student contact phone from UML class diagram. |
| | `collegeName` | UML | `participant` | `college_name` | `VARCHAR(255) NULL` | Confirmed | College affiliation from UML class diagram (PCCoE / external). |
| | `date_of_birth` | ER | `participant` | `date_of_birth` | `DATE NULL` | Confirmed | Date of birth from ER diagram. |
| | `age` | ER (dashed) | `participant` | — | — | Reconciled | Derived attribute in ER diagram; computed dynamically from `date_of_birth` in API. |
| | *(Auth Extension)* | — | `participant` | `password_hash` | `VARCHAR(255) NOT NULL` | Additive | Technical extension required for password hashing (bcrypt); not in conceptual FA1. |
| | *(Role Extension)* | — | `participant` | `role` | `ENUM('PARTICIPANT','COORDINATOR','ADMIN') NOT NULL` | Additive | Technical extension for role-based access control (RBAC). |
| **PARTICIPANT_SKILL** | `skill` | ER | `participant_skill` | `skill` | `VARCHAR(100) NOT NULL PK` | Confirmed | Multivalued attribute modeled as weak entity table in ER diagram. |
| | `participant_id(FK)` | ER | `participant_skill` | `participant_id` | `INT NOT NULL PK, FK` | Confirmed | Composite PK `(participant_id, skill)` referencing `participant(participant_id)` ON DELETE CASCADE. |
| **EVENT_COORDINATOR** | `coordinator_id` | ER & UML | `event_coordinator` | `coordinator_id` | `INT AUTO_INCREMENT NOT NULL PK` | Confirmed | Primary key match across ER and UML diagrams. |
| | `participant_id` | — | `event_coordinator` | `participant_id` | `INT NULL FK` | Additive | Technical FK linking coordinator profile to login account. |
| | `name` | ER & UML | `event_coordinator` | `name` | `VARCHAR(100) NOT NULL` | Confirmed | Full name of coordinator. |
| | `email` | ER & UML | `event_coordinator` | `email` | `VARCHAR(255) NOT NULL UNIQUE` | Confirmed | Unique coordinator email. |
| | `Phone` | ER | `event_coordinator` | `phone` | `VARCHAR(20) NULL` | Confirmed | Contact phone from ER diagram. |
| **EVENT** | `event_id` | ER & UML | `event` | `event_id` | `INT AUTO_INCREMENT NOT NULL PK` | Confirmed | Primary key match across ER and UML diagrams. |
| | `coordinator_id` | ER (MANAGES) | `event` | `coordinator_id` | `INT NULL FK` | Confirmed | FK to `event_coordinator(coordinator_id)` from ER `MANAGES` relationship. |
| | `event_name` / `title`| ER (`event_name`), UML (`title`) | `event` | `event_name` | `VARCHAR(255) NOT NULL` | Reconciled | Semantic equivalent: `event_name` chosen as physical column; mapped to `title` in API. |
| | `event_type` / `eventType` | ER & UML | `event` | `event_type` | `VARCHAR(100) NOT NULL` | Confirmed | Category (e.g. Coding, Robotics, Hackathon, Quiz). |
| | `description` | ER | `event` | `description` | `TEXT NULL` | Confirmed | Event overview and rules. |
| | `minTeamSize` | UML | `event` | `min_team_size` | `INT NOT NULL DEFAULT 1` | Confirmed | Minimum allowed members from UML class diagram & sequence diagram validation. |
| | `max_team_size` / `maxTeamSize` | ER & UML | `event` | `max_team_size` | `INT NOT NULL DEFAULT 1` | Confirmed | Maximum allowed members from ER & UML diagrams. |
| | `registration_fee` | ER | `event` | `registration_fee` | `DECIMAL(10,2) NOT NULL DEFAULT 0.00` | Confirmed | Exact monetary representation (no float/double). |
| | `eventDate` | UML | `schedule` | `event_date` | `DATE NOT NULL` | Reconciled | Moved to `schedule` table per 3NF normalization; joined in API event view. |
| | `venue` | UML | `schedule` | `venue` | `VARCHAR(255) NOT NULL` | Reconciled | Moved to `schedule` table per 3NF normalization; joined in API event view. |
| | *(Status)* | — | `event` | `status` | `ENUM('UPCOMING','ACTIVE','COMPLETED','CANCELLED') NOT NULL` | Additive | Lifecycle state for coordinator management. |
| **SCHEDULE** | `schedule_id` | ER & UML | `schedule` | `schedule_id` | `INT AUTO_INCREMENT NOT NULL PK` | Confirmed | Primary key match across ER and UML diagrams. |
| | `event_id` | ER (HAS) | `schedule` | `event_id` | `INT NOT NULL FK` | Confirmed | FK to `event(event_id)` ON DELETE CASCADE. |
| | `event_date` / `day` | ER (`event_date`), UML (`day`) | `schedule` | `event_date` | `DATE NOT NULL` | Reconciled | Date of the scheduled event round. |
| | `start_time` / `slotStart` | ER (`start_time`), UML (`slotStart`) | `schedule` | `start_time` | `TIME NOT NULL` | Reconciled | Slot start time. |
| | `end_time` / `slotEnd` | ER (`end_time`), UML (`slotEnd`) | `schedule` | `end_time` | `TIME NOT NULL` | Reconciled | Slot end time. |
| | `venue` | ER & UML | `schedule` | `venue` | `VARCHAR(255) NOT NULL` | Confirmed | Room / lab / auditorium location. |
| **TEAM** | `team_id` | ER & UML | `team` | `team_id` | `INT AUTO_INCREMENT NOT NULL PK` | Confirmed | Primary key match across ER and UML diagrams. |
| | `Team Name` / `teamName` | ER & UML | `team` | `team_name` | `VARCHAR(150) NOT NULL` | Confirmed | Name of participating team. Indexed (`idx_team_name`). Not unique per event in `team` (independent entity). |
| | `leader_id` | ER (LEADS) | `team` | `leader_id` | `INT NOT NULL FK` | Confirmed | Single canonical creator/leader reference (ER: `PARTICIPANT LEADS TEAM`). |
| | `status` | UML | `team` | `status` | `ENUM('FORMING','READY','REGISTERED','DISBANDED') NOT NULL` | Confirmed | Team readiness state from UML class diagram. |
| | `created_at` | ER | `team` | `created_at` | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` | Confirmed | Team creation timestamp. |
| **TEAM_MEMBER** | `team_member_id` | ER & UML | `team_member` | `team_member_id` | `INT AUTO_INCREMENT NOT NULL PK` | Confirmed | Primary key match across ER and UML diagrams. |
| | `team_id(FK)` | ER & UML | `team_member` | `team_id` | `INT NOT NULL FK` | Confirmed | FK to `team(team_id)` ON DELETE CASCADE. |
| | `Participant_id(FK)` | ER & UML | `team_member` | `participant_id` | `INT NOT NULL FK` | Confirmed | FK to `participant(participant_id)` ON DELETE CASCADE. |
| | `role` / `roleInTeam` | ER (`role`), UML (`roleInTeam`) | `team_member` | `role` | `VARCHAR(50) NOT NULL DEFAULT 'MEMBER'` | Reconciled | Functional designation (`LEADER`, `MEMBER`). Invariant: matching `team.leader_id` must have `role = 'LEADER'`. |
| | `joined_at` / `joinedAt` | ER & UML | `team_member` | `joined_at` | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` | Confirmed | Timestamp when member joined team. |
| | — | ER & UML | `team_member` | — | `UNIQUE KEY (team_id, participant_id)` | Confirmed | Integrity constraint preventing duplicate team membership. |
| **REGISTRATION** | `registration_id` | ER & UML | `registration` | `registration_id` | `INT AUTO_INCREMENT NOT NULL PK` | Confirmed | Primary key match. |
| | `team_id(FK)` | ER & UML | `registration` | `team_id` | `INT NOT NULL FK` | Confirmed | FK to `team(team_id)` ON DELETE RESTRICT. |
| | `event_id(FK)` | ER & UML | `registration` | `event_id` | `INT NOT NULL FK` | Confirmed | FK to `event(event_id)` ON DELETE RESTRICT. |
| | `registration_date` / `registrationDate` | ER & UML | `registration` | `registration_date` | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` | Confirmed | Timestamp of registration submission. |
| | `status` / `registrationStatus` | ER & UML | `registration` | `status` | `ENUM('PENDING_PAYMENT','CONFIRMED','CANCELLED') NOT NULL` | Confirmed | Canonical status matching sequence diagram transitions. |
| | — | ER & Sequence | `registration` | — | `UNIQUE KEY (team_id, event_id)` | Confirmed | Integrity constraint preventing duplicate event registrations by a team. |
| **PAYMENT** | `payment_id` | ER & UML | `payment` | `payment_id` | `INT AUTO_INCREMENT NOT NULL PK` | Confirmed | Primary key match. |
| | `registration_id` | ER (HAS PAYMENT) | `payment` | `registration_id` | `INT NOT NULL FK` | Confirmed | FK to `registration(registration_id)` ON DELETE RESTRICT (financial audit trail protected). |
| | *(Attempt Number)* | Use Case 16 | `payment` | `attempt_number` | `INT NOT NULL DEFAULT 1` | Additive | Sequence number tracking payment retries (Use Case 16). |
| | `amount` | ER & UML | `payment` | `amount` | `DECIMAL(10,2) NOT NULL` | Confirmed | Server-calculated fee; exact monetary precision. |
| | `payment_status` / `paymentStatus` | ER & UML | `payment` | `payment_status` | `ENUM('PENDING','SUCCESS','FAILED','REFUNDED') NOT NULL` | Confirmed | Payment lifecycle states matching sequence diagram. |
| | *(Method)* | — | `payment` | `payment_method` | `VARCHAR(50) NOT NULL DEFAULT 'MOCK'` | Additive | Provider isolation (MOCK, RAZORPAY, STRIPE). |
| | `transaction_id` / `transactionId` | ER & UML | `payment` | `transaction_id` | `VARCHAR(255) NULL UNIQUE` | Confirmed | Unique gateway transaction reference. |
| | `payment_date` / `paymentDate` | ER & UML | `payment` | `payment_date` | `TIMESTAMP NULL` | Confirmed | Verification completion timestamp. |
| | *(Single Success Guard)* | Audit Finding 1 | `payment` | `success_registration_id` | `INT GENERATED VIRTUAL UNIQUE` | Additive | Virtual column: `IF(payment_status = 'SUCCESS', registration_id, NULL)`. Enforces at most 1 SUCCESS per registration. |
| **PASS_RECEIPT** | `pass_id` / `receiptId` | ER (`pass_id`), UML (`receiptId`) | `pass_receipt` | `pass_id` | `INT AUTO_INCREMENT NOT NULL PK` | Reconciled | ER `pass_id` used as physical PK; mapped to `receiptId` in API responses. |
| | `registration_id` | ER (GENERATES) | `pass_receipt` | `registration_id` | `INT NOT NULL UNIQUE FK` | Confirmed | FK to `registration` ON DELETE RESTRICT (at most 1 pass per registration). |
| | `payment_id` | Sequence Step 15 | `pass_receipt` | `payment_id` | `INT NOT NULL UNIQUE FK` | Confirmed | FK to `payment` ON DELETE RESTRICT (from `generate(teamId, paymentId)`). |
| | `pass_number` | ER | `pass_receipt` | `pass_number` | `VARCHAR(64) NOT NULL UNIQUE` | Confirmed | Unique ticket identifier (e.g. `FEST-2026-CC1-001`). |
| | `qr_code` / `qrCode` | ER & UML | `pass_receipt` | `qr_code` | `TEXT NOT NULL` | Confirmed | Digital pass QR token payload. |
| | `issue_date` | ER | `pass_receipt` | `issue_date` | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` | Confirmed | Pass generation timestamp. |

---

## 3. Mandatory Audit Findings & Resolutions

### Finding 1: Payment Retries & Idempotency
- **Diagram Finding:** Use Case 16 explicitly documents `Payment Failed / Retry Payment`.
- **Defect Identified:** A simple `UNIQUE(registration_id)` on `payment` prevented storing failed attempts alongside subsequent retried attempts, destroying financial audit history.
- **Resolution:**
  1. Cardinality is 1 Registration to N Payment attempts.
  2. Foreign key `fk_payment_registration` is `ON DELETE RESTRICT` (financial history is never cascade-deleted).
  3. Safe single-success idempotency: `success_registration_id INT GENERATED ALWAYS AS (IF(payment_status = 'SUCCESS', registration_id, NULL)) VIRTUAL` with `UNIQUE KEY uk_payment_success_registration (success_registration_id)`.
  4. Multiple `FAILED` or `PENDING` attempts have `NULL` for `success_registration_id` (allowed in MySQL UNIQUE indexes), while at most ONE attempt can have `payment_status = 'SUCCESS'` per registration.
  5. `attempt_number` added to order and track retry history.

### Finding 2: Pass Receipt Relationship
- **Diagram Finding:** ER Diagram shows `REGISTRATION (1) -- GENERATES -- (1) PASS RECEIPT` with `registration_id(FK)`. Sequence Diagram Step 15 explicitly executes `generate(teamId, paymentId)`.
- **Resolution:**
  1. `pass_receipt` contains `registration_id INT NOT NULL UNIQUE FK -> registration(registration_id) ON DELETE RESTRICT`.
  2. `pass_receipt` contains `payment_id INT NOT NULL UNIQUE FK -> payment(payment_id) ON DELETE RESTRICT`.
  3. Guarantees that every digital pass is issued for a confirmed registration and directly tied to the exact verified successful payment.
  4. Redundant mutable attributes from UML `PassReceipt` (`amount`, `paymentStatus`) are projected from `payment` in the API layer, maintaining strict 3NF normalization.

### Finding 3: Team Leader Consistency
- **Diagram Finding:** ER Diagram shows `PARTICIPANT (1) -- LEADS -- (N) TEAM` while `TEAM MEMBER` has `role` (UML `roleInTeam`).
- **Resolution:**
  1. `team.leader_id` is the **single canonical reference for team ownership/leadership** (from ER `LEADS`).
  2. `team_member.role` reflects the member's functional role in the team (`LEADER`, `MEMBER`).
  3. **Application Invariant:** When a team is created or transferred, the participant matching `team.leader_id` must have `team_member.role = 'LEADER'`. All other members must have `team_member.role = 'MEMBER'`.

### Finding 4: Team-Name Uniqueness vs Event Context
- **Diagram Finding:** ER Diagram has no `event_id` in `TEAM`. `TEAM` is an independent entity that registers for events via `REGISTRATION`.
- **Resolution:**
  1. `team` table correctly does not contain `event_id`.
  2. Team names are indexed for lookup (`INDEX idx_team_name (team_name)`).
  3. Uniqueness per event context is strictly enforced on `registration` via `UNIQUE KEY uk_team_event (team_id, event_id)`.

### Finding 5: FA1 Attribute Fidelity
- **Participant:** ER fields (`first_name`, `last_name`, `email`, `date_of_birth`) + UML fields (`phone`, `college_name`) are reconciled. `age` is derived. `password_hash` and `role` are additive technical extensions.
- **Event:** `event_name` is the physical column (`title` in API). `min_team_size` (UML) and `max_team_size` (ER & UML) are both enforced. `registration_fee` is `DECIMAL(10,2)`. `eventDate` and `venue` are 3NF-normalized into `schedule`.

### Finding 6: Foreign Keys and Deletion Behavior
- `payment` -> `registration`: `ON DELETE RESTRICT` (protects financial transaction audit trails).
- `pass_receipt` -> `registration`: `ON DELETE RESTRICT` (protects issued festival ticket records).
- `pass_receipt` -> `payment`: `ON DELETE RESTRICT` (protects payment audit linkage).
- `registration` -> `team`: `ON DELETE RESTRICT` (cannot delete team with registrations).
- `registration` -> `event`: `ON DELETE RESTRICT` (cannot delete event with registrations).
- `team` -> `leader_id`: `ON DELETE RESTRICT` (cannot delete participant while leading a team).
- `team_member` -> `team`: `ON DELETE CASCADE` (team membership follows team lifecycle).
- `schedule` -> `event`: `ON DELETE CASCADE` (schedule rounds follow event lifecycle).

### Finding 7: Reset and Seed Safeguards
- `assertDisposableDatabase()` module implemented in `apps/api/src/db/safety.ts`.
- Enforces:
  1. `NODE_ENV !== 'production'`
  2. Database name does not match production pattern (`/(prod|production|live)/i`)
  3. Database host must be a recognized local/disposable host (`localhost`, `127.0.0.1`, `::1`, `mysql`, `db`, `host.docker.internal`) unless developer explicitly passes `ALLOW_DESTRUCTIVE_DB_RESET=true`.

### Finding 8: Migration Source of Truth
- **Canonical Migration File:** `apps/api/src/db/migrations/001_initial_fa1_schema.sql` is the sole authoritative definition for all schema migrations.
- **Docker Replica:** `infra/mysql/migrations/001_initial_fa1_schema.sql` is a synchronized replica used solely for Docker Compose `/docker-entrypoint-initdb.d/`. Automated tests verify both files match.
