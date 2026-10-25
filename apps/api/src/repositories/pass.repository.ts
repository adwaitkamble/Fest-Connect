import mysql, { PoolConnection } from 'mysql2/promise';
import { getDbPool } from '../db/connection.js';
import { PassReceiptRecord, CreatePassData, PassMemberInfo, PassScheduleInfo } from '../types/pass.types.js';

export interface PassWithContextRow {
  pass_id: number;
  registration_id: number;
  payment_id: number;
  pass_number: string;
  qr_code: string;
  issue_date: Date | string;

  // Registration details
  team_id: number;
  team_name: string;
  leader_id: number;
  leader_name: string;
  leader_email: string;
  event_id: number;
  event_name: string;
  event_type: string;
  registration_fee: string;
  coordinator_id: number;
  registration_status: string;
  registration_date: string;

  // Payment details
  payment_amount: number;
  payment_status: string;
  transaction_id: string | null;
  payment_date: string | null;
}

export class PassRepository {
  private get connection() {
    return getDbPool();
  }

  async create(data: CreatePassData, conn?: PoolConnection): Promise<number> {
    const executor = conn || this.connection;
    const [result] = await executor.query<mysql.ResultSetHeader>(
      `INSERT INTO \`pass_receipt\` (\`registration_id\`, \`payment_id\`, \`pass_number\`, \`qr_code\`)
       VALUES (?, ?, ?, ?)`,
      [data.registration_id, data.payment_id, data.pass_number, data.qr_code]
    );
    return result.insertId;
  }

  async findById(passId: number): Promise<PassReceiptRecord | null> {
    const [rows] = await this.connection.query<mysql.RowDataPacket[]>(
      `SELECT \`pass_id\`, \`registration_id\`, \`payment_id\`, \`pass_number\`, \`qr_code\`, \`issue_date\`
       FROM \`pass_receipt\`
       WHERE \`pass_id\` = ?`,
      [passId]
    );
    return (rows[0] as PassReceiptRecord) || null;
  }

  async findByRegistrationId(registrationId: number, conn?: PoolConnection): Promise<PassReceiptRecord | null> {
    const executor = conn || this.connection;
    const [rows] = await executor.query<mysql.RowDataPacket[]>(
      `SELECT \`pass_id\`, \`registration_id\`, \`payment_id\`, \`pass_number\`, \`qr_code\`, \`issue_date\`
       FROM \`pass_receipt\`
       WHERE \`registration_id\` = ?`,
      [registrationId]
    );
    return (rows[0] as PassReceiptRecord) || null;
  }

  async findByPassNumber(passNumber: string): Promise<PassReceiptRecord | null> {
    const [rows] = await this.connection.query<mysql.RowDataPacket[]>(
      `SELECT \`pass_id\`, \`registration_id\`, \`payment_id\`, \`pass_number\`, \`qr_code\`, \`issue_date\`
       FROM \`pass_receipt\`
       WHERE \`pass_number\` = ?`,
      [passNumber]
    );
    return (rows[0] as PassReceiptRecord) || null;
  }

  async findByQrCode(qrCode: string): Promise<PassReceiptRecord | null> {
    const [rows] = await this.connection.query<mysql.RowDataPacket[]>(
      `SELECT \`pass_id\`, \`registration_id\`, \`payment_id\`, \`pass_number\`, \`qr_code\`, \`issue_date\`
       FROM \`pass_receipt\`
       WHERE \`qr_code\` = ?`,
      [qrCode]
    );
    return (rows[0] as PassReceiptRecord) || null;
  }

  async getPassWithContext(registrationId: number): Promise<PassWithContextRow | null> {
    const [rows] = await this.connection.query<mysql.RowDataPacket[]>(
      `SELECT 
         pr.pass_id, pr.registration_id, pr.payment_id, pr.pass_number, pr.qr_code, pr.issue_date,
         r.team_id, t.team_name, t.leader_id,
         CONCAT(p_leader.first_name, ' ', p_leader.last_name) AS leader_name,
         p_leader.email AS leader_email,
         r.event_id, e.event_name, e.event_type, e.registration_fee, e.coordinator_id,
         r.status AS registration_status, r.registration_date,
         p.amount AS payment_amount, p.payment_status, p.transaction_id, p.payment_date
       FROM \`pass_receipt\` pr
       JOIN \`registration\` r ON pr.registration_id = r.registration_id
       JOIN \`team\` t ON r.team_id = t.team_id
       JOIN \`participant\` p_leader ON t.leader_id = p_leader.participant_id
       JOIN \`event\` e ON r.event_id = e.event_id
       JOIN \`payment\` p ON pr.payment_id = p.payment_id
       WHERE pr.registration_id = ?`,
      [registrationId]
    );

    return (rows[0] as PassWithContextRow) || null;
  }

  async getTeamMembers(teamId: number): Promise<PassMemberInfo[]> {
    const [rows] = await this.connection.query<mysql.RowDataPacket[]>(
      `SELECT 
         tm.participant_id,
         CONCAT(p.first_name, ' ', p.last_name) AS name,
         p.email,
         tm.role
       FROM \`team_member\` tm
       JOIN \`participant\` p ON tm.participant_id = p.participant_id
       WHERE tm.team_id = ?
       ORDER BY CASE WHEN tm.role = 'LEADER' THEN 1 ELSE 2 END, tm.joined_at ASC`,
      [teamId]
    );

    return rows as PassMemberInfo[];
  }

  async getEventSchedules(eventId: number): Promise<PassScheduleInfo[]> {
    const [rows] = await this.connection.query<mysql.RowDataPacket[]>(
      `SELECT schedule_id, event_date, start_time, end_time, venue
       FROM \`schedule\`
       WHERE event_id = ?
       ORDER BY event_date ASC, start_time ASC`,
      [eventId]
    );

    return rows as PassScheduleInfo[];
  }
}

export const passRepository = new PassRepository();
