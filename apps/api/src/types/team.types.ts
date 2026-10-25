export type TeamStatus = 'FORMING' | 'READY' | 'REGISTERED' | 'DISBANDED';
export type RegistrationStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';

export interface TeamRow {
  team_id: number;
  team_name: string;
  leader_id: number;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
}

export interface TeamWithLeaderRow extends TeamRow {
  leader_first_name: string;
  leader_last_name: string;
  leader_email: string;
  member_count: number;
}

export interface TeamMemberRow {
  team_member_id: number;
  team_id: number;
  participant_id: number;
  role: string;
  joined_at: string;
}

export interface TeamMemberDetail {
  team_member_id: number;
  participant_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  college_name: string | null;
  role: string;
  joined_at: string;
}

export interface TeamDetailResponse {
  team_id: number;
  team_name: string;
  leader_id: number;
  leader_name: string;
  leader_email: string;
  status: TeamStatus;
  member_count: number;
  members: TeamMemberDetail[];
  registrations?: RegistrationSummary[];
  created_at: string;
  updated_at: string;
}

export interface TeamSummaryResponse {
  team_id: number;
  team_name: string;
  leader_id: number;
  leader_name: string;
  leader_email: string;
  status: TeamStatus;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface RegistrationRow {
  registration_id: number;
  team_id: number;
  event_id: number;
  registration_date: string;
  status: RegistrationStatus;
  created_at: string;
  updated_at: string;
}

export interface RegistrationSummary {
  registration_id: number;
  event_id: number;
  event_name: string;
  event_type: string;
  registration_fee: string;
  status: RegistrationStatus;
  registration_date: string;
}

export interface RegistrationDetailResponse {
  registration_id: number;
  team_id: number;
  team_name: string;
  leader_id: number;
  leader_name: string;
  event_id: number;
  event_name: string;
  event_type: string;
  registration_fee: string;
  status: RegistrationStatus;
  registration_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamDto {
  team_name: string;
}

export interface AddMemberDto {
  participant_id?: number;
  email?: string;
}

export interface CreateRegistrationDto {
  team_id: number;
  event_id: number;
}

export interface UpdateRegistrationDto {
  status: 'CANCELLED';
}
