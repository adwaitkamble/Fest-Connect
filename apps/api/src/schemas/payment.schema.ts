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

export const razorpayOrderSchema = z
  .object({
    registration_id: z
      .number({ invalid_type_error: 'registration_id must be a number' })
      .int()
      .positive('Registration ID must be a positive integer')
      .optional(),
  })
  .strict();

export const razorpayVerifySchema = z
  .object({
    registration_id: z
      .number({ invalid_type_error: 'registration_id must be a number' })
      .int()
      .positive('Registration ID must be a positive integer')
      .optional(),
    razorpay_order_id: z.string().trim().min(5, 'razorpay_order_id is required'),
    razorpay_payment_id: z.string().trim().min(5, 'razorpay_payment_id is required'),
    razorpay_signature: z.string().trim().min(10, 'razorpay_signature is required'),
  })
  .strict();

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type RazorpayOrderInput = z.infer<typeof razorpayOrderSchema>;
export type RazorpayVerifyInput = z.infer<typeof razorpayVerifySchema>;

