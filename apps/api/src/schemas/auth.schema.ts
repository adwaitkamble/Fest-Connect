import { z } from 'zod';

export const registerSchema = z
  .object({
    first_name: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(1, 'First name cannot be empty')
      .max(100, 'First name cannot exceed 100 characters'),
    last_name: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(1, 'Last name cannot be empty')
      .max(100, 'Last name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address format')
      .max(255, 'Email cannot exceed 255 characters')
      .toLowerCase(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters'),
    phone: z
      .string()
      .trim()
      .max(20, 'Phone cannot exceed 20 characters')
      .optional()
      .nullable(),
    college_name: z
      .string()
      .trim()
      .max(255, 'College name cannot exceed 255 characters')
      .optional()
      .nullable(),
    date_of_birth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be formatted as YYYY-MM-DD')
      .optional()
      .nullable(),
    skills: z
      .array(z.string().trim().min(1, 'Skill cannot be empty').max(100, 'Skill cannot exceed 100 characters'))
      .optional()
      .default([]),
  })
  // Disallow arbitrary client-injected roles or parameters
  .strict();

export type RegisterSchemaInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address format')
      .toLowerCase(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password cannot be empty')
      .max(128, 'Password cannot exceed 128 characters'),
  })
  .strict();

export type LoginSchemaInput = z.infer<typeof loginSchema>;
