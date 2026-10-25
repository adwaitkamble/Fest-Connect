export type TeamStatus = 'FORMING' | 'READY' | 'REGISTERED' | 'DISBANDED';
export type RegistrationStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';

export interface TeamMember {
  team_member_id: number;
  team_id: number;
  participant_id: number;
  role: 'LEADER' | 'MEMBER';
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  college_name?: string;
  joined_at?: string;
}

export interface TeamRegistrationSummary {
  registration_id: number;
  event_id: number;
  event_name: string;
  event_type: string;
  registration_fee: string;
  status: RegistrationStatus;
  registration_date: string;
}

export interface TeamSummary {
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

export interface TeamDetail extends TeamSummary {
  members: TeamMember[];
  registrations: TeamRegistrationSummary[];
}

export interface RegistrationDetail {
  registration_id: number;
  team_id: number;
  team_name: string;
  leader_id: number;
  leader_name: string;
  event_id: number;
  event_name: string;
  event_type: string;
  registration_fee: string;
  registration_date: string;
  status: RegistrationStatus;
  created_at: string;
  updated_at: string;
}

export interface RegistrationListResponse {
  registrations: RegistrationDetail[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
