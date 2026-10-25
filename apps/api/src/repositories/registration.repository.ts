import mysql from 'mysql2/promise';
import { getDbPool } from '../db/connection.js';
import {
  RegistrationRow,
  RegistrationDetailResponse,
  RegistrationSummary,
  RegistrationStatus,
} from '../types/team.types.js';

export interface RegistrationFilters {
  teamId?: number;
  eventId?: number;
  participantId?: number;
  coordinatorId?: number;
  status?: RegistrationStatus;
}

export class RegistrationRepository {
  private getDb(conn?: mysql.Connection | mysql.Pool): mysql.Connection | mysql.Pool {
    return conn || getDbPool();
  }

  private mapDetailRow(row: mysql.RowDataPacket): RegistrationDetailResponse {
    return {
      registration_id: row.registration_id,
      team_id: row.team_id,
      team_name: row.team_name,
      leader_id: row.leader_id,
      leader_name: `${row.leader_first_name} ${row.leader_last_name}`.trim(),
      event_id: row.event_id,
      event_name: row.event_name,
      event_type: row.event_type,
      registration_fee:
        typeof row.registration_fee === 'number'
          ? row.registration_fee.toFixed(2)
          : String(row.registration_fee ?? '0.00'),
      status: row.status as RegistrationStatus,
      registration_date: new Date(row.registration_date).toISOString(),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  async create(teamId: number, eventId: number, conn?: mysql.Connection): Promise<number> {
    const db = this.getDb(conn);
    const sql = `
      INSERT INTO \`registration\` (\`team_id\`, \`event_id\`, \`status\`)
      VALUES (?, ?, 'PENDING_PAYMENT')
    `;

    const [result] = await db.query<mysql.ResultSetHeader>(sql, [teamId, eventId]);
    return result.insertId;
  }

  async findById(registrationId: number, conn?: mysql.Connection): Promise<RegistrationDetailResponse | null> {
    const db = this.getDb(conn);
    const sql = `
      SELECT
        r.registration_id,
        r.team_id,
        r.event_id,
        r.registration_date,
        r.status,
        r.created_at,
        r.updated_at,
        t.team_name,
        t.leader_id,
        p.first_name AS leader_first_name,
        p.last_name AS leader_last_name,
        e.event_name,
        e.event_type,
        e.registration_fee
      FROM \`registration\` r
      INNER JOIN \`team\` t ON r.team_id = t.team_id
      INNER JOIN \`participant\` p ON t.leader_id = p.participant_id
      INNER JOIN \`event\` e ON r.event_id = e.event_id
      WHERE r.registration_id = ?
      LIMIT 1
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [registrationId]);
    if (rows.length === 0) {
      return null;
    }
    return this.mapDetailRow(rows[0]);
  }

  async findByTeamAndEvent(
    teamId: number,
    eventId: number,
    conn?: mysql.Connection
  ): Promise<RegistrationRow | null> {
    const db = this.getDb(conn);
    const sql = `
      SELECT registration_id, team_id, event_id, registration_date, status, created_at, updated_at
      FROM \`registration\`
      WHERE team_id = ? AND event_id = ?
      LIMIT 1
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [teamId, eventId]);
    if (rows.length === 0) {
      return null;
    }

    const r = rows[0];
    return {
      registration_id: r.registration_id,
      team_id: r.team_id,
      event_id: r.event_id,
      registration_date: new Date(r.registration_date).toISOString(),
      status: r.status as RegistrationStatus,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }

  async findByTeamId(teamId: number, conn?: mysql.Connection): Promise<RegistrationSummary[]> {
    const db = this.getDb(conn);
    const sql = `
      SELECT
        r.registration_id,
        r.event_id,
        r.status,
        r.registration_date,
        e.event_name,
        e.event_type,
        e.registration_fee
      FROM \`registration\` r
      INNER JOIN \`event\` e ON r.event_id = e.event_id
      WHERE r.team_id = ?
      ORDER BY r.registration_id DESC
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [teamId]);
    return rows.map((r) => ({
      registration_id: r.registration_id,
      event_id: r.event_id,
      event_name: r.event_name,
      event_type: r.event_type,
      registration_fee:
        typeof r.registration_fee === 'number'
          ? r.registration_fee.toFixed(2)
          : String(r.registration_fee ?? '0.00'),
      status: r.status as RegistrationStatus,
      registration_date: new Date(r.registration_date).toISOString(),
    }));
  }

  async findRegistrations(
    filters: RegistrationFilters,
    limit: number,
    offset: number,
    conn?: mysql.Connection
  ): Promise<RegistrationDetailResponse[]> {
    const db = this.getDb(conn);
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.teamId) {
      conditions.push('r.team_id = ?');
      params.push(filters.teamId);
    }
    if (filters.eventId) {
      conditions.push('r.event_id = ?');
      params.push(filters.eventId);
    }
    if (filters.status) {
      conditions.push('r.status = ?');
      params.push(filters.status);
    }
    if (filters.coordinatorId) {
      conditions.push('e.coordinator_id = ?');
      params.push(filters.coordinatorId);
    }
    if (filters.participantId) {
      conditions.push(`
        EXISTS (
          SELECT 1 FROM \`team_member\` tm
          WHERE tm.team_id = r.team_id AND tm.participant_id = ?
        )
      `);
      params.push(filters.participantId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        r.registration_id,
        r.team_id,
        r.event_id,
        r.registration_date,
        r.status,
        r.created_at,
        r.updated_at,
        t.team_name,
        t.leader_id,
        p.first_name AS leader_first_name,
        p.last_name AS leader_last_name,
        e.event_name,
        e.event_type,
        e.registration_fee
      FROM \`registration\` r
      INNER JOIN \`team\` t ON r.team_id = t.team_id
      INNER JOIN \`participant\` p ON t.leader_id = p.participant_id
      INNER JOIN \`event\` e ON r.event_id = e.event_id
      ${whereClause}
      ORDER BY r.registration_id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, params);
    return rows.map((r) => this.mapDetailRow(r));
  }

  async countRegistrations(filters: RegistrationFilters, conn?: mysql.Connection): Promise<number> {
    const db = this.getDb(conn);
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.teamId) {
      conditions.push('r.team_id = ?');
      params.push(filters.teamId);
    }
    if (filters.eventId) {
      conditions.push('r.event_id = ?');
      params.push(filters.eventId);
    }
    if (filters.status) {
      conditions.push('r.status = ?');
      params.push(filters.status);
    }
    if (filters.coordinatorId) {
      conditions.push('e.coordinator_id = ?');
      params.push(filters.coordinatorId);
    }
    if (filters.participantId) {
      conditions.push(`
        EXISTS (
          SELECT 1 FROM \`team_member\` tm
          WHERE tm.team_id = r.team_id AND tm.participant_id = ?
        )
      `);
      params.push(filters.participantId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT COUNT(*) AS total
      FROM \`registration\` r
      INNER JOIN \`team\` t ON r.team_id = t.team_id
      INNER JOIN \`event\` e ON r.event_id = e.event_id
      ${whereClause}
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, params);
    return rows[0] ? Number(rows[0].total) : 0;
  }

  async updateStatus(
    registrationId: number,
    status: 'CANCELLED' | 'CONFIRMED',
    conn?: mysql.Connection
  ): Promise<boolean> {
    const db = this.getDb(conn);
    const sql = `
      UPDATE \`registration\`
      SET \`status\` = ?
      WHERE \`registration_id\` = ?
    `;

    const [result] = await db.query<mysql.ResultSetHeader>(sql, [status, registrationId]);
    return result.affectedRows > 0;
  }

  /**
   * Checks if any member of teamId is already registered for an event
   * that overlaps with eventId's schedules on the same calendar day.
   */
  async findScheduleConflict(
    teamId: number,
    eventId: number,
    conn?: mysql.Connection
  ): Promise<{ conflicting_event_name: string; event_date: string; participant_name: string } | null> {
    const db = this.getDb(conn);
    const sql = `
      SELECT
        e2.event_name AS conflicting_event_name,
        s1.event_date,
        CONCAT(p.first_name, ' ', p.last_name) AS participant_name
      FROM \`team_member\` tm1
      INNER JOIN \`participant\` p ON tm1.participant_id = p.participant_id
      INNER JOIN \`team_member\` tm2 ON tm1.participant_id = tm2.participant_id
      INNER JOIN \`registration\` r2 ON tm2.team_id = r2.team_id
      INNER JOIN \`event\` e2 ON r2.event_id = e2.event_id
      INNER JOIN \`schedule\` s2 ON e2.event_id = s2.event_id
      INNER JOIN \`schedule\` s1 ON s1.event_id = ?
      WHERE tm1.team_id = ?
        AND r2.event_id != ?
        AND r2.status != 'CANCELLED'
        AND s1.event_date = s2.event_date
        AND s1.start_time < s2.end_time
        AND s1.end_time > s2.start_time
      LIMIT 1
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [eventId, teamId, eventId]);
    if (rows.length === 0) {
      return null;
    }

    const r = rows[0];
    return {
      conflicting_event_name: r.conflicting_event_name,
      event_date: String(r.event_date),
      participant_name: r.participant_name,
    };
  }
}

export const registrationRepository = new RegistrationRepository();
