import mysql from 'mysql2/promise';
import { getDbPool } from '../db/connection.js';
import {
  EventWithCoordinatorRow,
  EventListQuery,
  CreateEventDto,
  UpdateEventDto,
} from '../types/event.types.js';

export class EventRepository {
  private getDb(conn?: mysql.Connection | mysql.Pool): mysql.Connection | mysql.Pool {
    return conn || getDbPool();
  }

  private mapRow(row: mysql.RowDataPacket): EventWithCoordinatorRow {
    return {
      event_id: row.event_id,
      coordinator_id: row.coordinator_id ?? null,
      event_name: row.event_name,
      event_type: row.event_type,
      description: row.description ?? null,
      min_team_size: Number(row.min_team_size),
      max_team_size: Number(row.max_team_size),
      registration_fee:
        typeof row.registration_fee === 'number'
          ? row.registration_fee.toFixed(2)
          : String(row.registration_fee ?? '0.00'),
      status: row.status,
      coordinator_name: row.coordinator_name ?? null,
      coordinator_email: row.coordinator_email ?? null,
      coordinator_phone: row.coordinator_phone ?? null,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  async findPaginated(
    query: EventListQuery,
    limit: number,
    offset: number,
    conn?: mysql.Connection
  ): Promise<EventWithCoordinatorRow[]> {
    const db = this.getDb(conn);
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (query.event_type) {
      conditions.push('e.event_type = ?');
      params.push(query.event_type);
    }

    if (query.status) {
      conditions.push('e.status = ?');
      params.push(query.status);
    }

    if (query.search) {
      conditions.push('(e.event_name LIKE ? OR e.description LIKE ?)');
      const term = `%${query.search}%`;
      params.push(term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        e.event_id,
        e.coordinator_id,
        e.event_name,
        e.event_type,
        e.description,
        e.min_team_size,
        e.max_team_size,
        e.registration_fee,
        e.status,
        e.created_at,
        e.updated_at,
        ec.name AS coordinator_name,
        ec.email AS coordinator_email,
        ec.phone AS coordinator_phone
      FROM \`event\` e
      LEFT JOIN \`event_coordinator\` ec ON e.coordinator_id = ec.coordinator_id
      ${whereClause}
      ORDER BY e.event_id ASC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, params);
    return rows.map((r) => this.mapRow(r));
  }

  async count(query: EventListQuery, conn?: mysql.Connection): Promise<number> {
    const db = this.getDb(conn);
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (query.event_type) {
      conditions.push('e.event_type = ?');
      params.push(query.event_type);
    }

    if (query.status) {
      conditions.push('e.status = ?');
      params.push(query.status);
    }

    if (query.search) {
      conditions.push('(e.event_name LIKE ? OR e.description LIKE ?)');
      const term = `%${query.search}%`;
      params.push(term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT COUNT(*) AS total
      FROM \`event\` e
      ${whereClause}
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, params);
    return rows[0] ? Number(rows[0].total) : 0;
  }

  async findById(eventId: number, conn?: mysql.Connection): Promise<EventWithCoordinatorRow | null> {
    const db = this.getDb(conn);
    const sql = `
      SELECT
        e.event_id,
        e.coordinator_id,
        e.event_name,
        e.event_type,
        e.description,
        e.min_team_size,
        e.max_team_size,
        e.registration_fee,
        e.status,
        e.created_at,
        e.updated_at,
        ec.name AS coordinator_name,
        ec.email AS coordinator_email,
        ec.phone AS coordinator_phone
      FROM \`event\` e
      LEFT JOIN \`event_coordinator\` ec ON e.coordinator_id = ec.coordinator_id
      WHERE e.event_id = ?
      LIMIT 1
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [eventId]);
    if (rows.length === 0) {
      return null;
    }
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateEventDto, conn?: mysql.Connection): Promise<number> {
    const db = this.getDb(conn);
    const sql = `
      INSERT INTO \`event\`
        (\`coordinator_id\`, \`event_name\`, \`event_type\`, \`description\`, \`min_team_size\`, \`max_team_size\`, \`registration_fee\`, \`status\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      dto.coordinator_id ?? null,
      dto.event_name,
      dto.event_type,
      dto.description ?? null,
      dto.min_team_size ?? 1,
      dto.max_team_size ?? 1,
      dto.registration_fee ?? 0.0,
      dto.status ?? 'UPCOMING',
    ];

    const [result] = await db.query<mysql.ResultSetHeader>(sql, params);
    return result.insertId;
  }

  async update(eventId: number, dto: UpdateEventDto, conn?: mysql.Connection): Promise<boolean> {
    const db = this.getDb(conn);
    const updates: string[] = [];
    const params: unknown[] = [];

    if (dto.event_name !== undefined) {
      updates.push('`event_name` = ?');
      params.push(dto.event_name);
    }
    if (dto.event_type !== undefined) {
      updates.push('`event_type` = ?');
      params.push(dto.event_type);
    }
    if (dto.description !== undefined) {
      updates.push('`description` = ?');
      params.push(dto.description);
    }
    if (dto.min_team_size !== undefined) {
      updates.push('`min_team_size` = ?');
      params.push(dto.min_team_size);
    }
    if (dto.max_team_size !== undefined) {
      updates.push('`max_team_size` = ?');
      params.push(dto.max_team_size);
    }
    if (dto.registration_fee !== undefined) {
      updates.push('`registration_fee` = ?');
      params.push(dto.registration_fee);
    }
    if (dto.status !== undefined) {
      updates.push('`status` = ?');
      params.push(dto.status);
    }
    if (dto.coordinator_id !== undefined) {
      updates.push('`coordinator_id` = ?');
      params.push(dto.coordinator_id);
    }

    if (updates.length === 0) {
      return true; // No fields to update
    }

    const sql = `UPDATE \`event\` SET ${updates.join(', ')} WHERE \`event_id\` = ?`;
    params.push(eventId);

    const [result] = await db.query<mysql.ResultSetHeader>(sql, params);
    return result.affectedRows > 0;
  }
}

export const eventRepository = new EventRepository();
