export type UserRole = 'PARTICIPANT' | 'COORDINATOR' | 'ADMIN';

export interface ParticipantRow {
  participant_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  college_name: string | null;
  date_of_birth: string | null;
  password_hash: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface CoordinatorRow {
  coordinator_id: number;
  participant_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedUser {
  participant_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  college_name: string | null;
  date_of_birth: string | null;
  role: UserRole;
  skills: string[];
  coordinator_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: UserRole;
  name: string;
}

export interface CreateParticipantDto {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  college_name?: string | null;
  date_of_birth?: string | null;
  password_hash: string;
  role: 'PARTICIPANT'; // Enforced at type level: cannot self-register as COORDINATOR or ADMIN
  skills?: string[];
}
