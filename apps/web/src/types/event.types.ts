export type EventStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface ScheduleItem {
  schedule_id: number;
  event_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  created_at: string;
  updated_at: string;
}

export interface EventItem {
  event_id: number;
  coordinator_id: number | null;
  coordinator_name: string | null;
  coordinator_email: string | null;
  coordinator_phone?: string | null;
  event_name: string;
  event_type: string;
  description: string | null;
  min_team_size: number;
  max_team_size: number;
  registration_fee: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface EventDetail extends EventItem {
  schedules: ScheduleItem[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EventListResponse {
  events: EventItem[];
  pagination: PaginationMeta;
}

export interface EventFilterParams {
  page?: number;
  limit?: number;
  event_type?: string;
  status?: string;
  search?: string;
}

export interface CreateEventInput {
  event_name: string;
  event_type: string;
  description?: string | null;
  min_team_size: number;
  max_team_size: number;
  registration_fee: number;
  status?: EventStatus;
  coordinator_id?: number | null;
}

export interface UpdateEventInput {
  event_name?: string;
  event_type?: string;
  description?: string | null;
  min_team_size?: number;
  max_team_size?: number;
  registration_fee?: number;
  status?: EventStatus;
  coordinator_id?: number | null;
}

export interface CreateScheduleInput {
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
}

export interface UpdateScheduleInput {
  event_date?: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
}

export interface AuthUser {
  participant_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  college_name: string | null;
  role: 'PARTICIPANT' | 'COORDINATOR' | 'ADMIN';
  coordinator_id?: number | null;
}
