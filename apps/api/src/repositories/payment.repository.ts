import mysql from 'mysql2/promise';
import { getDbPool } from '../db/connection.js';
import { getEnv } from '../config/env.js';
import {
  PaymentRecord,
  PaymentDetailResponse,
  PaymentStatus,
} from '../types/payment.types.js';

export interface CreatePaymentAttemptData {
  registrationId: number;
  attemptNumber: number;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  transactionId?: string | null;
  paymentDate?: Date | null;
}

export interface UpdatePaymentAttemptData {
  paymentStatus: PaymentStatus;
  transactionId?: string | null;
  paymentDate?: Date | null;
}

export class PaymentRepository {
  private getDb(conn?: mysql.Connection | mysql.Pool): mysql.Connection | mysql.Pool {
    return conn || getDbPool();
  }

  private mapDetailRow(row: mysql.RowDataPacket): PaymentDetailResponse {
    const currency = getEnv().DEFAULT_CURRENCY || 'INR';
    return {
      payment_id: row.payment_id,
      registration_id: row.registration_id,
      attempt_number: row.attempt_number,
      amount:
        typeof row.amount === 'number'
          ? row.amount.toFixed(2)
          : String(row.amount ?? '0.00'),
      currency,
      payment_status: row.payment_status as PaymentStatus,
      payment_method: row.payment_method,
      transaction_id: row.transaction_id || null,
      payment_date: row.payment_date ? new Date(row.payment_date).toISOString() : null,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      team_id: row.team_id,
      team_name: row.team_name,
      leader_id: row.leader_id,
      leader_name: `${row.leader_first_name} ${row.leader_last_name}`.trim(),
      event_id: row.event_id,
      event_name: row.event_name,
      registration_status: row.registration_status,
    };
  }

  async getNextAttemptNumber(registrationId: number, conn?: mysql.Connection): Promise<number> {
    const db = this.getDb(conn);
    const sql = `
      SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt
      FROM \`payment\`
      WHERE \`registration_id\` = ?
    `;
    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [registrationId]);
    return Number(rows[0]?.next_attempt || 1);
  }

  async createAttempt(
    data: CreatePaymentAttemptData,
    conn?: mysql.Connection
  ): Promise<number> {
    const db = this.getDb(conn);
    const sql = `
      INSERT INTO \`payment\` (
        \`registration_id\`,
        \`attempt_number\`,
        \`amount\`,
        \`payment_status\`,
        \`payment_method\`,
        \`transaction_id\`,
        \`payment_date\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query<mysql.ResultSetHeader>(sql, [
      data.registrationId,
      data.attemptNumber,
      data.amount,
      data.paymentStatus,
      data.paymentMethod,
      data.transactionId || null,
      data.paymentDate ? new Date(data.paymentDate) : null,
    ]);

    return result.insertId;
  }

  async updateAttempt(
    paymentId: number,
    data: UpdatePaymentAttemptData,
    conn?: mysql.Connection
  ): Promise<boolean> {
    const db = this.getDb(conn);
    const sql = `
      UPDATE \`payment\`
      SET
        \`payment_status\` = ?,
        \`transaction_id\` = ?,
        \`payment_date\` = ?
      WHERE \`payment_id\` = ?
    `;

    const [result] = await db.query<mysql.ResultSetHeader>(sql, [
      data.paymentStatus,
      data.transactionId || null,
      data.paymentDate ? new Date(data.paymentDate) : null,
      paymentId,
    ]);

    return result.affectedRows > 0;
  }

  async findById(paymentId: number, conn?: mysql.Connection): Promise<PaymentDetailResponse | null> {
    const db = this.getDb(conn);
    const sql = `
      SELECT
        p.payment_id,
        p.registration_id,
        p.attempt_number,
        p.amount,
        p.payment_status,
        p.payment_method,
        p.transaction_id,
        p.payment_date,
        p.created_at,
        p.updated_at,
        r.status AS registration_status,
        t.team_id,
        t.team_name,
        t.leader_id,
        part.first_name AS leader_first_name,
        part.last_name AS leader_last_name,
        e.event_id,
        e.event_name
      FROM \`payment\` p
      INNER JOIN \`registration\` r ON p.registration_id = r.registration_id
      INNER JOIN \`team\` t ON r.team_id = t.team_id
      INNER JOIN \`participant\` part ON t.leader_id = part.participant_id
      INNER JOIN \`event\` e ON r.event_id = e.event_id
      WHERE p.payment_id = ?
      LIMIT 1
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [paymentId]);
    if (rows.length === 0) {
      return null;
    }
    return this.mapDetailRow(rows[0]);
  }

  async findByRegistrationId(
    registrationId: number,
    conn?: mysql.Connection
  ): Promise<PaymentDetailResponse[]> {
    const db = this.getDb(conn);
    const sql = `
      SELECT
        p.payment_id,
        p.registration_id,
        p.attempt_number,
        p.amount,
        p.payment_status,
        p.payment_method,
        p.transaction_id,
        p.payment_date,
        p.created_at,
        p.updated_at,
        r.status AS registration_status,
        t.team_id,
        t.team_name,
        t.leader_id,
        part.first_name AS leader_first_name,
        part.last_name AS leader_last_name,
        e.event_id,
        e.event_name
      FROM \`payment\` p
      INNER JOIN \`registration\` r ON p.registration_id = r.registration_id
      INNER JOIN \`team\` t ON r.team_id = t.team_id
      INNER JOIN \`participant\` part ON t.leader_id = part.participant_id
      INNER JOIN \`event\` e ON r.event_id = e.event_id
      WHERE p.registration_id = ?
      ORDER BY p.attempt_number ASC
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [registrationId]);
    return rows.map((r) => this.mapDetailRow(r));
  }

  async findSuccessfulByRegistrationId(
    registrationId: number,
    conn?: mysql.Connection
  ): Promise<PaymentRecord | null> {
    const db = this.getDb(conn);
    const sql = `
      SELECT
        payment_id,
        registration_id,
        attempt_number,
        amount,
        payment_status,
        payment_method,
        transaction_id,
        payment_date,
        created_at,
        updated_at
      FROM \`payment\`
      WHERE \`registration_id\` = ? AND \`payment_status\` = 'SUCCESS'
      LIMIT 1
    `;

    const [rows] = await db.query<mysql.RowDataPacket[]>(sql, [registrationId]);
    if (rows.length === 0) {
      return null;
    }
    const r = rows[0];
    const currency = getEnv().DEFAULT_CURRENCY || 'INR';
    return {
      payment_id: r.payment_id,
      registration_id: r.registration_id,
      attempt_number: r.attempt_number,
      amount:
        typeof r.amount === 'number'
          ? r.amount.toFixed(2)
          : String(r.amount ?? '0.00'),
      currency,
      payment_status: r.payment_status as PaymentStatus,
      payment_method: r.payment_method,
      transaction_id: r.transaction_id,
      payment_date: r.payment_date ? new Date(r.payment_date).toISOString() : null,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }
}

export const paymentRepository = new PaymentRepository();
