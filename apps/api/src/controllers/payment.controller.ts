import { Request, Response, NextFunction } from 'express';
import { paymentService, PaymentService } from '../services/payment.service.js';
import { ValidationError } from '../errors/app-error.js';

export class PaymentController {
  constructor(private readonly service: PaymentService = paymentService) {}

  initiate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registrationId = req.params.id
        ? Number(req.params.id)
        : req.body.registration_id;

      if (!registrationId || isNaN(registrationId)) {
        throw new ValidationError('A valid registration_id is required to initiate payment.');
      }

      const result = await this.service.initiatePayment(
        {
          registration_id: registrationId,
          payment_method: req.body.payment_method,
          simulated_outcome: req.body.simulated_outcome,
        },
        req.user!
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paymentId = Number(req.params.id);
      const result = await this.service.getPaymentById(paymentId, req.user!);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  getByRegistrationId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registrationId = Number(req.params.id);
      const result = await this.service.getPaymentsByRegistrationId(registrationId, req.user!);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const paymentController = new PaymentController();
