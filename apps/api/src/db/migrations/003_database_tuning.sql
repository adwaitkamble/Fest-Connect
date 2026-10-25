-- ==============================================================================
-- FestConnect — Migration 003: Database Tuning & Query Performance Indexes
-- CANONICAL SOURCE OF TRUTH: apps/api/src/db/migrations/003_database_tuning.sql
-- (infra/mysql/migrations/ is a replica maintained strictly for Docker container init)
-- ==============================================================================

-- 1. Index on event.coordinator_id to accelerate coordinator-scoped queries
ALTER TABLE `event`
  ADD INDEX `idx_event_coordinator_id` (`coordinator_id`);

-- 2. Composite index on event(event_type, status) to optimize public catalog filtering
ALTER TABLE `event`
  ADD INDEX `idx_event_type_status` (`event_type`, `status`);

-- 3. Composite timeline index on schedule(event_id, event_date, start_time)
-- Eliminates filesort when retrieving chronologically ordered schedules for an event
ALTER TABLE `schedule`
  ADD INDEX `idx_schedule_event_timeline` (`event_id`, `event_date`, `start_time`);

-- 4. Composite index on registration(event_id, status) to optimize coordinator roster lookups
ALTER TABLE `registration`
  ADD INDEX `idx_registration_event_status` (`event_id`, `status`);
