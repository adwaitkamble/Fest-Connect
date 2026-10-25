-- ==============================================================================
-- FestConnect — Migration 002: Persistent Email Notification State & Audit History
-- REPLICA MIRROR: infra/mysql/migrations/002_email_notifications.sql
-- (CANONICAL SOURCE OF TRUTH: apps/api/src/db/migrations/002_email_notifications.sql)
-- ==============================================================================

-- 1. EMAIL_NOTIFICATION Summary & State Tracker
CREATE TABLE IF NOT EXISTS `email_notification` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `registration_id` INT NOT NULL UNIQUE COMMENT '1:1 with registration for delivery status tracking',
  `recipient_email` VARCHAR(255) NOT NULL COMMENT 'Authoritative recipient email from team leader/member',
  `recipient_name` VARCHAR(255) NOT NULL COMMENT 'Recipient display name',
  `status` ENUM('DELIVERED', 'FAILED', 'NOT_SENT') NOT NULL DEFAULT 'NOT_SENT' COMMENT 'Standardized delivery status',
  `attempts` INT NOT NULL DEFAULT 0 COMMENT 'Number of dispatch attempts',
  `provider` VARCHAR(50) NOT NULL DEFAULT 'console' COMMENT 'Email provider used (console, gmail)',
  `last_sent_at` TIMESTAMP NULL COMMENT 'Timestamp when last delivered successfully',
  `last_attempted_at` TIMESTAMP NULL COMMENT 'Timestamp of most recent attempt',
  `last_error` TEXT NULL COMMENT 'Error message from most recent failed attempt',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notification_registration` FOREIGN KEY (`registration_id`)
    REFERENCES `registration` (`registration_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. EMAIL_NOTIFICATION_ATTEMPT Audit History
CREATE TABLE IF NOT EXISTS `email_notification_attempt` (
  `attempt_id` INT AUTO_INCREMENT PRIMARY KEY,
  `registration_id` INT NOT NULL,
  `attempt_number` INT NOT NULL,
  `status` ENUM('DELIVERED', 'FAILED') NOT NULL,
  `provider` VARCHAR(50) NOT NULL,
  `recipient_email` VARCHAR(255) NOT NULL,
  `error_message` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_attempt_registration` FOREIGN KEY (`registration_id`)
    REFERENCES `registration` (`registration_id`) ON DELETE CASCADE,
  INDEX `idx_attempt_registration` (`registration_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
