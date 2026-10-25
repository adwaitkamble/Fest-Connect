import mysql from 'mysql2/promise';
import { getDbPool } from '../db/connection.js';
import { EmailService } from './email.service.js';
import { CoordinatorRepository, coordinatorRepository } from '../repositories/coordinator.repository.js';
import { EmailNotificationStatus, SendEmailNotificationRequest } from '../types/notification.types.js';
import { AuthTokenPayload } from '../types/auth.types.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../errors/index.js';

interface RegistrationNotificationContext {
  registration_id: number;
  team_id: number;
  event_id: number;
  status: string;
  registration_date: string;
  team_name: string;
  leader_id: number;
  leader_first_name: string;
  leader_last_name: string;
  leader_email: string;
  coordinator_id: number | null;
  coordinator_participant_id: number | null;
  event_name: string;
  event_type: string;
  registration_fee: string;
  payment_id: number | null;
  payment_status: string | null;
  payment_amount: string | null;
  pass_id: number | null;
  pass_number: string | null;
  issue_date: string | null;
}

export class NotificationService {
  constructor(
    private readonly emailService: EmailService = new EmailService(),
    private readonly coordinatorRepo: CoordinatorRepository = coordinatorRepository,
    private readonly duplicateCooldownMs: number = 60000,
    private readonly maxAttempts: number = 10
  ) {}

  /**
   * Directly record an initial send event (e.g. from PassService on pass creation) into MySQL
   */
  async recordInitialSend(
    registrationId: number,
    recipientEmail: string,
    recipientName: string,
    result: { success: boolean; provider: string; messageId?: string; error?: string }
  ): Promise<void> {
    const pool = getDbPool();
    let conn: mysql.PoolConnection | null = null;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const status = result.success ? 'DELIVERED' : 'FAILED';
      const now = new Date();

      await conn.query(
        `INSERT INTO email_notification
           (registration_id, recipient_email, recipient_name, status, attempts, provider, last_sent_at, last_attempted_at, last_error)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           attempts = attempts + 1,
           provider = VALUES(provider),
           last_sent_at = IF(VALUES(status) = 'DELIVERED', VALUES(last_sent_at), last_sent_at),
           last_attempted_at = VALUES(last_attempted_at),
           last_error = VALUES(last_error)`,
        [
          registrationId,
          recipientEmail,
          recipientName,
          status,
          result.provider,
          result.success ? now : null,
          now,
          result.error || null,
        ]
      );

      const [currentRows] = await conn.query<mysql.RowDataPacket[]>(
        'SELECT attempts FROM email_notification WHERE registration_id = ? FOR UPDATE',
        [registrationId]
      );
      const attemptNum = currentRows.length > 0 ? currentRows[0].attempts : 1;

      await conn.query(
        `INSERT INTO email_notification_attempt
           (registration_id, attempt_number, status, provider, recipient_email, error_message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [registrationId, attemptNum, status, result.provider, recipientEmail, result.error || null]
      );

      await conn.commit();
    } catch (err) {
      if (conn) {
        await conn.rollback();
      }
      console.error('[NotificationService] Failed to record email notification in MySQL:', (err as Error).message);
    } finally {
      if (conn) {
        conn.release();
      }
    }
  }

  /**
   * Retrieve notification status for a registration with resource-level authorization checks from MySQL
   */
  async getNotificationStatus(
    registrationId: number,
    user: AuthTokenPayload
  ): Promise<EmailNotificationStatus> {
    const context = await this.getRegistrationContext(registrationId);
    if (!context) {
      throw new NotFoundError(`Registration #${registrationId} not found.`);
    }

    await this.assertAuthorization(context, user);

    const pool = getDbPool();
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT * FROM email_notification WHERE registration_id = ? LIMIT 1',
      [registrationId]
    );

    if (rows.length > 0) {
      const row = rows[0];
      return this.serializeRow(row, context);
    }

    // Default status if never attempted
    return {
      registration_id: registrationId,
      status: 'NOT_SENT',
      recipient: context.leader_email,
      recipient_name: `${context.leader_first_name} ${context.leader_last_name}`,
      attempts: 0,
      last_sent_at: null,
      last_attempted_at: null,
      provider: 'console',
      preview_available: false,
      message: 'No email notification has been dispatched yet for this registration.',
    };
  }

  /**
   * Request or retry email notification with eligibility, authorization, and transactional duplicate protection
   */
  async sendOrRetryNotification(
    registrationId: number,
    user: AuthTokenPayload,
    options: SendEmailNotificationRequest = {}
  ): Promise<EmailNotificationStatus> {
    const context = await this.getRegistrationContext(registrationId);
    if (!context) {
      throw new NotFoundError(`Registration #${registrationId} not found.`);
    }

    await this.assertAuthorization(context, user);

    // 1. Eligibility validation
    if (context.status === 'PENDING_PAYMENT') {
      throw new BadRequestError(
        'Registration is pending payment. Confirmation emails and passes can only be requested after payment is completed.'
      );
    }

    if (context.status === 'CANCELLED') {
      throw new BadRequestError(
        'Registration is cancelled. Notifications cannot be sent for cancelled registrations.'
      );
    }

    if (context.status !== 'CONFIRMED') {
      throw new BadRequestError(
        `Registration status must be CONFIRMED (currently ${context.status}).`
      );
    }

    if (!context.payment_id || context.payment_status !== 'SUCCESS') {
      throw new BadRequestError(
        'A verified SUCCESS payment record is required before digital pass notifications can be sent.'
      );
    }

    if (!context.pass_number) {
      throw new NotFoundError(
        'Digital pass has not yet been issued for this registration. Please retrieve or generate the pass first.'
      );
    }

    // 2. Concurrency & duplicate-send protection inside MySQL transaction
    const pool = getDbPool();
    const conn = await pool.getConnection();

    let attempts = 0;
    let prevLastSentAt: Date | null = null;

    try {
      await conn.beginTransaction();

      const [existingRows] = await conn.query<mysql.RowDataPacket[]>(
        'SELECT * FROM email_notification WHERE registration_id = ? FOR UPDATE',
        [registrationId]
      );

      if (existingRows.length > 0) {
        const row = existingRows[0];
        attempts = row.attempts;
        prevLastSentAt = row.last_sent_at;

        // Abuse protection: check max attempts
        if (attempts >= this.maxAttempts && !options.force) {
          throw new BadRequestError(
            `Maximum email notification attempt limit (${this.maxAttempts}) reached for this registration.`
          );
        }

        // Duplicate cooldown check: reject if attempted recently unless forced
        if (row.last_attempted_at && !options.force) {
          const lastAttemptTime = new Date(row.last_attempted_at).getTime();
          const elapsedMs = Date.now() - lastAttemptTime;
          if (elapsedMs < this.duplicateCooldownMs) {
            const remainingSec = Math.ceil((this.duplicateCooldownMs - elapsedMs) / 1000);
            throw new ConflictError(
              `Duplicate notification suppressed: An email was already sent recently. Please wait ${remainingSec} seconds before retrying.`
            );
          }
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }

    // 3. Dispatch email outside the DB lock to prevent holding table locks during network I/O
    const recipientName = `${context.leader_first_name} ${context.leader_last_name}`;
    let sendResult: { success: boolean; provider: string; messageId?: string; error?: string };
    try {
      sendResult = await this.emailService.sendPassDeliveryEmail({
        recipientEmail: context.leader_email,
        recipientName,
        teamName: context.team_name,
        eventName: context.event_name,
        passNumber: context.pass_number,
        issueDate: context.issue_date || new Date().toISOString(),
        amountPaid: context.payment_amount || context.registration_fee,
      });
    } catch (sendErr) {
      sendResult = {
        success: false,
        provider: 'failed',
        error: (sendErr as Error).message || 'Email delivery failed unexpectedly',
      };
    }

    // 4. Update status tracking and audit history in MySQL
    try {
      await conn.beginTransaction();

      const status = sendResult.success ? 'DELIVERED' : 'FAILED';
      const now = new Date();

      await conn.query(
        `INSERT INTO email_notification
           (registration_id, recipient_email, recipient_name, status, attempts, provider, last_sent_at, last_attempted_at, last_error)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           attempts = attempts + 1,
           provider = VALUES(provider),
           last_sent_at = IF(VALUES(status) = 'DELIVERED', VALUES(last_sent_at), last_sent_at),
           last_attempted_at = VALUES(last_attempted_at),
           last_error = VALUES(last_error)`,
        [
          registrationId,
          context.leader_email,
          recipientName,
          status,
          sendResult.provider,
          sendResult.success ? now : null,
          now,
          sendResult.error || null,
        ]
      );

      const [currentRows] = await conn.query<mysql.RowDataPacket[]>(
        'SELECT attempts FROM email_notification WHERE registration_id = ? FOR UPDATE',
        [registrationId]
      );
      const recordedAttemptNumber = currentRows.length > 0 ? currentRows[0].attempts : attempts + 1;

      await conn.query(
        `INSERT INTO email_notification_attempt
           (registration_id, attempt_number, status, provider, recipient_email, error_message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [registrationId, recordedAttemptNumber, status, sendResult.provider, context.leader_email, sendResult.error || null]
      );

      await conn.commit();
    } catch (updateErr) {
      await conn.rollback();
      console.error('[NotificationService] Error saving email status to MySQL:', updateErr);
    } finally {
      conn.release();
    }

    const nowIso = new Date().toISOString();
    return {
      registration_id: registrationId,
      status: sendResult.success ? 'DELIVERED' : 'FAILED',
      recipient: context.leader_email,
      recipient_name: recipientName,
      attempts: attempts + 1,
      last_sent_at: sendResult.success ? nowIso : prevLastSentAt ? new Date(prevLastSentAt).toISOString() : null,
      last_attempted_at: nowIso,
      provider: sendResult.provider,
      preview_available: sendResult.provider === 'console',
      message_id: sendResult.messageId,
      error: sendResult.error,
      message: sendResult.success
        ? sendResult.provider === 'console'
          ? 'Email preview generated in server logs.'
          : 'Email sent successfully via SMTP.'
        : `Email delivery failed: ${sendResult.error || 'Unknown error'}`,
    };
  }

  private serializeRow(row: mysql.RowDataPacket, context: RegistrationNotificationContext): EmailNotificationStatus {
    return {
      registration_id: row.registration_id,
      status: row.status as 'DELIVERED' | 'FAILED' | 'NOT_SENT',
      recipient: row.recipient_email || context.leader_email,
      recipient_name: row.recipient_name || `${context.leader_first_name} ${context.leader_last_name}`,
      attempts: row.attempts,
      last_sent_at: row.last_sent_at ? new Date(row.last_sent_at).toISOString() : null,
      last_attempted_at: row.last_attempted_at ? new Date(row.last_attempted_at).toISOString() : null,
      provider: row.provider,
      preview_available: row.provider === 'console',
      error: row.last_error || undefined,
      message:
        row.status === 'DELIVERED'
          ? row.provider === 'console'
            ? 'Email preview generated in server logs.'
            : 'Email sent successfully via SMTP.'
          : row.status === 'FAILED'
          ? `Email delivery failed: ${row.last_error || 'Unknown error'}`
          : 'No email notification has been dispatched yet for this registration.',
    };
  }

  private async assertAuthorization(
    context: RegistrationNotificationContext,
    user: AuthTokenPayload
  ): Promise<void> {
    if (user.role === 'ADMIN') {
      return;
    }

    if (user.role === 'COORDINATOR') {
      const coordinator = await this.coordinatorRepo.findByParticipantId(user.userId);
      if (!coordinator || context.coordinator_id !== coordinator.coordinator_id) {
        throw new ForbiddenError(
          'Access denied: You are not authorized to view or manage notifications for this event registration.'
        );
      }
      return;
    }

    // Check if user is a member of the registered team or leader
    const pool = getDbPool();
    const [members] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT participant_id FROM `team_member` WHERE `team_id` = ? AND `participant_id` = ?',
      [context.team_id, user.userId]
    );

    if (members.length === 0 && context.leader_id !== user.userId) {
      throw new ForbiddenError(
        'Access denied: You do not have permission to view or manage notifications for this registration.'
      );
    }
  }

  private async getRegistrationContext(
    registrationId: number
  ): Promise<RegistrationNotificationContext | null> {
    const pool = getDbPool();
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT r.registration_id, r.team_id, r.event_id, r.status, r.registration_date,
              t.team_name, t.leader_id,
              lp.first_name AS leader_first_name, lp.last_name AS leader_last_name, lp.email AS leader_email,
              e.event_name, e.event_type, e.registration_fee, e.coordinator_id,
              ec.participant_id AS coordinator_participant_id,
              p.payment_id, p.payment_status, p.amount AS payment_amount,
              pr.pass_id, pr.pass_number, pr.issue_date
       FROM \`registration\` r
       JOIN \`team\` t ON r.team_id = t.team_id
       JOIN \`participant\` lp ON t.leader_id = lp.participant_id
       JOIN \`event\` e ON r.event_id = e.event_id
       LEFT JOIN \`event_coordinator\` ec ON e.coordinator_id = ec.coordinator_id
       LEFT JOIN \`payment\` p ON r.registration_id = p.registration_id AND p.payment_status = 'SUCCESS'
       LEFT JOIN \`pass_receipt\` pr ON r.registration_id = pr.registration_id
       WHERE r.registration_id = ?`,
      [registrationId]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as RegistrationNotificationContext;
  }
}

export const notificationService = new NotificationService();
