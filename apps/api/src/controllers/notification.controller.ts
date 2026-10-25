import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service.js';

export class NotificationController {
  async getEmailNotificationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registrationId = parseInt(String(req.params.id), 10);
      const user = req.user!;
      const status = await notificationService.getNotificationStatus(registrationId, user);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  async sendOrRetryEmailNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registrationId = parseInt(String(req.params.id), 10);
      const user = req.user!;
      const force = Boolean(req.body?.force);
      const status = await notificationService.sendOrRetryNotification(registrationId, user, { force });

      res.status(200).json({
        success: true,
        message:
          status.status === 'DELIVERED'
            ? 'Email notification dispatched successfully.'
            : 'Email notification attempt recorded with failure.',
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
