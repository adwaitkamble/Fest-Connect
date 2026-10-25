import mysql from 'mysql2/promise';
import { getDbPool } from '../db/connection.js';
import { getEnv } from '../config/env.js';
import { paymentRepository, PaymentRepository } from '../repositories/payment.repository.js';
import { registrationRepository, RegistrationRepository } from '../repositories/registration.repository.js';
import { teamRepository, TeamRepository } from '../repositories/team.repository.js';
import { PaymentFactory } from '../factories/payment.factory.js';
import { passService } from './pass.service.js';
import {
  InitiatePaymentDto,
  PaymentDetailResponse,
} from '../types/payment.types.js';
import { AuthTokenPayload } from '../types/auth.types.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  AppError,
} from '../errors/app-error.js';

export class PaymentService {
  constructor(
    private readonly paymentRepo: PaymentRepository = paymentRepository,
    private readonly registrationRepo: RegistrationRepository = registrationRepository,
    private readonly teamRepo: TeamRepository = teamRepository
  ) {}

  /**
   * Initiates and processes a payment attempt for an eligible registration.
   * State transitions, amount verification, and single-success guarantees are strictly server-controlled.
   */
  async initiatePayment(
    dto: InitiatePaymentDto,
    user: AuthTokenPayload
  ): Promise<PaymentDetailResponse> {
    const conn = await getDbPool().getConnection();
    await conn.beginTransaction();

    try {
      // 1. Fetch registration with team and event details using FOR UPDATE row locking
      // to serialize concurrent payment requests for the same registration.
      const lockSql = `
        SELECT
          r.registration_id,
          r.team_id,
          r.event_id,
          r.status AS registration_status,
          t.team_name,
          t.leader_id,
          e.event_name,
          e.registration_fee,
          e.status AS event_status,
          p.email AS leader_email
        FROM \`registration\` r
        INNER JOIN \`team\` t ON r.team_id = t.team_id
        INNER JOIN \`participant\` p ON t.leader_id = p.participant_id
        INNER JOIN \`event\` e ON r.event_id = e.event_id
        WHERE r.registration_id = ?
        FOR UPDATE
      `;

      const [rows] = await conn.query<mysql.RowDataPacket[]>(lockSql, [dto.registration_id]);

      if (rows.length === 0) {
        throw new NotFoundError(`Registration with ID ${dto.registration_id} not found.`);
      }

      const reg = rows[0];

      // 2. Authorization: only the team leader or an admin can initiate payment
      if (user.role !== 'ADMIN' && user.userId !== reg.leader_id) {
        throw new ForbiddenError(
          'Access denied: only the team leader or an administrator can initiate payment for this registration.'
        );
      }

      // 3. Eligibility verification
      if (reg.registration_status === 'CANCELLED') {
        throw new ValidationError('Cannot initiate payment for a cancelled registration.');
      }

      if (reg.registration_status === 'CONFIRMED') {
        throw new ConflictError('Registration has already been paid and confirmed.');
      }

      // Double-check single-success invariant
      const existingSuccess = await this.paymentRepo.findSuccessfulByRegistrationId(
        dto.registration_id,
        conn
      );
      if (existingSuccess) {
        throw new ConflictError('A verified successful payment already exists for this registration.');
      }

      // 4. Derive authoritative amount from database (client cannot specify or override amount)
      const amount = Number(reg.registration_fee);
      const currency = getEnv().DEFAULT_CURRENCY || 'INR';

      // 5. Calculate next attempt number
      const attemptNumber = await this.paymentRepo.getNextAttemptNumber(dto.registration_id, conn);

      // 6. Select gateway adapter via PaymentFactory
      const adapter = PaymentFactory.getAdapter(dto.payment_method);

      // 7. Insert initial payment attempt in PENDING state
      const paymentId = await this.paymentRepo.createAttempt(
        {
          registrationId: dto.registration_id,
          attemptNumber,
          amount,
          paymentStatus: 'PENDING',
          paymentMethod: adapter.providerName,
          transactionId: null,
          paymentDate: null,
        },
        conn
      );

      // 8. Execute payment via adapter (simulated in demo mode, no real money)
      const gatewayResponse = await adapter.processPayment({
        registrationId: dto.registration_id,
        attemptNumber,
        amount,
        currency,
        teamName: reg.team_name,
        eventName: reg.event_name,
        participantEmail: reg.leader_email,
        simulatedOutcome: dto.simulated_outcome,
      });

      // 9. Atomically update payment record with gateway result
      await this.paymentRepo.updateAttempt(
        paymentId,
        {
          paymentStatus: gatewayResponse.paymentStatus,
          transactionId: gatewayResponse.transactionId,
          paymentDate: gatewayResponse.timestamp,
        },
        conn
      );

      // 10. If payment succeeded, transition registration to CONFIRMED
      if (gatewayResponse.paymentStatus === 'SUCCESS') {
        await this.registrationRepo.updateStatus(dto.registration_id, 'CONFIRMED', conn);
      }

      // 11. Commit transaction
      await conn.commit();

      // Retrieve full details of the created payment
      const paymentDetail = await this.paymentRepo.findById(paymentId);
      if (!paymentDetail) {
        throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve payment record after commit.');
      }

      // Phase 07: If payment succeeded, automatically generate digital pass & send delivery email
      if (gatewayResponse.paymentStatus === 'SUCCESS') {
        passService.generatePass(dto.registration_id).catch((err: unknown) => {
          console.error('[PaymentService] Automatic pass generation error:', (err as Error).message);
        });
      }

      return paymentDetail;
    } catch (err: unknown) {
      await conn.rollback();

      // Detect MySQL duplicate entry violation on generated column uk_payment_success_registration
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ER_DUP_ENTRY') {
        throw new ConflictError(
          'A concurrent successful payment has already been recorded for this registration.'
        );
      }

      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Retrieves an individual payment record by ID with authorization checks.
   */
  async getPaymentById(paymentId: number, user: AuthTokenPayload): Promise<PaymentDetailResponse> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) {
      throw new NotFoundError(`Payment with ID ${paymentId} not found.`);
    }

    // Authorization: Admin and Coordinator can view any payment.
    // Participant must be a member of the registered team.
    if (user.role === 'PARTICIPANT') {
      const membership = await this.teamRepo.findMember(payment.team_id, user.userId);
      if (!membership) {
        throw new ForbiddenError('Access denied: you are not a member of the team associated with this payment.');
      }
    }

    return payment;
  }

  /**
   * Retrieves all payment attempts for a given registration.
   */
  async getPaymentsByRegistrationId(
    registrationId: number,
    user: AuthTokenPayload
  ): Promise<PaymentDetailResponse[]> {
    const registration = await this.registrationRepo.findById(registrationId);
    if (!registration) {
      throw new NotFoundError(`Registration with ID ${registrationId} not found.`);
    }

    // Authorization: Admin and Coordinator can view.
    // Participant must be a member of the registered team.
    if (user.role === 'PARTICIPANT') {
      const membership = await this.teamRepo.findMember(registration.team_id, user.userId);
      if (!membership) {
        throw new ForbiddenError(
          'Access denied: you are not a member of the team associated with this registration.'
        );
      }
    }

    return this.paymentRepo.findByRegistrationId(registrationId);
  }
}

export const paymentService = new PaymentService();
