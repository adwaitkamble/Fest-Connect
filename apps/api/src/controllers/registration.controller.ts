import { Request, Response, NextFunction } from 'express';
import { registrationService, RegistrationService } from '../services/registration.service.js';
import { CreateRegistrationDto } from '../types/team.types.js';

export class RegistrationController {
  constructor(private readonly service: RegistrationService = registrationService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateRegistrationDto;
      const created = await this.service.registerTeam(dto, req.user!);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const reg = await this.service.getRegistrationById(id, req.user!);
      res.status(200).json({
        success: true,
        data: reg,
      });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listRegistrations(req.query, req.user!);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const updated = await this.service.cancelRegistration(id, req.user!);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const registrationController = new RegistrationController();
