import { z } from 'zod';

export const initiatePaymentSchema = z
  .object({
    registration_id: z
      .number({ invalid_type_error: 'registration_id must be a number' })
      .int()
      .positive('Registration ID must be a positive integer')
      .optional(),
    payment_method: z.string().trim().max(50).default('MOCK'),
    simulated_outcome: z
      .enum(['SUCCESS', 'FAILED', 'PENDING'], {
        errorMap: () => ({ message: 'simulated_outcome must be SUCCESS, FAILED, or PENDING' }),
      })
      .default('SUCCESS')
      .optional(),
  })
  .strict();

export const paymentIdParamSchema = z
  .object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('Payment ID must be a positive integer')),
  })
  .strict();

export const registrationPaymentParamSchema = z
  .object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('Registration ID must be a positive integer')),
  })
  .strict();

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
