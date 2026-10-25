import { apiClient } from './client.js';
import {
  TeamSummary,
  TeamDetail,
  RegistrationDetail,
  RegistrationListResponse,
} from '../types/team.types.js';

export async function fetchTeams(): Promise<TeamSummary[]> {
  return apiClient<TeamSummary[]>('/api/v1/teams');
}

export async function fetchTeamById(teamId: number): Promise<TeamDetail> {
  return apiClient<TeamDetail>(`/api/v1/teams/${teamId}`);
}

export async function createTeam(teamName: string): Promise<TeamDetail> {
  return apiClient<TeamDetail>('/api/v1/teams', {
    method: 'POST',
    body: JSON.stringify({ team_name: teamName }),
  });
}

export async function addTeamMember(
  teamId: number,
  input: { participant_id?: number; email?: string }
): Promise<TeamDetail> {
  return apiClient<TeamDetail>(`/api/v1/teams/${teamId}/members`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function removeTeamMember(
  teamId: number,
  participantId: number
): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(
    `/api/v1/teams/${teamId}/members/${participantId}`,
    {
      method: 'DELETE',
    }
  );
}

export async function registerTeamForEvent(
  teamId: number,
  eventId: number
): Promise<RegistrationDetail> {
  return apiClient<RegistrationDetail>('/api/v1/registrations', {
    method: 'POST',
    body: JSON.stringify({ team_id: teamId, event_id: eventId }),
  });
}

export async function fetchRegistrations(params?: {
  page?: number;
  limit?: number;
  team_id?: number;
  event_id?: number;
  status?: string;
}): Promise<RegistrationListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.team_id) query.set('team_id', String(params.team_id));
  if (params?.event_id) query.set('event_id', String(params.event_id));
  if (params?.status) query.set('status', params.status);

  const qs = query.toString();
  const endpoint = qs ? `/api/v1/registrations?${qs}` : '/api/v1/registrations';
  return apiClient<RegistrationListResponse>(endpoint);
}

export async function fetchRegistrationById(registrationId: number): Promise<RegistrationDetail> {
  return apiClient<RegistrationDetail>(`/api/v1/registrations/${registrationId}`);
}

export async function cancelRegistration(registrationId: number): Promise<RegistrationDetail> {
  return apiClient<RegistrationDetail>(`/api/v1/registrations/${registrationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
}
