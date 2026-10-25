import mysql from 'mysql2/promise';
import { getDbPool } from '../db/connection.js';
import { CoordinatorRow } from '../types/auth.types.js';

export class CoordinatorRepository {
  private getDb(conn?: mysql.Connection | mysql.Pool): mysql.Connection | mysql.Pool {
    return conn || getDbPool();
  }

  async findByParticipantId(participantId: number, conn?: mysql.Connection): Promise<CoordinatorRow | null> {
    const db = this.getDb(conn);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT coordinator_id, participant_id, name, email, phone, created_at, updated_at
       FROM event_coordinator
       WHERE participant_id = ?
       LIMIT 1`,
      [participantId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      coordinator_id: row.coordinator_id,
      participant_id: row.participant_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  async findById(coordinatorId: number, conn?: mysql.Connection): Promise<CoordinatorRow | null> {
    const db = this.getDb(conn);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT coordinator_id, participant_id, name, email, phone, created_at, updated_at
       FROM event_coordinator
       WHERE coordinator_id = ?
       LIMIT 1`,
      [coordinatorId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      coordinator_id: row.coordinator_id,
      participant_id: row.participant_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  async findByEmail(email: string, conn?: mysql.Connection): Promise<CoordinatorRow | null> {
    const db = this.getDb(conn);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT coordinator_id, participant_id, name, email, phone, created_at, updated_at
       FROM event_coordinator
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      coordinator_id: row.coordinator_id,
      participant_id: row.participant_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }
}

export const coordinatorRepository = new CoordinatorRepository();
