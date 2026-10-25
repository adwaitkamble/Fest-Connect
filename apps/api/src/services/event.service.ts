import { EventRepository, eventRepository } from '../repositories/event.repository.js';
import { ScheduleRepository, scheduleRepository } from '../repositories/schedule.repository.js';
import { CoordinatorRepository, coordinatorRepository } from '../repositories/coordinator.repository.js';
import {
  EventListQuery,
  CreateEventDto,
  UpdateEventDto,
  EventResponse,
  EventWithSchedulesResponse,
  EventWithCoordinatorRow,
} from '../types/event.types.js';
import { AuthTokenPayload } from '../types/auth.types.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors/app-error.js';
import {
  CacheService,
  getCacheService,
  buildEventListCacheKey,
  buildEventDetailCacheKey,
  buildEventSchedulesCacheKey,
  CACHE_PREFIX,
} from '../cache/index.js';

export class EventService {
  constructor(
    private readonly eventRepo: EventRepository = eventRepository,
    private readonly scheduleRepo: ScheduleRepository = scheduleRepository,
    private readonly coordinatorRepo: CoordinatorRepository = coordinatorRepository,
    private readonly _cache?: CacheService
  ) {}

  private get cache(): CacheService {
    return this._cache ?? getCacheService();
  }

  private serializeEvent(row: EventWithCoordinatorRow): EventResponse {
    return {
      event_id: row.event_id,
      coordinator_id: row.coordinator_id,
      coordinator_name: row.coordinator_name,
      coordinator_email: row.coordinator_email,
      event_name: row.event_name,
      event_type: row.event_type,
      description: row.description,
      min_team_size: row.min_team_size,
      max_team_size: row.max_team_size,
      registration_fee:
        typeof row.registration_fee === 'number'
          ? row.registration_fee.toFixed(2)
          : String(row.registration_fee),
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async listEvents(query: EventListQuery): Promise<{
    events: EventResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const cacheKey = buildEventListCacheKey(query);
    const cached = await this.cache.get<{
      events: EventResponse[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const offset = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.eventRepo.findPaginated(query, limit, offset),
      this.eventRepo.count(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const result = {
      events: rows.map((r) => this.serializeEvent(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    await this.cache.set(cacheKey, result);
    return result;
  }

  async getEventById(id: number): Promise<EventWithSchedulesResponse> {
    const cacheKey = buildEventDetailCacheKey(id);
    const cached = await this.cache.get<EventWithSchedulesResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const event = await this.eventRepo.findById(id);
    if (!event) {
      throw new NotFoundError(`Event with ID ${id} not found.`);
    }

    const schedules = await this.scheduleRepo.findByEventId(id);

    const result: EventWithSchedulesResponse = {
      ...this.serializeEvent(event),
      schedules,
    };

    await this.cache.set(cacheKey, result);
    return result;
  }

  async createEvent(dto: CreateEventDto, user: AuthTokenPayload): Promise<EventResponse> {
    if (user.role === 'COORDINATOR') {
      const coordinator = await this.coordinatorRepo.findByParticipantId(user.userId);
      if (!coordinator) {
        throw new ForbiddenError('Coordinator profile not found for this user account.');
      }

      if (dto.coordinator_id !== undefined && dto.coordinator_id !== null && dto.coordinator_id !== coordinator.coordinator_id) {
        throw new ForbiddenError('Coordinators can only create events assigned to themselves.');
      }

      dto.coordinator_id = coordinator.coordinator_id;
    } else if (user.role === 'ADMIN') {
      if (dto.coordinator_id) {
        const coordinator = await this.coordinatorRepo.findById(dto.coordinator_id);
        if (!coordinator) {
          throw new ValidationError('Assigned coordinator does not exist.', [
            { field: 'coordinator_id', message: `Coordinator with ID ${dto.coordinator_id} not found.` },
          ]);
        }
      }
    }

    const minSize = dto.min_team_size ?? 1;
    const maxSize = dto.max_team_size ?? 1;
    if (minSize > maxSize) {
      throw new ValidationError('min_team_size cannot exceed max_team_size', [
        { field: 'min_team_size', message: 'min_team_size cannot exceed max_team_size' },
      ]);
    }

    const insertId = await this.eventRepo.create(dto);
    const created = await this.eventRepo.findById(insertId);
    if (!created) {
      throw new Error('Failed to retrieve newly created event');
    }

    // Invalidate cached event listings after creating a new event
    await this.cache.delPattern(`${CACHE_PREFIX}:events:list:*`);

    return this.serializeEvent(created);
  }

  async updateEvent(id: number, dto: UpdateEventDto, user: AuthTokenPayload): Promise<EventResponse> {
    const existing = await this.eventRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Event with ID ${id} not found.`);
    }

    if (user.role === 'COORDINATOR') {
      const coordinator = await this.coordinatorRepo.findByParticipantId(user.userId);
      if (!coordinator || existing.coordinator_id !== coordinator.coordinator_id) {
        throw new ForbiddenError('Access denied: you are not authorized to modify this event.');
      }

      if (dto.coordinator_id !== undefined && dto.coordinator_id !== coordinator.coordinator_id) {
        throw new ForbiddenError('Coordinators cannot reassign event ownership to another coordinator.');
      }
    } else if (user.role === 'ADMIN') {
      if (dto.coordinator_id !== undefined && dto.coordinator_id !== null) {
        const coordinator = await this.coordinatorRepo.findById(dto.coordinator_id);
        if (!coordinator) {
          throw new ValidationError('Assigned coordinator does not exist.', [
            { field: 'coordinator_id', message: `Coordinator with ID ${dto.coordinator_id} not found.` },
          ]);
        }
      }
    }

    const effectiveMin = dto.min_team_size ?? existing.min_team_size;
    const effectiveMax = dto.max_team_size ?? existing.max_team_size;
    if (effectiveMin > effectiveMax) {
      throw new ValidationError('min_team_size cannot exceed max_team_size', [
        { field: 'min_team_size', message: 'min_team_size cannot exceed max_team_size' },
      ]);
    }

    await this.eventRepo.update(id, dto);
    const updated = await this.eventRepo.findById(id);
    if (!updated) {
      throw new NotFoundError(`Event with ID ${id} not found after update.`);
    }

    // Invalidate affected cache entries on event update
    await Promise.all([
      this.cache.del(buildEventDetailCacheKey(id)),
      this.cache.del(buildEventSchedulesCacheKey(id)),
      this.cache.delPattern(`${CACHE_PREFIX}:events:list:*`),
    ]);

    return this.serializeEvent(updated);
  }
}

export const eventService = new EventService();
