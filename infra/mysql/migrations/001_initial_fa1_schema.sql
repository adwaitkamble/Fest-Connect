-- ==============================================================================
-- FestConnect — Migration 001: Initial FA1 Schema
-- REPLICA MIRROR FOR DOCKER CONTAINER INITIALIZATION (docker-entrypoint-initdb.d)
-- CANONICAL SOURCE OF TRUTH: apps/api/src/db/migrations/001_initial_fa1_schema.sql
--
-- Reconciles entities and attributes from:
--   1. ER Diagram (ER Diagram.drawio)
--   2. UML Class Diagram (UMl_Project_final.drawio)
--   3. Use Case Diagram (usecase.drawio)
--   4. Sequence Diagram (SequenceDiagram)
--   5. CRC Cards (project _crc.drawio)
-- ==============================================================================

-- 1. PARTICIPANT Table (FA1 Entity: Participant / PARTICIPANT)
CREATE TABLE IF NOT EXISTS `participant` (
  `participant_id` INT AUTO_INCREMENT PRIMARY KEY,
  `first_name` VARCHAR(100) NOT NULL COMMENT 'From ER: First_Name',
  `last_name` VARCHAR(100) NOT NULL COMMENT 'From ER: last_Name',
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'From ER & UML: email',
  `phone` VARCHAR(20) NULL COMMENT 'From UML: phone',
  `college_name` VARCHAR(255) NULL COMMENT 'From UML: collegeName',
  `date_of_birth` DATE NULL COMMENT 'From ER: date_of_birth',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Technical Auth Extension',
  `role` ENUM('PARTICIPANT', 'COORDINATOR', 'ADMIN') NOT NULL DEFAULT 'PARTICIPANT' COMMENT 'Technical Role Extension',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_participant_email` (`email`),
  INDEX `idx_participant_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. PARTICIPANT_SKILL Table (FA1 Multivalued Attribute / Weak Entity from ER Diagram)
CREATE TABLE IF NOT EXISTS `participant_skill` (
  `participant_id` INT NOT NULL,
  `skill` VARCHAR(100) NOT NULL COMMENT 'From ER: skill',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`participant_id`, `skill`),
  CONSTRAINT `fk_skill_participant` FOREIGN KEY (`participant_id`)
    REFERENCES `participant` (`participant_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. EVENT_COORDINATOR Table (FA1 Entity: EventCoordinator / EVENT COORDINATOR)
CREATE TABLE IF NOT EXISTS `event_coordinator` (
  `coordinator_id` INT AUTO_INCREMENT PRIMARY KEY,
  `participant_id` INT NULL COMMENT 'Links coordinator to login account if unified',
  `name` VARCHAR(100) NOT NULL COMMENT 'From ER & UML: name',
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'From ER & UML: email',
  `phone` VARCHAR(20) NULL COMMENT 'From ER: Phone',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_coordinator_participant` FOREIGN KEY (`participant_id`)
    REFERENCES `participant` (`participant_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. EVENT Table (FA1 Entity: Event / EVENT)
CREATE TABLE IF NOT EXISTS `event` (
  `event_id` INT AUTO_INCREMENT PRIMARY KEY,
  `coordinator_id` INT NULL COMMENT 'Coordinator managing this event (ER: MANAGES)',
  `event_name` VARCHAR(255) NOT NULL COMMENT 'From ER: event_name, UML: title',
  `event_type` VARCHAR(100) NOT NULL COMMENT 'From ER & UML: event_type / eventType (e.g. Coding, Robotics, Quiz)',
  `description` TEXT NULL COMMENT 'From ER: description',
  `min_team_size` INT NOT NULL DEFAULT 1 COMMENT 'From UML: minTeamSize',
  `max_team_size` INT NOT NULL DEFAULT 1 COMMENT 'From ER: max_team_size, UML: maxTeamSize',
  `registration_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'From ER: registration_fee, Decimal exact representation',
  `status` ENUM('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_event_coordinator` FOREIGN KEY (`coordinator_id`)
    REFERENCES `event_coordinator` (`coordinator_id`) ON DELETE SET NULL,
  INDEX `idx_event_type` (`event_type`),
  INDEX `idx_event_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. SCHEDULE Table (FA1 Entity: Schedule / SCHEDULE)
CREATE TABLE IF NOT EXISTS `schedule` (
  `schedule_id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL COMMENT 'Event this schedule belongs to (ER: HAS)',
  `event_date` DATE NOT NULL COMMENT 'From ER: event_date, UML: day',
  `start_time` TIME NOT NULL COMMENT 'From ER: start_time, UML: slotStart',
  `end_time` TIME NOT NULL COMMENT 'From ER: end_time, UML: slotEnd',
  `venue` VARCHAR(255) NOT NULL COMMENT 'From ER & UML: venue',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_schedule_event` FOREIGN KEY (`event_id`)
    REFERENCES `event` (`event_id`) ON DELETE CASCADE,
  INDEX `idx_schedule_event` (`event_id`),
  INDEX `idx_schedule_date` (`event_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TEAM Table (FA1 Entity: Team / TEAM)
CREATE TABLE IF NOT EXISTS `team` (
  `team_id` INT AUTO_INCREMENT PRIMARY KEY,
  `team_name` VARCHAR(150) NOT NULL COMMENT 'From ER: Team Name, UML: teamName',
  `leader_id` INT NOT NULL COMMENT 'Participant leading team (ER: PARTICIPANT LEADS TEAM - Canonical Leader)',
  `status` ENUM('FORMING', 'READY', 'REGISTERED', 'DISBANDED') NOT NULL DEFAULT 'FORMING' COMMENT 'From UML: status',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'From ER: created_at',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_team_leader` FOREIGN KEY (`leader_id`)
    REFERENCES `participant` (`participant_id`) ON DELETE RESTRICT,
  INDEX `idx_team_leader` (`leader_id`),
  INDEX `idx_team_name` (`team_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TEAM_MEMBER Table (FA1 Entity: TeamMember / TEAM MEMBER)
CREATE TABLE IF NOT EXISTS `team_member` (
  `team_member_id` INT AUTO_INCREMENT PRIMARY KEY,
  `team_id` INT NOT NULL COMMENT 'From ER & UML: team_id',
  `participant_id` INT NOT NULL COMMENT 'From ER & UML: participant_id',
  `role` VARCHAR(50) NOT NULL DEFAULT 'MEMBER' COMMENT 'From ER: role, UML: roleInTeam (e.g. LEADER, MEMBER)',
  `joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'From ER: joined_at, UML: joinedAt',
  CONSTRAINT `fk_member_team` FOREIGN KEY (`team_id`)
    REFERENCES `team` (`team_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_member_participant` FOREIGN KEY (`participant_id`)
    REFERENCES `participant` (`participant_id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_team_participant` (`team_id`, `participant_id`),
  INDEX `idx_member_team` (`team_id`),
  INDEX `idx_member_participant` (`participant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. REGISTRATION Table (FA1 Entity: REGISTRATION / RegistrationManager in UML)
CREATE TABLE IF NOT EXISTS `registration` (
  `registration_id` INT AUTO_INCREMENT PRIMARY KEY,
  `team_id` INT NOT NULL COMMENT 'From ER: team_id(FK)',
  `event_id` INT NOT NULL COMMENT 'From ER: event_id(FK)',
  `registration_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'From ER: registration_date, UML: registrationDate',
  `status` ENUM('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT' COMMENT 'From ER & UML: status / registrationStatus',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_registration_team` FOREIGN KEY (`team_id`)
    REFERENCES `team` (`team_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_registration_event` FOREIGN KEY (`event_id`)
    REFERENCES `event` (`event_id`) ON DELETE RESTRICT,
  UNIQUE KEY `uk_team_event` (`team_id`, `event_id`),
  INDEX `idx_registration_team` (`team_id`),
  INDEX `idx_registration_event` (`event_id`),
  INDEX `idx_registration_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. PAYMENT Table (FA1 Entity: Payment / PAYMENT)
-- Supports multiple payment attempts (failed/retry per Use Case 16).
-- Enforces at most ONE successful payment per registration via virtual generated column.
CREATE TABLE IF NOT EXISTS `payment` (
  `payment_id` INT AUTO_INCREMENT PRIMARY KEY,
  `registration_id` INT NOT NULL COMMENT 'From ER: REGISTRATION HAS PAYMENT (1:N attempts, at most 1 SUCCESS)',
  `attempt_number` INT NOT NULL DEFAULT 1 COMMENT 'Attempt sequence number for retry tracking (Use Case 16)',
  `amount` DECIMAL(10, 2) NOT NULL COMMENT 'From ER & UML: amount (Decimal exact representation)',
  `payment_status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING' COMMENT 'From ER & UML: payment_status',
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'MOCK' COMMENT 'Provider method (MOCK, RAZORPAY, STRIPE)',
  `transaction_id` VARCHAR(255) NULL COMMENT 'From ER & UML: transaction_id (Gateway reference)',
  `payment_date` TIMESTAMP NULL COMMENT 'From ER: payment_date, UML: paymentDate',
  -- Virtual generated column: equals registration_id when SUCCESS, NULL otherwise.
  -- In MySQL UNIQUE indexes, multiple NULLs are permitted, but duplicate non-NULL integers are rejected.
  -- This mathematically guarantees at most ONE SUCCESS payment per registration at the database level!
  `success_registration_id` INT GENERATED ALWAYS AS (IF(`payment_status` = 'SUCCESS', `registration_id`, NULL)) VIRTUAL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payment_registration` FOREIGN KEY (`registration_id`)
    REFERENCES `registration` (`registration_id`) ON DELETE RESTRICT,
  UNIQUE KEY `uk_payment_success_registration` (`success_registration_id`),
  UNIQUE KEY `uk_payment_transaction` (`transaction_id`),
  INDEX `idx_payment_registration` (`registration_id`),
  INDEX `idx_payment_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. PASS_RECEIPT Table (FA1 Entity: PassReceipt / PASS RECEIPT)
-- Reconciles ER registration_id(FK) and Sequence Diagram generate(teamId, paymentId).
-- Requires verified successful payment before issuance; ON DELETE RESTRICT protects ticket audit trail.
CREATE TABLE IF NOT EXISTS `pass_receipt` (
  `pass_id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'From ER: pass_id, UML: receiptId',
  `registration_id` INT NOT NULL COMMENT 'From ER: REGISTRATION GENERATES PASS RECEIPT (1:1)',
  `payment_id` INT NOT NULL COMMENT 'From Sequence Diagram: generate(teamId, paymentId) (1:1)',
  `pass_number` VARCHAR(64) NOT NULL COMMENT 'From ER: pass_number (unique human-readable ticket code)',
  `qr_code` TEXT NOT NULL COMMENT 'From ER & UML: qr_code / qrCode token payload',
  `issue_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'From ER: issue_date',
  CONSTRAINT `fk_pass_registration` FOREIGN KEY (`registration_id`)
    REFERENCES `registration` (`registration_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_pass_payment` FOREIGN KEY (`payment_id`)
    REFERENCES `payment` (`payment_id`) ON DELETE RESTRICT,
  UNIQUE KEY `uk_pass_registration` (`registration_id`),
  UNIQUE KEY `uk_pass_payment` (`payment_id`),
  UNIQUE KEY `uk_pass_number` (`pass_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
