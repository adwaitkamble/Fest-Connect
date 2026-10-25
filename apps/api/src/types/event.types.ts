export type EventStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface EventRow {
  event_id: number;
  coordinator_id: number | null;
  event_name: string;
  event_type: string;
  description: string | null;
  min_team_size: number;
  max_team_size: number;
  registration_fee: string | number;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface EventWithCoordinatorRow extends EventRow {
  coordinator_name: string | null;
  coordinator_email: string | null;
  coordinator_phone: string | null;
}

export interface ScheduleRow {
  schedule_id: number;
  event_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleResponse {
  schedule_id: number;
  event_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  created_at: string;
  updated_at: string;
}

export interface EventResponse {
  event_id: number;
  coordinator_id: number | null;
  coordinator_name: string | null;
  coordinator_email: string | null;
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

export interface EventWithSchedulesResponse extends EventResponse {
  schedules: ScheduleResponse[];
}

export interface EventListQuery {
  page?: number;
  limit?: number;
  event_type?: string;
  status?: EventStatus;
  search?: string;
}

export interface CreateEventDto {
  event_name: string;
  event_type: string;
  description?: string | null;
  min_team_size?: number;
  max_team_size?: number;
  registration_fee?: number | string;
  status?: EventStatus;
  coordinator_id?: number | null;
}

export interface UpdateEventDto {
  event_name?: string;
  event_type?: string;
  description?: string | null;
  min_team_size?: number;
  max_team_size?: number;
  registration_fee?: number | string;
  status?: EventStatus;
  coordinator_id?: number | null;
}

export interface CreateScheduleDto {
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
}

export interface UpdateScheduleDto {
  event_date?: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
}
