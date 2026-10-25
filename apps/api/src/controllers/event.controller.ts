import { Request, Response, NextFunction } from 'express';
import { eventService, EventService } from '../services/event.service.js';
import { EventListQuery, CreateEventDto, UpdateEventDto } from '../types/event.types.js';

export class EventController {
  constructor(private readonly service: EventService = eventService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as EventListQuery;
      const result = await this.service.listEvents(query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const event = await this.service.getEventById(id);
      res.status(200).json({
        success: true,
        data: event,
      });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateEventDto;
      const created = await this.service.createEvent(dto, req.user!);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const dto = req.body as UpdateEventDto;
      const updated = await this.service.updateEvent(id, dto, req.user!);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const eventController = new EventController();
