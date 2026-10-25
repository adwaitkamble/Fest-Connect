import { getDbPool } from '../db/connection.js';
import { registrationRepository, RegistrationRepository, RegistrationFilters } from '../repositories/registration.repository.js';
import { teamRepository, TeamRepository } from '../repositories/team.repository.js';
import { eventRepository, EventRepository } from '../repositories/event.repository.js';
import { coordinatorRepository, CoordinatorRepository } from '../repositories/coordinator.repository.js';
import {
  CreateRegistrationDto,
  RegistrationDetailResponse,
} from '../types/team.types.js';
import { AuthTokenPayload } from '../types/auth.types.js';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../errors/app-error.js';

export class RegistrationService {
  constructor(
    private readonly registrationRepo: RegistrationRepository = registrationRepository,
    private readonly teamRepo: TeamRepository = teamRepository,
    private readonly eventRepo: EventRepository = eventRepository,
    private readonly coordinatorRepo: CoordinatorRepository = coordinatorRepository
  ) {}

  async registerTeam(
    dto: CreateRegistrationDto,
    user: AuthTokenPayload
  ): Promise<RegistrationDetailResponse> {
    // 1. Verify Event existence and availability
    const event = await this.eventRepo.findById(dto.event_id);
    if (!event) {
      throw new NotFoundError(`Event with ID ${dto.event_id} not found.`);
    }

    if (event.status === 'COMPLETED' || event.status === 'CANCELLED') {
      throw new ValidationError(
        `Registration is closed for event '${event.event_name}' (status: ${event.status}).`
      );
    }

    // 2. Verify Team existence and status
    const team = await this.teamRepo.findById(dto.team_id);
    if (!team) {
      throw new NotFoundError(`Team with ID ${dto.team_id} not found.`);
    }

    if (team.status === 'DISBANDED') {
      throw new ValidationError('Disbanded teams cannot register for events.');
    }

    // 3. Authorization: Only Team Leader or ADMIN can register the team
    if (user.role !== 'ADMIN' && team.leader_id !== user.userId) {
      throw new ForbiddenError(
        'Only the team leader or administrator can register the team for an event.'
      );
    }

    // 4. Duplicate Registration Guard
    const existing = await this.registrationRepo.findByTeamAndEvent(dto.team_id, dto.event_id);
    if (existing) {
      throw new ConflictError(
        `Team '${team.team_name}' is already registered for event '${event.event_name}'.`
      );
    }

    // 5. Team Size Constraints
    const memberCount = team.member_count;
    if (memberCount < event.min_team_size) {
      throw new ValidationError(
        `Team has ${memberCount} members, but event '${event.event_name}' requires at least ${event.min_team_size} members.`,
        [{ field: 'team_size', message: `Minimum required team size is ${event.min_team_size}` }]
      );
    }

    if (memberCount > event.max_team_size) {
      throw new ValidationError(
        `Team has ${memberCount} members, but event '${event.event_name}' allows at most ${event.max_team_size} members.`,
        [{ field: 'team_size', message: `Maximum allowed team size is ${event.max_team_size}` }]
      );
    }

    // 6. Schedule Conflict Verification
    const conflict = await this.registrationRepo.findScheduleConflict(dto.team_id, dto.event_id);
    if (conflict) {
      throw new ConflictError(
        `Schedule conflict detected: Member ${conflict.participant_name} is already registered for event '${conflict.conflicting_event_name}' on ${conflict.event_date} with overlapping timing.`
      );
    }

    // 7. Atomic Transactional Persistence
    const conn = await getDbPool().getConnection();
    await conn.beginTransaction();

    try {
      const registrationId = await this.registrationRepo.create(dto.team_id, dto.event_id, conn);

      // Transition team status to REGISTERED if it was FORMING or READY
      if (team.status === 'FORMING' || team.status === 'READY') {
        await this.teamRepo.updateStatus(dto.team_id, 'REGISTERED', conn);
      }

      await conn.commit();

      const created = await this.registrationRepo.findById(registrationId);
      if (!created) {
        throw new Error('Failed to retrieve newly created registration');
      }

      return created;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async getRegistrationById(
    registrationId: number,
    user: AuthTokenPayload
  ): Promise<RegistrationDetailResponse> {
    const reg = await this.registrationRepo.findById(registrationId);
    if (!reg) {
      throw new NotFoundError(`Registration with ID ${registrationId} not found.`);
    }

    // Authorization:
    // ADMIN can access any registration
    // COORDINATOR can access registrations for events they manage
    // PARTICIPANT can access registrations for teams they belong to
    if (user.role === 'ADMIN') {
      return reg;
    }

    if (user.role === 'COORDINATOR') {
      const coordinator = await this.coordinatorRepo.findByParticipantId(user.userId);
      const event = await this.eventRepo.findById(reg.event_id);
      if (!coordinator || !event || event.coordinator_id !== coordinator.coordinator_id) {
        throw new ForbiddenError('Access denied: you are not the coordinator for this event.');
      }
      return reg;
    }

    // Participant check
    const membership = await this.teamRepo.findMember(reg.team_id, user.userId);
    if (!membership) {
      throw new ForbiddenError('Access denied: you are not a member of this registered team.');
    }

    return reg;
  }

  async listRegistrations(
    query: { page?: number; limit?: number; team_id?: number; event_id?: number; status?: any },
    user: AuthTokenPayload
  ): Promise<{
    registrations: RegistrationDetailResponse[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const offset = (page - 1) * limit;

    const filters: RegistrationFilters = {
      teamId: query.team_id,
      eventId: query.event_id,
      status: query.status,
    };

    if (user.role === 'PARTICIPANT') {
      filters.participantId = user.userId;
    } else if (user.role === 'COORDINATOR') {
      const coordinator = await this.coordinatorRepo.findByParticipantId(user.userId);
      if (coordinator) {
        filters.coordinatorId = coordinator.coordinator_id;
      }
    }

    const [registrations, total] = await Promise.all([
      this.registrationRepo.findRegistrations(filters, limit, offset),
      this.registrationRepo.countRegistrations(filters),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      registrations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async cancelRegistration(
    registrationId: number,
    user: AuthTokenPayload
  ): Promise<RegistrationDetailResponse> {
    const reg = await this.registrationRepo.findById(registrationId);
    if (!reg) {
      throw new NotFoundError(`Registration with ID ${registrationId} not found.`);
    }

    // Only team leader or ADMIN can cancel registration
    if (user.role !== 'ADMIN' && reg.leader_id !== user.userId) {
      throw new ForbiddenError('Only the team leader or administrator can cancel an event registration.');
    }

    if (reg.status === 'CANCELLED') {
      return reg;
    }

    await this.registrationRepo.updateStatus(registrationId, 'CANCELLED');

    const updated = await this.registrationRepo.findById(registrationId);
    return updated!;
  }
}

export const registrationService = new RegistrationService();
