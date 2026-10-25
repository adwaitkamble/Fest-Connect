import { Request, Response, NextFunction } from 'express';
import { passService } from '../services/pass.service.js';

export class PassController {
  async getRegistrationPass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registrationId = parseInt(String(req.params.id), 10);
      const user = req.user!;
      const pass = await passService.getPassByRegistrationId(registrationId, user);

      res.status(200).json({
        success: true,
        data: pass,
      });
    } catch (err) {
      next(err);
    }
  }

  async generateRegistrationPass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registrationId = parseInt(String(req.params.id), 10);
      const user = req.user!;
      const pass = await passService.generatePass(registrationId, user);

      res.status(201).json({
        success: true,
        message: 'Digital pass generated successfully.',
        data: pass,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPassById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const passId = parseInt(String(req.params.id), 10);
      const user = req.user!;
      const pass = await passService.getPassById(passId, user);

      res.status(200).json({
        success: true,
        data: pass,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyPass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const result = await passService.verifyPass(req.body, user);

      const statusCode = result.valid ? 200 : 400;
      res.status(statusCode).json({
        success: result.valid,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const passController = new PassController();
