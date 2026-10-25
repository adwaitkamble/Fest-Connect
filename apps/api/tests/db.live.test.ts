import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import { getDbPool, checkDbConnection } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { runSeeds } from '../src/db/seed.js';

describe('Phase 02 — Real Live MySQL 8 Database Verification Suite', () => {
  let pool: mysql.Pool;

  beforeAll(async () => {
    const connCheck = await checkDbConnection();
    if (!connCheck.connected) {
      console.warn('MySQL not reachable, skipping live DB tests:', connCheck.error);
      return;
    }
    pool = getDbPool();
    // Ensure fresh baseline migration and seed state
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('DELETE FROM pass_receipt WHERE registration_id > 1');
    await pool.query('DELETE FROM payment WHERE registration_id > 1');
    await pool.query('DELETE FROM registration WHERE registration_id > 1');
    await pool.query('DELETE FROM team_member WHERE team_id > 1');
    await pool.query('DELETE FROM team WHERE team_id > 1');
    await pool.query('DELETE FROM schedule WHERE schedule_id > 3');
    await pool.query('DELETE FROM event WHERE event_id > 3');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    await runMigrations();
    await runSeeds();
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('1. SQL Types: Verifies registration_id and success_registration_id types in MySQL', async () => {
    const [regCols] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'registration' AND COLUMN_NAME = 'registration_id'`
    );
    expect(regCols.length).toBe(1);
    expect(regCols[0].DATA_TYPE).toBe('int');

    const [payCols] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, EXTRA, GENERATION_EXPRESSION
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment' AND COLUMN_NAME = 'success_registration_id'`
    );
    expect(payCols.length).toBe(1);
    expect(payCols[0].DATA_TYPE).toBe('int');
    expect(payCols[0].EXTRA).toContain('VIRTUAL GENERATED');
    expect(payCols[0].IS_NULLABLE).toBe('YES');
    expect(payCols[0].GENERATION_EXPRESSION).toContain('SUCCESS');

    // Verify unique index on virtual column
    const [indexes] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment' AND INDEX_NAME = 'uk_payment_success_registration'`
    );
    expect(indexes.length).toBe(1);
    expect(indexes[0].NON_UNIQUE).toBe(0); // 0 = UNIQUE
    expect(indexes[0].COLUMN_NAME).toBe('success_registration_id');
  });

  it('2. Migration runner idempotency: Second execution does not duplicate or fail', async () => {
    // Calling runMigrations a second time must complete with zero errors
    await expect(runMigrations()).resolves.not.toThrow();

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM schema_migrations WHERE name = '001_initial_fa1_schema.sql'`
    );
    expect(rows[0].count).toBe(1);
  });

  it('3. Seed idempotency: Re-running seed is repeatable and preserves consistency', async () => {
    await expect(runSeeds()).resolves.not.toThrow();

    const [teams] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM team');
    expect(teams[0].count).toBe(1);

    const [members] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM team_member');
    expect(members[0].count).toBe(3);
  });

  it('4. Team membership integrity: Rejects duplicate membership (team_id, participant_id)', async () => {
    // Attempting to add participant 3 (who is already in team 1) to team 1 again
    let error: mysql.QueryError | null = null;
    try {
      await pool.query(
        'INSERT INTO team_member (team_id, participant_id, role) VALUES (?, ?, ?)',
        [1, 3, 'MEMBER']
      );
    } catch (err: unknown) {
      error = err as mysql.QueryError;
    }

    expect(error).not.toBeNull();
    expect(error?.code).toBe('ER_DUP_ENTRY');
  });

  it('5. Registration integrity: Rejects duplicate team registration for the same event', async () => {
    // Team 1 is already registered for Event 1 in seed data
    let error: mysql.QueryError | null = null;
    try {
      await pool.query(
        'INSERT INTO registration (team_id, event_id, status) VALUES (?, ?, ?)',
        [1, 1, 'CONFIRMED']
      );
    } catch (err: unknown) {
      error = err as mysql.QueryError;
    }

    expect(error).not.toBeNull();
    expect(error?.code).toBe('ER_DUP_ENTRY');
  });

  it('6. Payment retry & single-success uniqueness in live MySQL', async () => {
    // Verify seed has attempt 1 (FAILED) and attempt 2 (SUCCESS)
    const [attempts] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT payment_id, attempt_number, payment_status, success_registration_id FROM payment WHERE registration_id = 1 ORDER BY attempt_number ASC'
    );
    expect(attempts.length).toBe(2);
    expect(attempts[0].payment_status).toBe('FAILED');
    expect(attempts[0].success_registration_id).toBeNull();
    expect(attempts[1].payment_status).toBe('SUCCESS');
    expect(attempts[1].success_registration_id).toBe(1);

    // Attempting another FAILED attempt (attempt 3) is permitted
    const [insertResult] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO payment (registration_id, attempt_number, amount, payment_status, payment_method, transaction_id)
       VALUES (1, 3, 400.00, 'FAILED', 'MOCK', 'TXN_TEST_ATTEMPT_3_FAIL')`
    );
    expect(insertResult.insertId).toBeGreaterThan(0);

    // Attempting a second SUCCESS payment for registration 1 MUST be rejected by the unique virtual column
    let duplicateSuccessError: mysql.QueryError | null = null;
    try {
      await pool.query(
        `INSERT INTO payment (registration_id, attempt_number, amount, payment_status, payment_method, transaction_id)
         VALUES (1, 4, 400.00, 'SUCCESS', 'MOCK', 'TXN_TEST_ATTEMPT_4_DUPLICATE_SUCCESS')`
      );
    } catch (err: unknown) {
      duplicateSuccessError = err as mysql.QueryError;
    }

    expect(duplicateSuccessError).not.toBeNull();
    expect(duplicateSuccessError?.code).toBe('ER_DUP_ENTRY');

    // Clean up temporary test attempt 3
    await pool.query('DELETE FROM payment WHERE payment_id = ?', [insertResult.insertId]);
  });

  it('7. Foreign key protection: ON DELETE RESTRICT prevents deleting registration with active payment', async () => {
    let error: mysql.QueryError | null = null;
    try {
      await pool.query('DELETE FROM registration WHERE registration_id = 1');
    } catch (err: unknown) {
      error = err as mysql.QueryError;
    }

    expect(error).not.toBeNull();
    expect(error?.code).toBe('ER_ROW_IS_REFERENCED_2');
  });

  it('8. Foreign key protection: ON DELETE RESTRICT prevents deleting payment with active pass', async () => {
    let error: mysql.QueryError | null = null;
    try {
      await pool.query('DELETE FROM payment WHERE payment_id = 2');
    } catch (err: unknown) {
      error = err as mysql.QueryError;
    }

    expect(error).not.toBeNull();
    expect(error?.code).toBe('ER_ROW_IS_REFERENCED_2');
  });

  it('9. Pass receipt integrity: Bound to verified payment and registration', async () => {
    const [passes] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT pr.pass_id, pr.pass_number, pr.registration_id, pr.payment_id,
              p.payment_status, p.amount, r.status as registration_status
       FROM pass_receipt pr
       JOIN payment p ON pr.payment_id = p.payment_id
       JOIN registration r ON pr.registration_id = r.registration_id
       WHERE pr.pass_id = 1`
    );

    expect(passes.length).toBe(1);
    expect(passes[0].registration_id).toBe(1);
    expect(passes[0].payment_id).toBe(2);
    expect(passes[0].payment_status).toBe('SUCCESS');
    expect(passes[0].registration_status).toBe('CONFIRMED');
    expect(Number(passes[0].amount)).toBe(400.00);

    // 1. Rejects duplicate pass issuance for already passed registration (registration_id = 1)
    let duplicatePassError: mysql.QueryError | null = null;
    try {
      await pool.query(
        `INSERT INTO pass_receipt (registration_id, payment_id, pass_number, qr_code)
         VALUES (1, 2, 'FEST-DUPLICATE-PASS', 'QR')`
      );
    } catch (err: unknown) {
      duplicatePassError = err as mysql.QueryError;
    }
    expect(duplicatePassError).not.toBeNull();
    expect(duplicatePassError?.code).toBe('ER_DUP_ENTRY');

    // 2. Rejects pass referencing nonexistent payment on a fresh registration
    // Create team 2 and registration 2 first
    await pool.query(`INSERT IGNORE INTO team (team_id, team_name, leader_id) VALUES (2, 'Team Beta', 4)`);
    await pool.query(`INSERT IGNORE INTO registration (registration_id, team_id, event_id, status) VALUES (2, 2, 2, 'CONFIRMED')`);

    let invalidFkError: mysql.QueryError | null = null;
    try {
      await pool.query(
        `INSERT INTO pass_receipt (registration_id, payment_id, pass_number, qr_code)
         VALUES (2, 99999, 'FEST-FAKE', 'QR')`
      );
    } catch (err: unknown) {
      invalidFkError = err as mysql.QueryError;
    }
    expect(invalidFkError).not.toBeNull();
    expect(invalidFkError?.code).toBe('ER_NO_REFERENCED_ROW_2');

    // Clean up temporary registration 2
    await pool.query('DELETE FROM registration WHERE registration_id = 2');
    await pool.query('DELETE FROM team WHERE team_id = 2');
  });

  it('10. Team leadership consistency: leader_id is canonical and member role is LEADER', async () => {
    const [teamRows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT team_id, team_name, leader_id FROM team WHERE team_id = 1'
    );
    expect(teamRows.length).toBe(1);
    const leaderId = teamRows[0].leader_id;
    expect(leaderId).toBe(3);

    // Verify in team_member that participant 3 is recorded as LEADER
    const [leaderMember] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT team_member_id, role FROM team_member WHERE team_id = 1 AND participant_id = ?',
      [leaderId]
    );
    expect(leaderMember.length).toBe(1);
    expect(leaderMember[0].role).toBe('LEADER');

    // Verify other team members have role MEMBER
    const [otherMembers] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT participant_id, role FROM team_member WHERE team_id = 1 AND participant_id != ?',
      [leaderId]
    );
    expect(otherMembers.length).toBe(2);
    for (const m of otherMembers) {
      expect(m.role).toBe('MEMBER');
    }
  });
});
