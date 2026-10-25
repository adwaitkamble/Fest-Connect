import { getDbPool } from '../db/connection.js';
import { teamRepository, TeamRepository } from '../repositories/team.repository.js';
import { participantRepository, ParticipantRepository } from '../repositories/participant.repository.js';
import { registrationRepository, RegistrationRepository } from '../repositories/registration.repository.js';
import {
  CreateTeamDto,
  AddMemberDto,
  TeamDetailResponse,
  TeamSummaryResponse,
} from '../types/team.types.js';
import { AuthTokenPayload } from '../types/auth.types.js';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../errors/app-error.js';

export class TeamService {
  constructor(
    private readonly teamRepo: TeamRepository = teamRepository,
    private readonly participantRepo: ParticipantRepository = participantRepository,
    private readonly registrationRepo: RegistrationRepository = registrationRepository
  ) {}

  async createTeam(dto: CreateTeamDto, user: AuthTokenPayload): Promise<TeamDetailResponse> {
    const conn = await getDbPool().getConnection();
    await conn.beginTransaction();

    try {
      // 1. Insert team record with authenticated user as canonical leader
      const teamId = await this.teamRepo.create(dto.team_name.trim(), user.userId, conn);

      // 2. Insert creator into team_member as LEADER in same transaction
      await this.teamRepo.addMember(teamId, user.userId, 'LEADER', conn);

      await conn.commit();

      const created = await this.getTeamById(teamId, user);
      return created;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async getTeamById(teamId: number, user: AuthTokenPayload): Promise<TeamDetailResponse> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) {
      throw new NotFoundError(`Team with ID ${teamId} not found.`);
    }

    // Access control:
    // ADMIN and COORDINATOR can inspect any team.
    // PARTICIPANT must be the team leader or an enrolled member of the team.
    if (user.role === 'PARTICIPANT') {
      const isLeader = Number(team.leader_id) === Number(user.userId);
      if (!isLeader) {
        const membership = await this.teamRepo.findMember(teamId, Number(user.userId));
        if (!membership) {
          throw new ForbiddenError('Access denied: you are not a member of this team.');
        }
      }
    }

    const [members, registrations] = await Promise.all([
      this.teamRepo.findMembers(teamId),
      this.registrationRepo.findByTeamId(teamId),
    ]);

    return {
      team_id: team.team_id,
      team_name: team.team_name,
      leader_id: team.leader_id,
      leader_name: `${team.leader_first_name} ${team.leader_last_name}`.trim(),
      leader_email: team.leader_email,
      status: team.status,
      member_count: members.length,
      members,
      registrations,
      created_at: team.created_at,
      updated_at: team.updated_at,
    };
  }

  async listTeams(user: AuthTokenPayload): Promise<TeamSummaryResponse[]> {
    if (user.role === 'ADMIN' || user.role === 'COORDINATOR') {
      const rows = await this.teamRepo.findAll(100, 0);
      return rows.map((r) => ({
        team_id: r.team_id,
        team_name: r.team_name,
        leader_id: r.leader_id,
        leader_name: `${r.leader_first_name} ${r.leader_last_name}`.trim(),
        leader_email: r.leader_email,
        status: r.status,
        member_count: r.member_count,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    }

    const rows = await this.teamRepo.findByParticipantId(Number(user.userId));
    return rows.map((r) => ({
      team_id: r.team_id,
      team_name: r.team_name,
      leader_id: r.leader_id,
      leader_name: `${r.leader_first_name} ${r.leader_last_name}`.trim(),
      leader_email: r.leader_email,
      status: r.status,
      member_count: r.member_count,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  async addMember(
    teamId: number,
    dto: AddMemberDto,
    user: AuthTokenPayload
  ): Promise<TeamDetailResponse> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) {
      throw new NotFoundError(`Team with ID ${teamId} not found.`);
    }

    // Only team leader or ADMIN can add team members
    const isLeader = Number(team.leader_id) === Number(user.userId);
    if (user.role !== 'ADMIN' && !isLeader) {
      throw new ForbiddenError('Only the team leader or administrator can add members to the team.');
    }

    if (team.status === 'DISBANDED') {
      throw new ValidationError('Cannot add members to a disbanded team.');
    }

    // Resolve target participant by ID or email
    let targetParticipant = null;
    if (dto.participant_id) {
      targetParticipant = await this.participantRepo.findById(Number(dto.participant_id));
    } else if (dto.email) {
      targetParticipant = await this.participantRepo.findByEmail(dto.email.trim());
    }

    if (!targetParticipant) {
      throw new NotFoundError(
        dto.email
          ? `Participant with email '${dto.email}' not found.`
          : `Participant with ID ${dto.participant_id} not found.`
      );
    }

    // Check duplicate membership
    const existing = await this.teamRepo.findMember(teamId, targetParticipant.participant_id);
    if (existing) {
      throw new ConflictError('Participant is already a member of this team.');
    }

    await this.teamRepo.addMember(teamId, targetParticipant.participant_id, 'MEMBER');

    return this.getTeamById(teamId, user);
  }

  async removeMember(
    teamId: number,
    participantId: number,
    user: AuthTokenPayload
  ): Promise<{ success: boolean; message: string }> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) {
      throw new NotFoundError(`Team with ID ${teamId} not found.`);
    }

    // Team leader cannot be removed without disbanding/transferring
    if (Number(participantId) === Number(team.leader_id)) {
      throw new ValidationError('The canonical team leader cannot be removed from the team.');
    }

    // Permissions: team leader, the member themselves, or admin
    const isLeader = Number(team.leader_id) === Number(user.userId);
    const isSelf = Number(participantId) === Number(user.userId);
    const isAdmin = user.role === 'ADMIN';

    if (!isLeader && !isSelf && !isAdmin) {
      throw new ForbiddenError('Access denied: you are not authorized to remove this member.');
    }

    const member = await this.teamRepo.findMember(teamId, participantId);
    if (!member) {
      throw new NotFoundError(`Participant with ID ${participantId} is not a member of this team.`);
    }

    await this.teamRepo.removeMember(teamId, participantId);

    return {
      success: true,
      message: 'Team member removed successfully.',
    };
  }
}

export const teamService = new TeamService();
