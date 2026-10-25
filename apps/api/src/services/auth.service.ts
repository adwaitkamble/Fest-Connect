import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getDbPool } from '../db/connection.js';
import { getEnv } from '../config/env.js';
import { participantRepository, ParticipantRepository } from '../repositories/participant.repository.js';
import { coordinatorRepository, CoordinatorRepository } from '../repositories/coordinator.repository.js';
import { RegisterSchemaInput, LoginSchemaInput } from '../schemas/auth.schema.js';
import { AuthenticatedUser, AuthTokenPayload, ParticipantRow } from '../types/auth.types.js';
import { ConflictError, AuthenticationError } from '../errors/app-error.js';

const authTokenPayloadSchema = z
  .object({
    userId: z.number().int().positive('Invalid user identifier in token'),
    email: z.string().email('Invalid email address format in token'),
    role: z.enum(['PARTICIPANT', 'COORDINATOR', 'ADMIN'], {
      errorMap: () => ({ message: 'Invalid or unauthorized role claim in token' }),
    }),
    name: z.string().min(1, 'Name cannot be empty in token'),
  })
  .passthrough(); // Allows standard JWT claims like iat, exp

export class AuthService {
  constructor(
    private readonly participantRepo: ParticipantRepository = participantRepository,
    private readonly coordinatorRepo: CoordinatorRepository = coordinatorRepository
  ) {}

  /**
   * Hashes a plaintext password using bcrypt with standard 10 salt rounds.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Verifies a plaintext password against a stored bcrypt hash.
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Issues a signed JWT with explicit HS256 algorithm and expiration.
   */
  signToken(payload: AuthTokenPayload): string {
    const env = getEnv();
    return jwt.sign(payload, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Verifies and decodes a JWT token.
   * Explicitly restricts allowed algorithms to HS256 to prevent algorithm confusion attacks.
   * Validates claim integrity and role legitimacy before trusting the payload.
   */
  verifyToken(token: string): AuthTokenPayload {
    const env = getEnv();
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      });

      if (!decoded || typeof decoded !== 'object') {
        throw new AuthenticationError('Invalid authentication token structure.');
      }

      // Validate claim structure and permitted roles
      const parseResult = authTokenPayloadSchema.safeParse(decoded);
      if (!parseResult.success) {
        throw new AuthenticationError('Invalid or untrusted authentication token claims.');
      }

      return {
        userId: parseResult.data.userId,
        email: parseResult.data.email,
        role: parseResult.data.role,
        name: parseResult.data.name,
      };
    } catch (err: unknown) {
      if (err instanceof AuthenticationError) {
        throw err;
      }
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Session has expired. Please log in again.');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid authentication token.');
      }
      throw new AuthenticationError('Authentication failed.');
    }
  }

  /**
   * Public participant registration.
   * Client-supplied role is rejected; role is strictly enforced as 'PARTICIPANT'.
   */
  async registerParticipant(input: RegisterSchemaInput): Promise<{ user: AuthenticatedUser; token: string }> {
    // 1. Check if email already registered
    const existing = await this.participantRepo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('A participant with this email address already exists.');
    }

    // 2. Hash password
    const password_hash = await this.hashPassword(input.password);

    // 3. Insert participant and skills inside a database transaction
    const pool = getDbPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const insertId = await this.participantRepo.create(
        {
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          phone: input.phone,
          college_name: input.college_name,
          date_of_birth: input.date_of_birth,
          password_hash,
          role: 'PARTICIPANT',
        },
        conn
      );

      if (input.skills && input.skills.length > 0) {
        await this.participantRepo.addSkills(insertId, input.skills, conn);
      }

      await conn.commit();

      // 4. Retrieve fresh participant record and skills
      const created = (await this.participantRepo.findById(insertId))!;
      const skills = await this.participantRepo.getSkills(insertId);

      const user: AuthenticatedUser = this.sanitizeUser(created, skills);
      const token = this.signToken({
        userId: user.participant_id,
        email: user.email,
        role: user.role,
        name: `${user.first_name} ${user.last_name}`.trim(),
      });

      return { user, token };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Participant or Coordinator login via email and password.
   */
  async login(input: LoginSchemaInput): Promise<{ user: AuthenticatedUser; token: string }> {
    // 1. Find user by email
    const participant = await this.participantRepo.findByEmail(input.email);
    if (!participant) {
      // Use uniform message to prevent user enumeration
      throw new AuthenticationError('Invalid email or password.');
    }

    // 2. Verify password hash
    const isValid = await this.verifyPassword(input.password, participant.password_hash);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password.');
    }

    // 3. Retrieve skills
    const skills = await this.participantRepo.getSkills(participant.participant_id);

    // 4. Retrieve coordinator profile if coordinator role
    let coordinator_id: number | null = null;
    if (participant.role === 'COORDINATOR') {
      const coord = await this.coordinatorRepo.findByParticipantId(participant.participant_id);
      coordinator_id = coord ? coord.coordinator_id : null;
    }

    // 5. Build user profile and sign token
    const user: AuthenticatedUser = this.sanitizeUser(participant, skills, coordinator_id);
    const token = this.signToken({
      userId: user.participant_id,
      email: user.email,
      role: user.role,
      name: `${user.first_name} ${user.last_name}`.trim(),
    });

    return { user, token };
  }

  /**
   * Retrieves profile for currently authenticated user ID.
   */
  async getCurrentUser(userId: number): Promise<AuthenticatedUser> {
    const participant = await this.participantRepo.findById(userId);
    if (!participant) {
      throw new AuthenticationError('User account not found or has been disabled.');
    }

    const skills = await this.participantRepo.getSkills(participant.participant_id);

    let coordinator_id: number | null = null;
    if (participant.role === 'COORDINATOR') {
      const coord = await this.coordinatorRepo.findByParticipantId(participant.participant_id);
      coordinator_id = coord ? coord.coordinator_id : null;
    }

    return this.sanitizeUser(participant, skills, coordinator_id);
  }

  /**
   * Helper to strip password_hash and produce safe AuthenticatedUser response
   */
  private sanitizeUser(
    row: ParticipantRow,
    skills: string[],
    coordinator_id?: number | null
  ): AuthenticatedUser {
    return {
      participant_id: row.participant_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      college_name: row.college_name,
      date_of_birth: row.date_of_birth,
      role: row.role,
      skills,
      coordinator_id: coordinator_id ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const authService = new AuthService();
