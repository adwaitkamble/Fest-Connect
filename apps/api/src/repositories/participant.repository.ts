import mysql from 'mysql2/promise';
import { getDbPool } from '../db/connection.js';
import { ParticipantRow, CreateParticipantDto } from '../types/auth.types.js';

export class ParticipantRepository {
  private getDb(conn?: mysql.Connection | mysql.Pool): mysql.Connection | mysql.Pool {
    return conn || getDbPool();
  }

  async findByEmail(email: string, conn?: mysql.Connection): Promise<ParticipantRow | null> {
    const db = this.getDb(conn);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT participant_id, first_name, last_name, email, phone, college_name,
              date_of_birth, password_hash, role, created_at, updated_at
       FROM participant
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      participant_id: row.participant_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      college_name: row.college_name,
      date_of_birth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().split('T')[0] : null,
      password_hash: row.password_hash,
      role: row.role,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  async findById(participantId: number, conn?: mysql.Connection): Promise<ParticipantRow | null> {
    const db = this.getDb(conn);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT participant_id, first_name, last_name, email, phone, college_name,
              date_of_birth, password_hash, role, created_at, updated_at
       FROM participant
       WHERE participant_id = ?
       LIMIT 1`,
      [participantId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      participant_id: row.participant_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      college_name: row.college_name,
      date_of_birth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().split('T')[0] : null,
      password_hash: row.password_hash,
      role: row.role,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  async create(data: CreateParticipantDto, conn?: mysql.Connection): Promise<number> {
    const db = this.getDb(conn);
    const [result] = await db.query<mysql.ResultSetHeader>(
      `INSERT INTO participant (first_name, last_name, email, phone, college_name, date_of_birth, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.first_name,
        data.last_name,
        data.email,
        data.phone ?? null,
        data.college_name ?? null,
        data.date_of_birth ?? null,
        data.password_hash,
        'PARTICIPANT', // Server-authoritative role enforcement
      ]
    );

    return result.insertId;
  }

  async getSkills(participantId: number, conn?: mysql.Connection): Promise<string[]> {
    const db = this.getDb(conn);
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT skill FROM participant_skill WHERE participant_id = ? ORDER BY skill ASC`,
      [participantId]
    );

    return rows.map((r) => r.skill);
  }

  async addSkills(participantId: number, skills: string[], conn?: mysql.Connection): Promise<void> {
    if (!skills || skills.length === 0) return;
    const db = this.getDb(conn);

    // Filter unique, non-empty skills
    const uniqueSkills = Array.from(new Set(skills.map((s) => s.trim()))).filter(Boolean);
    if (uniqueSkills.length === 0) return;

    for (const skill of uniqueSkills) {
      await db.query(
        `INSERT IGNORE INTO participant_skill (participant_id, skill) VALUES (?, ?)`,
        [participantId, skill]
      );
    }
  }
}

export const participantRepository = new ParticipantRepository();
