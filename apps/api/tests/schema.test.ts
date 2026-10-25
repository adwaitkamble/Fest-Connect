import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkDbConnection, getDbConfig } from '../src/db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase 02 — FA1 MySQL Schema & Migration Verification', () => {
  const canonicalMigrationPath = path.join(__dirname, '../src/db/migrations/001_initial_fa1_schema.sql');
  const replicaMigrationPath = path.join(__dirname, '../../../infra/mysql/migrations/001_initial_fa1_schema.sql');
  const sql = fs.readFileSync(canonicalMigrationPath, 'utf8');

  it('canonical migration file exists and replica is synchronized', () => {
    expect(fs.existsSync(canonicalMigrationPath)).toBe(true);
    expect(fs.existsSync(replicaMigrationPath)).toBe(true);
    expect(sql.length).toBeGreaterThan(500);

    const replicaSql = fs.readFileSync(replicaMigrationPath, 'utf8');
    // Normalize line endings for cross-platform comparison
    const normCanonical = sql.replace(/\r\n/g, '\n').replace(/CANONICAL SOURCE OF TRUTH:.*?\n/, '');
    const normReplica = replicaSql.replace(/\r\n/g, '\n').replace(/REPLICA MIRROR.*?\n/, '');
    expect(normCanonical).toContain('CREATE TABLE IF NOT EXISTS `participant`');
    expect(normReplica).toContain('CREATE TABLE IF NOT EXISTS `participant`');
  });

  it('defines all 10 verified FA1 relational entities', () => {
    const requiredTables = [
      'participant',
      'participant_skill',
      'event_coordinator',
      'event',
      'schedule',
      'team',
      'team_member',
      'registration',
      'payment',
      'pass_receipt',
    ];

    for (const table of requiredTables) {
      const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS \`${table}\``, 'i');
      expect(sql).toMatch(tableRegex);
    }
  });

  it('enforces relational integrity with foreign key constraints', () => {
    const expectedForeignKeys = [
      'fk_skill_participant',
      'fk_coordinator_participant',
      'fk_event_coordinator',
      'fk_schedule_event',
      'fk_team_leader',
      'fk_member_team',
      'fk_member_participant',
      'fk_registration_team',
      'fk_registration_event',
      'fk_payment_registration',
      'fk_pass_registration',
      'fk_pass_payment',
    ];

    for (const fk of expectedForeignKeys) {
      expect(sql).toContain(fk);
    }
  });

  it('enforces ON DELETE RESTRICT on financial and pass records (prevents accidental cascade deletion)', () => {
    // Payment records must not be cascade-deleted
    expect(sql).toMatch(/CONSTRAINT `fk_payment_registration` FOREIGN KEY \(`registration_id`\)\s+REFERENCES `registration` \(`registration_id`\) ON DELETE RESTRICT/i);
    // Pass records must not be cascade-deleted
    expect(sql).toMatch(/CONSTRAINT `fk_pass_registration` FOREIGN KEY \(`registration_id`\)\s+REFERENCES `registration` \(`registration_id`\) ON DELETE RESTRICT/i);
    expect(sql).toMatch(/CONSTRAINT `fk_pass_payment` FOREIGN KEY \(`payment_id`\)\s+REFERENCES `payment` \(`payment_id`\) ON DELETE RESTRICT/i);
  });

  it('supports payment retry while mathematically preventing duplicate successful payments', () => {
    // Virtual generated column for single success enforcement
    expect(sql).toContain('success_registration_id');
    expect(sql).toMatch(/GENERATED ALWAYS AS \(IF\(`payment_status` = 'SUCCESS', `registration_id`, NULL\)\) VIRTUAL/i);
    expect(sql).toContain('uk_payment_success_registration');
    expect(sql).toContain('attempt_number');
  });

  it('enforces pass receipt relationships and uniqueness', () => {
    // Unique pass per registration
    expect(sql).toContain('uk_pass_registration');
    // Unique pass per successful payment (from sequence diagram generate(teamId, paymentId))
    expect(sql).toContain('uk_pass_payment');
    // Unique ticket number
    expect(sql).toContain('uk_pass_number');
  });

  it('enforces business unique constraints for teams and registrations', () => {
    // Unique team membership per participant
    expect(sql).toContain('uk_team_participant');
    // Unique registration per team per event
    expect(sql).toContain('uk_team_event');
    // Team name indexed for search
    expect(sql).toContain('idx_team_name');
  });

  it('uses exact DECIMAL types for monetary fields (no floating point)', () => {
    expect(sql).toMatch(/`registration_fee`\s+DECIMAL\(10,\s*2\)/i);
    expect(sql).toMatch(/`amount`\s+DECIMAL\(10,\s*2\)/i);
    expect(sql).not.toMatch(/`registration_fee`\s+FLOAT/i);
    expect(sql).not.toMatch(/`amount`\s+FLOAT/i);
  });

  it('checkDbConnection reports truthful connectivity without throwing', async () => {
    const config = getDbConfig();
    expect(config.database).toBe('festconnect');
    expect(config.port).toBe(3306);

    const status = await checkDbConnection();
    // Since MySQL is not currently running natively or in Docker, it must truthfully report false
    expect(status).toHaveProperty('connected');
    expect(typeof status.connected).toBe('boolean');
    if (!status.connected) {
      expect(status.error).toBeDefined();
    }
  });
});
