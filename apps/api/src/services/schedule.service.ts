import { ScheduleRepository, scheduleRepository } from '../repositories/schedule.repository.js';
import { EventRepository, eventRepository } from '../repositories/event.repository.js';
import { CoordinatorRepository, coordinatorRepository } from '../repositories/coordinator.repository.js';
import { CreateScheduleDto, UpdateScheduleDto, ScheduleResponse } from '../types/event.types.js';
import { AuthTokenPayload } from '../types/auth.types.js';
import { ScheduleObserver, ScheduleSubject, ScheduleChangeEvent } from '../types/observer.types.js';
import { emailNotificationObserver } from '../observers/email-notification.observer.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors/app-error.js';
import {
  CacheService,
  getCacheService,
  buildEventSchedulesCacheKey,
  buildEventDetailCacheKey,
  CACHE_PREFIX,
} from '../cache/index.js';

function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

export class ScheduleService implements ScheduleSubject {
  private observers: ScheduleObserver[] = [emailNotificationObserver];

  constructor(
    private readonly scheduleRepo: ScheduleRepository = scheduleRepository,
    private readonly eventRepo: EventRepository = eventRepository,
    private readonly coordinatorRepo: CoordinatorRepository = coordinatorRepository,
    private readonly _cache?: CacheService
  ) {}

  private get cache(): CacheService {
    return this._cache ?? getCacheService();
  }

  addObserver(observer: ScheduleObserver): void {
    if (!this.observers.some((o) => o.name === observer.name)) {
      this.observers.push(observer);
    }
  }

  removeObserver(observerName: string): void {
    this.observers = this.observers.filter((o) => o.name !== observerName);
  }

  getObservers(): ScheduleObserver[] {
    return [...this.observers];
  }

  async notifyObservers(event: ScheduleChangeEvent): Promise<void> {
    for (const observer of this.observers) {
      try {
        await observer.onScheduleChanged(event);
      } catch (err: unknown) {
        console.error(`[ScheduleService] Observer '${observer.name}' failed:`, (err as Error).message);
      }
    }
  }

  async listSchedulesByEventId(eventId: number): Promise<ScheduleResponse[]> {
    const cacheKey = buildEventSchedulesCacheKey(eventId);
    const cached = await this.cache.get<ScheduleResponse[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      throw new NotFoundError(`Event with ID ${eventId} not found.`);
    }

    const schedules = await this.scheduleRepo.findByEventId(eventId);
    await this.cache.set(cacheKey, schedules);
    return schedules;
  }

  async createSchedule(
    eventId: number,
    dto: CreateScheduleDto,
    user: AuthTokenPayload
  ): Promise<ScheduleResponse> {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      throw new NotFoundError(`Event with ID ${eventId} not found.`);
    }

    if (user.role === 'COORDINATOR') {
      const coordinator = await this.coordinatorRepo.findByParticipantId(user.userId);
      if (!coordinator || event.coordinator_id !== coordinator.coordinator_id) {
        throw new ForbiddenError('Access denied: you are not authorized to create schedules for this event.');
      }
    }

    if (timeToSeconds(dto.start_time) >= timeToSeconds(dto.end_time)) {
      throw new ValidationError('Schedule start_time must be earlier than end_time', [
        { field: 'start_time', message: 'start_time must be earlier than end_time' },
      ]);
    }

    const insertId = await this.scheduleRepo.create(eventId, dto);
    const created = await this.scheduleRepo.findById(insertId);
    if (!created) {
      throw new Error('Failed to retrieve newly created schedule');
    }

    // Invalidate affected cache entries on new schedule
    await Promise.all([
      this.cache.del(buildEventSchedulesCacheKey(eventId)),
      this.cache.del(buildEventDetailCacheKey(eventId)),
      this.cache.delPattern(`${CACHE_PREFIX}:events:list:*`),
    ]);

    return created;
  }

  async updateSchedule(
    eventId: number,
    scheduleId: number,
    dto: UpdateScheduleDto,
    user: AuthTokenPayload
  ): Promise<ScheduleResponse> {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      throw new NotFoundError(`Event with ID ${eventId} not found.`);
    }

    const schedule = await this.scheduleRepo.findById(scheduleId);
    if (!schedule || schedule.event_id !== eventId) {
      throw new NotFoundError(`Schedule with ID ${scheduleId} not found for event ${eventId}.`);
    }

    if (user.role === 'COORDINATOR') {
      const coordinator = await this.coordinatorRepo.findByParticipantId(user.userId);
      if (!coordinator || event.coordinator_id !== coordinator.coordinator_id) {
        throw new ForbiddenError('Access denied: you are not authorized to update schedules for this event.');
      }
    }

    const effectiveStart = dto.start_time ?? schedule.start_time;
    const effectiveEnd = dto.end_time ?? schedule.end_time;

    if (timeToSeconds(effectiveStart) >= timeToSeconds(effectiveEnd)) {
      throw new ValidationError('Schedule start_time must be earlier than end_time', [
        { field: 'start_time', message: 'start_time must be earlier than end_time' },
      ]);
    }

    await this.scheduleRepo.update(scheduleId, dto);
    const updated = await this.scheduleRepo.findById(scheduleId);
    if (!updated) {
      throw new NotFoundError(`Schedule with ID ${scheduleId} not found after update.`);
    }

    // Invalidate affected cache entries on schedule update
    await Promise.all([
      this.cache.del(buildEventSchedulesCacheKey(eventId)),
      this.cache.del(buildEventDetailCacheKey(eventId)),
      this.cache.delPattern(`${CACHE_PREFIX}:events:list:*`),
    ]);

    // Observer Pattern: Notify registered observers of schedule update
    const changeEvent: ScheduleChangeEvent = {
      eventId,
      eventName: event.event_name,
      scheduleId,
      previousSchedule: {
        venue: schedule.venue,
        event_date: schedule.event_date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
      },
      updatedSchedule: {
        venue: updated.venue,
        event_date: updated.event_date,
        start_time: updated.start_time,
        end_time: updated.end_time,
      },
      updatedBy: {
        userId: user.userId,
        email: user.email,
        role: user.role,
      },
      timestamp: new Date(),
    };

    // Asynchronous dispatch: observers fail safely and do not roll back the schedule update
    this.notifyObservers(changeEvent).catch((err: unknown) => {
      console.error('[ScheduleService] Observer notification error:', (err as Error).message);
    });

    return updated;
  }
}

export const scheduleService = new ScheduleService();
