import mysql from 'mysql2/promise';
import { getDbPool } from '../db/connection.js';
import { ScheduleRow, CreateScheduleDto, UpdateScheduleDto } from '../types/event.types.js';

function formatDate(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    const year = val.getUTCFullYear();
    const month = String(val.getUTCMonth() + 1).padStart(2, '0');
    const day = String(val.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const str = String(val);
  return str.includes('T') ? str.split('T')[0] : str;
}

export class ScheduleRepository {
  private getDb(conn?: mysql.Connection | mysql.Pool): mysql.Connection | mysql.Pool {
    return conn || getDbPool();
  }

  private mapRow(row: mysql.RowDataPacket): ScheduleRow {
    return {
      schedule_id: Number(row.schedule_id),
      event_id: Number(row.event_id),
      event_date: formatDate(row.event_date),
      start_time: String(row.start_time),
      end_time: String(row.end_time),
      venue: String(row.venue),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  async findByEventId(eventId: number, conn?: mysql.Connection): Promise<ScheduleRow[]> {
    const db = this.getDb(conn);
    const sql = `
      SELECT schedule_id, event_id, event_date, start_time, end_time, venue, created_at, updated_at
      FROM \`schedule\`
      WHERE event_id = ?
      ORDER BY event_date ASC, start_time ASC
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [eventId]);
    return rows.map((r) => this.mapRow(r));
  }

  async findById(scheduleId: number, conn?: mysql.Connection): Promise<ScheduleRow | null> {
    const db = this.getDb(conn);
    const sql = `
      SELECT schedule_id, event_id, event_date, start_time, end_time, venue, created_at, updated_at
      FROM \`schedule\`
      WHERE schedule_id = ?
      LIMIT 1
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [scheduleId]);
    if (rows.length === 0) {
      return null;
    }
    return this.mapRow(rows[0]);
  }

  async create(eventId: number, dto: CreateScheduleDto, conn?: mysql.Connection): Promise<number> {
    const db = this.getDb(conn);
    const sql = `
      INSERT INTO \`schedule\` (\`event_id\`, \`event_date\`, \`start_time\`, \`end_time\`, \`venue\`)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.query<mysql.ResultSetHeader>(sql, [
      eventId,
      dto.event_date,
      dto.start_time,
      dto.end_time,
      dto.venue,
    ]);

    return result.insertId;
  }

  async update(scheduleId: number, dto: UpdateScheduleDto, conn?: mysql.Connection): Promise<boolean> {
    const db = this.getDb(conn);
    const updates: string[] = [];
    const params: unknown[] = [];

    if (dto.event_date !== undefined) {
      updates.push('`event_date` = ?');
      params.push(dto.event_date);
    }
    if (dto.start_time !== undefined) {
      updates.push('`start_time` = ?');
      params.push(dto.start_time);
    }
    if (dto.end_time !== undefined) {
      updates.push('`end_time` = ?');
      params.push(dto.end_time);
    }
    if (dto.venue !== undefined) {
      updates.push('`venue` = ?');
      params.push(dto.venue);
    }

    if (updates.length === 0) {
      return true;
    }

    const sql = `UPDATE \`schedule\` SET ${updates.join(', ')} WHERE \`schedule_id\` = ?`;
    params.push(scheduleId);

    const [result] = await db.query<mysql.ResultSetHeader>(sql, params);
    return result.affectedRows > 0;
  }
}

export const scheduleRepository = new ScheduleRepository();
