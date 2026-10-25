import { apiClient } from './client.js';
import {
  EventListResponse,
  EventDetail,
  EventFilterParams,
  CreateEventInput,
  UpdateEventInput,
  ScheduleItem,
  CreateScheduleInput,
  UpdateScheduleInput,
  EventItem,
} from '../types/event.types.js';

export async function fetchEvents(params: EventFilterParams = {}): Promise<EventListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.event_type) searchParams.set('event_type', params.event_type);
  if (params.status) searchParams.set('status', params.status);
  if (params.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const url = qs ? `/api/v1/events?${qs}` : '/api/v1/events';

  return apiClient<EventListResponse>(url, { method: 'GET' });
}

export async function fetchEventById(id: number): Promise<EventDetail> {
  return apiClient<EventDetail>(`/api/v1/events/${id}`, { method: 'GET' });
}

export async function fetchEventSchedules(eventId: number): Promise<ScheduleItem[]> {
  return apiClient<ScheduleItem[]>(`/api/v1/events/${eventId}/schedules`, { method: 'GET' });
}

export async function createEvent(input: CreateEventInput): Promise<EventItem> {
  return apiClient<EventItem>('/api/v1/events', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateEvent(id: number, input: UpdateEventInput): Promise<EventItem> {
  return apiClient<EventItem>(`/api/v1/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function createSchedule(
  eventId: number,
  input: CreateScheduleInput
): Promise<ScheduleItem> {
  return apiClient<ScheduleItem>(`/api/v1/events/${eventId}/schedules`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateSchedule(
  eventId: number,
  scheduleId: number,
  input: UpdateScheduleInput
): Promise<ScheduleItem> {
  return apiClient<ScheduleItem>(`/api/v1/events/${eventId}/schedules/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
