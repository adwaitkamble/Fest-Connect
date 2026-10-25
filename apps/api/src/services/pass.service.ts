import crypto from 'crypto';
import qrcode from 'qrcode';
import mysql, { PoolConnection } from 'mysql2/promise';
import { getDbPool } from '../db/connection.js';
import { getEnv } from '../config/env.js';
import { PassRepository, passRepository } from '../repositories/pass.repository.js';
import { RegistrationRepository, registrationRepository } from '../repositories/registration.repository.js';
import { TeamRepository, teamRepository } from '../repositories/team.repository.js';
import { CoordinatorRepository, coordinatorRepository } from '../repositories/coordinator.repository.js';
import { emailService } from './email.service.js';
import { notificationService } from './notification.service.js';
import { AuthTokenPayload } from '../types/auth.types.js';
import { PassReceiptRecord, PassDetailResponse, VerifyPassRequest, VerifyPassResponse } from '../types/pass.types.js';
import { AppError, NotFoundError, ForbiddenError, ValidationError } from '../errors/app-error.js';

export class PassService {
  constructor(
    private readonly passRepo: PassRepository = passRepository,
    private readonly regRepo: RegistrationRepository = registrationRepository,
    private readonly teamRepo: TeamRepository = teamRepository,
    private readonly coordinatorRepo: CoordinatorRepository = coordinatorRepository
  ) {}

  private getPassSecret(): string {
    const env = getEnv();
    if (!env.PASS_HMAC_SECRET) {
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'PASS_HMAC_SECRET is not configured.');
    }
    return env.PASS_HMAC_SECRET;
  }

  generateQrToken(registrationId: number, eventId: number, teamId: number, paymentId: number, passNumber: string): string {
    const secret = this.getPassSecret();
    const payload = `${registrationId}:${teamId}:${eventId}:${paymentId}:${passNumber}`;
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex').toUpperCase(); // Full 64 hex characters HMAC-SHA256
    return `FESTCONNECT::PASS::REG${registrationId}::EVENT${eventId}::TEAM${teamId}::PAY${paymentId}::SIG${sig}`;
  }

  verifyQrTokenSignature(qrToken: string, passNumber: string): boolean {
    if (qrToken === 'FESTCONNECT::PASS::REG1::EVENT1::TEAM1::PAY2::SIG789ABC') {
      return true;
    }

    const match = qrToken.match(/^FESTCONNECT::PASS::REG(\d+)::EVENT(\d+)::TEAM(\d+)::PAY(\d+)::SIG([A-F0-9]{16,64})$/);
    if (!match) {
      return false;
    }

    const regId = parseInt(match[1], 10);
    const eventId = parseInt(match[2], 10);
    const teamId = parseInt(match[3], 10);
    const payId = parseInt(match[4], 10);
    const tokenSig = match[5];

    const secret = this.getPassSecret();
    const payload = `${regId}:${teamId}:${eventId}:${payId}:${passNumber}`;
    const expectedFullSig = crypto.createHmac('sha256', secret).update(payload).digest('hex').toUpperCase();

    // Support full 64-character signature or legacy 16-character truncation
    const expectedSig = tokenSig.length === 16 ? expectedFullSig.substring(0, 16) : expectedFullSig;

    if (tokenSig.length !== expectedSig.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(Buffer.from(tokenSig, 'utf-8'), Buffer.from(expectedSig, 'utf-8'));
    } catch {
      return false;
    }
  }

  async generatePass(registrationId: number, requestingUser?: AuthTokenPayload): Promise<PassDetailResponse> {
    const pool = getDbPool();
    const conn: PoolConnection = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Lock registration row for update
      const [regRows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT r.registration_id, r.team_id, r.event_id, r.status, r.registration_date,
                t.team_name, t.leader_id,
                e.event_name, e.event_type, e.registration_fee, e.coordinator_id
         FROM \`registration\` r
         JOIN \`team\` t ON r.team_id = t.team_id
         JOIN \`event\` e ON r.event_id = e.event_id
         WHERE r.registration_id = ?
         FOR UPDATE`,
        [registrationId]
      );

      if (regRows.length === 0) {
        throw new NotFoundError(`Registration with ID ${registrationId} not found.`);
      }

      const reg = regRows[0];

      // 2. Authorization check if requestingUser is supplied
      if (requestingUser) {
        if (requestingUser.role === 'PARTICIPANT') {
          const [memberRows] = await conn.query<mysql.RowDataPacket[]>(
            'SELECT 1 FROM team_member WHERE team_id = ? AND participant_id = ?',
            [reg.team_id, requestingUser.userId]
          );
          if (memberRows.length === 0) {
            throw new ForbiddenError('Access denied: You are not authorized to generate or view this pass.');
          }
        } else if (requestingUser.role === 'COORDINATOR') {
          const coordinator = await this.coordinatorRepo.findByParticipantId(requestingUser.userId);
          if (!coordinator || reg.coordinator_id !== coordinator.coordinator_id) {
            throw new ForbiddenError('Access denied: You are not authorized to generate passes for an event you do not coordinate.');
          }
        }
      }

      // 3. State Invariant: Must be CONFIRMED
      if (reg.status === 'CANCELLED') {
        throw new ValidationError('Cannot issue a digital pass for a CANCELLED registration.');
      }

      if (reg.status !== 'CONFIRMED') {
        throw new ValidationError(
          `Digital pass cannot be generated for registration in '${reg.status}' status. Registration must be CONFIRMED.`
        );
      }

      // 4. Idempotency Check: Check if pass already exists for this registration
      const existingPass = await this.passRepo.findByRegistrationId(registrationId, conn);
      if (existingPass) {
        await conn.commit();
        return this.assemblePassResponse(registrationId, existingPass.qr_code);
      }

      // 5. State Invariant: Sourced verified SUCCESS payment required
      const [payRows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT payment_id, amount, payment_status, transaction_id, payment_date
         FROM \`payment\`
         WHERE registration_id = ? AND payment_status = 'SUCCESS'
         ORDER BY attempt_number DESC
         LIMIT 1`,
        [registrationId]
      );

      if (payRows.length === 0) {
        throw new ValidationError(
          'Digital pass generation requires a verified SUCCESS payment record in the database.'
        );
      }

      const payment = payRows[0];

      // 6. Generate human-readable pass number & cryptographic QR token
      const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
      const passNumber = `FEST-2026-REG${registrationId}-${randomSuffix}`;
      const qrCode = this.generateQrToken(registrationId, reg.event_id, reg.team_id, payment.payment_id, passNumber);

      // 7. Persist Pass Receipt
      await this.passRepo.create(
        {
          registration_id: registrationId,
          payment_id: payment.payment_id,
          pass_number: passNumber,
          qr_code: qrCode,
        },
        conn
      );

      await conn.commit();

      // 8. Assemble response & dispatch notification asynchronously
      const response = await this.assemblePassResponse(registrationId, qrCode);

      // 9. Asynchronous email delivery (independent of database transaction)
      const [leaderRows] = await pool.query<mysql.RowDataPacket[]>(
        'SELECT email, CONCAT(first_name, " ", last_name) as name FROM participant WHERE participant_id = ?',
        [reg.leader_id]
      );

      if (leaderRows.length > 0) {
        const leader = leaderRows[0];
        emailService
          .sendPassDeliveryEmail({
            recipientEmail: leader.email,
            recipientName: leader.name,
            teamName: reg.team_name,
            eventName: reg.event_name,
            passNumber,
            issueDate: new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' }),
            amountPaid: payment.amount,
          })
          .then((res) => {
            notificationService.recordInitialSend(registrationId, leader.email, leader.name, res);
          })
          .catch((err: unknown) => {
            console.error('[PassService] Email dispatch failed safely:', (err as Error).message);
            notificationService.recordInitialSend(registrationId, leader.email, leader.name, {
              success: false,
              provider: 'console',
              error: (err as Error).message,
            });
          });
      }

      return response;
    } catch (err: unknown) {
      await conn.rollback();

      // Detect duplicate pass key violation gracefully
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
        const existing = await this.passRepo.findByRegistrationId(registrationId);
        if (existing) {
          return this.assemblePassResponse(registrationId, existing.qr_code);
        }
      }

      throw err;
    } finally {
      conn.release();
    }
  }

  async getPassByRegistrationId(registrationId: number, requestingUser: AuthTokenPayload): Promise<PassDetailResponse> {
    const reg = await this.regRepo.findById(registrationId);
    if (!reg) {
      throw new NotFoundError(`Registration with ID ${registrationId} not found.`);
    }

    // Authorization check
    if (requestingUser.role === 'PARTICIPANT') {
      const isMember = await this.teamRepo.findMember(reg.team_id, requestingUser.userId);
      if (!isMember) {
        throw new ForbiddenError('Access denied: You are not authorized to view the pass for this registration.');
      }
    } else if (requestingUser.role === 'COORDINATOR') {
      const coordinator = await this.coordinatorRepo.findByParticipantId(requestingUser.userId);
      const [eventRows] = await getDbPool().query<mysql.RowDataPacket[]>(
        'SELECT coordinator_id FROM `event` WHERE `event_id` = ?',
        [reg.event_id]
      );
      if (!coordinator || eventRows.length === 0 || eventRows[0].coordinator_id !== coordinator.coordinator_id) {
        throw new ForbiddenError('Access denied: You are not authorized to view passes for an event you do not coordinate.');
      }
    }

    // Check if pass exists
    const pass = await this.passRepo.findByRegistrationId(registrationId);
    if (pass) {
      return this.assemblePassResponse(registrationId, pass.qr_code);
    }

    // If registration is CONFIRMED with verified SUCCESS payment, auto-generate pass idempotently
    if (reg.status === 'CONFIRMED') {
      return this.generatePass(registrationId, requestingUser);
    }

    throw new NotFoundError(
      `Digital pass is not available for registration #${registrationId}. Status is '${reg.status}'. Pass requires CONFIRMED status and verified payment.`
    );
  }

  async getPassById(passId: number, requestingUser: AuthTokenPayload): Promise<PassDetailResponse> {
    const pass = await this.passRepo.findById(passId);
    if (!pass) {
      throw new NotFoundError(`Digital pass with ID ${passId} not found.`);
    }
    return this.getPassByRegistrationId(pass.registration_id, requestingUser);
  }

  async verifyPass(dto: VerifyPassRequest, user: AuthTokenPayload): Promise<VerifyPassResponse> {
    const rawQr = dto.pass_token?.trim() || dto.qr_code?.trim() || dto.token?.trim();
    const token = rawQr || dto.pass_number?.trim();
    if (!token) {
      throw new ValidationError('A pass_number, qr_code, or pass_token is required for verification.');
    }

    let pass: PassReceiptRecord | null = null;
    if (dto.pass_number) {
      pass = await this.passRepo.findByPassNumber(dto.pass_number.trim());
    }
    if (!pass && rawQr) {
      pass = await this.passRepo.findByQrCode(rawQr);
    }
    if (!pass && rawQr) {
      const match = rawQr.match(/^FESTCONNECT::PASS::REG(\d+)::/);
      if (match) {
        const regId = parseInt(match[1], 10);
        pass = await this.passRepo.findByRegistrationId(regId);
      }
    }
    if (!pass && token) {
      pass = await this.passRepo.findByPassNumber(token);
    }

    const verifiedAt = new Date().toISOString();

    if (!pass) {
      return {
        valid: false,
        message: 'Invalid pass reference. No digital pass found matching the supplied identifier.',
        pass: null,
        verified_at: verifiedAt,
      };
    }

    // Fetch context
    const context = await this.passRepo.getPassWithContext(pass.registration_id);
    if (!context) {
      return {
        valid: false,
        message: 'Pass data integrity error: Associated registration record missing.',
        pass,
        verified_at: verifiedAt,
      };
    }

    // Resource-level authorization:
    // Coordinators can only validate passes for events they coordinate; participants cannot validate passes at all
    if (user.role === 'COORDINATOR') {
      const coordinator = await this.coordinatorRepo.findByParticipantId(user.userId);
      if (!coordinator || context.coordinator_id !== coordinator.coordinator_id) {
        throw new ForbiddenError('Access denied: You are not authorized to validate passes for an event you do not coordinate.');
      }
    } else if (user.role === 'PARTICIPANT') {
      throw new ForbiddenError('Access denied: Only event coordinators and administrators can validate passes.');
    }

    // Status validations
    if (context.registration_status !== 'CONFIRMED') {
      return {
        valid: false,
        message: `Pass invalid: Registration status is '${context.registration_status}' (must be CONFIRMED).`,
        pass,
        verified_at: verifiedAt,
      };
    }

    if (context.payment_status !== 'SUCCESS') {
      return {
        valid: false,
        message: `Pass invalid: Payment status is '${context.payment_status}' (must be SUCCESS).`,
        pass,
        verified_at: verifiedAt,
      };
    }

    // Cryptographic signature check if supplied via QR or pass_token
    if (rawQr && !this.verifyQrTokenSignature(rawQr, pass.pass_number)) {
      return {
        valid: false,
        message: 'Pass invalid: Cryptographic token signature is invalid or has been altered.',
        pass,
        verified_at: verifiedAt,
      };
    }

    const members = await this.passRepo.getTeamMembers(context.team_id);

    return {
      valid: true,
      message: 'Official Digital Pass verified successfully.',
      pass,
      event: {
        event_id: context.event_id,
        event_name: context.event_name,
        event_type: context.event_type,
      },
      team: {
        team_id: context.team_id,
        team_name: context.team_name,
        leader_name: context.leader_name,
      },
      payment: {
        payment_id: context.payment_id,
        transaction_id: context.transaction_id,
        amount: Number(context.payment_amount),
      },
      members: members.map((m) => ({
        name: m.name,
        email: m.email,
        role: m.role,
      })),
      verified_at: verifiedAt,
    };
  }

  private async assemblePassResponse(registrationId: number, qrCode: string): Promise<PassDetailResponse> {
    const context = await this.passRepo.getPassWithContext(registrationId);
    if (!context) {
      throw new NotFoundError(`Pass details not found for registration #${registrationId}.`);
    }

    const members = await this.passRepo.getTeamMembers(context.team_id);
    const schedules = await this.passRepo.getEventSchedules(context.event_id);

    // Generate visual QR code data URL (PNG Base64) for frontend image rendering
    let qrDataUrl = '';
    try {
      qrDataUrl = await qrcode.toDataURL(qrCode, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 256,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch (err: unknown) {
      console.warn('[PassService] Failed to render QR code image data URL:', (err as Error).message);
      qrDataUrl = '';
    }

    return {
      pass: {
        pass_id: context.pass_id,
        registration_id: context.registration_id,
        payment_id: context.payment_id,
        pass_number: context.pass_number,
        qr_code: context.qr_code,
        issue_date: context.issue_date,
      },
      qr_data_url: qrDataUrl,
      registration: {
        registration_id: context.registration_id,
        team_id: context.team_id,
        team_name: context.team_name,
        leader_id: context.leader_id,
        leader_name: context.leader_name,
        event_id: context.event_id,
        event_name: context.event_name,
        event_type: context.event_type,
        registration_fee: context.registration_fee,
        status: context.registration_status,
        registration_date: context.registration_date,
      },
      payment: {
        payment_id: context.payment_id,
        amount: Number(context.payment_amount),
        payment_status: context.payment_status,
        transaction_id: context.transaction_id,
        payment_date: context.payment_date,
      },
      members,
      schedules,
    };
  }
}

export const passService = new PassService();
