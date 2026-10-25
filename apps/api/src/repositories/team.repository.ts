import mysql from 'mysql2/promise';
import { getDbPool } from '../db/connection.js';
import {
  TeamWithLeaderRow,
  TeamMemberRow,
  TeamMemberDetail,
  TeamStatus,
} from '../types/team.types.js';

export class TeamRepository {
  private getDb(conn?: mysql.Connection | mysql.Pool): mysql.Connection | mysql.Pool {
    return conn || getDbPool();
  }

  async create(teamName: string, leaderId: number, conn?: mysql.Connection): Promise<number> {
    const db = this.getDb(conn);
    const sql = `
      INSERT INTO \`team\` (\`team_name\`, \`leader_id\`, \`status\`)
      VALUES (?, ?, 'FORMING')
    `;

    const [result] = await db.query<mysql.ResultSetHeader>(sql, [teamName, leaderId]);
    return result.insertId;
  }

  async addMember(
    teamId: number,
    participantId: number,
    role: string = 'MEMBER',
    conn?: mysql.Connection
  ): Promise<number> {
    const db = this.getDb(conn);
    const sql = `
      INSERT INTO \`team_member\` (\`team_id\`, \`participant_id\`, \`role\`)
      VALUES (?, ?, ?)
    `;

    const [result] = await db.query<mysql.ResultSetHeader>(sql, [teamId, participantId, role]);
    return result.insertId;
  }

  async findById(teamId: number, conn?: mysql.Connection): Promise<TeamWithLeaderRow | null> {
    const db = this.getDb(conn);
    const sql = `
      SELECT
        t.team_id,
        t.team_name,
        t.leader_id,
        t.status,
        t.created_at,
        t.updated_at,
        p.first_name AS leader_first_name,
        p.last_name AS leader_last_name,
        p.email AS leader_email,
        (SELECT COUNT(*) FROM \`team_member\` tm WHERE tm.team_id = t.team_id) AS member_count
      FROM \`team\` t
      INNER JOIN \`participant\` p ON t.leader_id = p.participant_id
      WHERE t.team_id = ?
      LIMIT 1
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [teamId]);
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      team_id: row.team_id,
      team_name: row.team_name,
      leader_id: row.leader_id,
      status: row.status as TeamStatus,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      leader_first_name: row.leader_first_name,
      leader_last_name: row.leader_last_name,
      leader_email: row.leader_email,
      member_count: Number(row.member_count),
    };
  }

  async findMembers(teamId: number, conn?: mysql.Connection): Promise<TeamMemberDetail[]> {
    const db = this.getDb(conn);
    const sql = `
      SELECT
        tm.team_member_id,
        tm.participant_id,
        tm.role,
        tm.joined_at,
        p.first_name,
        p.last_name,
        p.email,
        p.phone,
        p.college_name
      FROM \`team_member\` tm
      INNER JOIN \`participant\` p ON tm.participant_id = p.participant_id
      WHERE tm.team_id = ?
      ORDER BY FIELD(tm.role, 'LEADER') DESC, tm.joined_at ASC
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [teamId]);
    return rows.map((r) => ({
      team_member_id: r.team_member_id,
      participant_id: r.participant_id,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      phone: r.phone ?? null,
      college_name: r.college_name ?? null,
      role: r.role,
      joined_at: new Date(r.joined_at).toISOString(),
    }));
  }

  async findMember(
    teamId: number,
    participantId: number,
    conn?: mysql.Connection
  ): Promise<TeamMemberRow | null> {
    const db = this.getDb(conn);
    const sql = `
      SELECT team_member_id, team_id, participant_id, role, joined_at
      FROM \`team_member\`
      WHERE team_id = ? AND participant_id = ?
      LIMIT 1
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [teamId, participantId]);
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      team_member_id: row.team_member_id,
      team_id: row.team_id,
      participant_id: row.participant_id,
      role: row.role,
      joined_at: new Date(row.joined_at).toISOString(),
    };
  }

  async removeMember(teamId: number, participantId: number, conn?: mysql.Connection): Promise<boolean> {
    const db = this.getDb(conn);
    const sql = `
      DELETE FROM \`team_member\`
      WHERE team_id = ? AND participant_id = ?
    `;

    const [result] = await db.query<mysql.ResultSetHeader>(sql, [teamId, participantId]);
    return result.affectedRows > 0;
  }

  async countMembers(teamId: number, conn?: mysql.Connection): Promise<number> {
    const db = this.getDb(conn);
    const sql = `
      SELECT COUNT(*) AS total
      FROM \`team_member\`
      WHERE team_id = ?
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [teamId]);
    return rows[0] ? Number(rows[0].total) : 0;
  }

  async findByParticipantId(participantId: number, conn?: mysql.Connection): Promise<TeamWithLeaderRow[]> {
    const db = this.getDb(conn);
    const sql = `
      SELECT
        t.team_id,
        t.team_name,
        t.leader_id,
        t.status,
        t.created_at,
        t.updated_at,
        p.first_name AS leader_first_name,
        p.last_name AS leader_last_name,
        p.email AS leader_email,
        (SELECT COUNT(*) FROM \`team_member\` tm WHERE tm.team_id = t.team_id) AS member_count
      FROM \`team\` t
      INNER JOIN \`participant\` p ON t.leader_id = p.participant_id
      INNER JOIN \`team_member\` tm2 ON t.team_id = tm2.team_id
      WHERE tm2.participant_id = ?
      ORDER BY t.team_id DESC
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [participantId]);
    return rows.map((r) => ({
      team_id: r.team_id,
      team_name: r.team_name,
      leader_id: r.leader_id,
      status: r.status as TeamStatus,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
      leader_first_name: r.leader_first_name,
      leader_last_name: r.leader_last_name,
      leader_email: r.leader_email,
      member_count: Number(r.member_count),
    }));
  }

  async findAll(limit: number, offset: number, conn?: mysql.Connection): Promise<TeamWithLeaderRow[]> {
    const db = this.getDb(conn);
    const sql = `
      SELECT
        t.team_id,
        t.team_name,
        t.leader_id,
        t.status,
        t.created_at,
        t.updated_at,
        p.first_name AS leader_first_name,
        p.last_name AS leader_last_name,
        p.email AS leader_email,
        (SELECT COUNT(*) FROM \`team_member\` tm WHERE tm.team_id = t.team_id) AS member_count
      FROM \`team\` t
      INNER JOIN \`participant\` p ON t.leader_id = p.participant_id
      ORDER BY t.team_id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [limit, offset]);
    return rows.map((r) => ({
      team_id: r.team_id,
      team_name: r.team_name,
      leader_id: r.leader_id,
      status: r.status as TeamStatus,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
      leader_first_name: r.leader_first_name,
      leader_last_name: r.leader_last_name,
      leader_email: r.leader_email,
      member_count: Number(r.member_count),
    }));
  }

  async updateStatus(teamId: number, status: TeamStatus, conn?: mysql.Connection): Promise<boolean> {
    const db = this.getDb(conn);
    const sql = `
      UPDATE \`team\`
      SET \`status\` = ?
      WHERE \`team_id\` = ?
    `;

    const [result] = await db.query<mysql.ResultSetHeader>(sql, [status, teamId]);
    return result.affectedRows > 0;
  }
}

export const teamRepository = new TeamRepository();
