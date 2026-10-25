import { Request, Response, NextFunction } from 'express';
import { scheduleService, ScheduleService } from '../services/schedule.service.js';
import { CreateScheduleDto, UpdateScheduleDto } from '../types/event.types.js';

export class ScheduleController {
  constructor(private readonly service: ScheduleService = scheduleService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventId = parseInt(String(req.params.id), 10);
      const schedules = await this.service.listSchedulesByEventId(eventId);
      res.status(200).json({
        success: true,
        data: schedules,
      });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventId = parseInt(String(req.params.id), 10);
      const dto = req.body as CreateScheduleDto;
      const created = await this.service.createSchedule(eventId, dto, req.user!);
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
      const eventId = parseInt(String(req.params.id), 10);
      const scheduleId = parseInt(String(req.params.scheduleId), 10);
      const dto = req.body as UpdateScheduleDto;
      const updated = await this.service.updateSchedule(eventId, scheduleId, dto, req.user!);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const scheduleController = new ScheduleController();
