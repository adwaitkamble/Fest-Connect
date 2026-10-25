import { z } from 'zod';

export const verifyPassSchema = z
  .object({
    pass_number: z.string().trim().min(3).max(64).optional(),
    qr_code: z.string().trim().min(10).optional(),
    pass_token: z.string().trim().min(10).optional(),
    token: z.string().trim().min(10).optional(),
  })
  .refine((data) => Boolean(data.pass_number || data.qr_code || data.pass_token || data.token), {
    message: 'Either pass_number, qr_code, or pass_token must be provided for pass verification.',
    path: ['pass_number'],
  });

export const validatePassSchema = verifyPassSchema;

export const passParamSchema = z.object({
  id: z.coerce.number().int().positive('Pass ID must be a positive integer'),
});
