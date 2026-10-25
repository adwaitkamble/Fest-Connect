import { z } from 'zod';

export const createTeamSchema = z
  .object({
    team_name: z
      .string({ required_error: 'team_name is required' })
      .trim()
      .min(2, 'Team name must be at least 2 characters')
      .max(150, 'Team name cannot exceed 150 characters'),
  })
  .strict();

export const addMemberSchema = z
  .object({
    participant_id: z.number().int().positive('Participant ID must be a positive integer').optional(),
    email: z.string().trim().email('Invalid email address format').optional(),
  })
  .strict()
  .refine(
    (data) => data.participant_id !== undefined || (data.email !== undefined && data.email.length > 0),
    {
      message: 'Either participant_id or email must be provided to add a member',
      path: ['participant_id'],
    }
  );

export const teamIdParamSchema = z
  .object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('Team ID must be a positive integer')),
  })
  .strict();

export const memberParamSchema = z
  .object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('Team ID must be a positive integer')),
    participantId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('Participant ID must be a positive integer')),
  })
  .strict();

export const createRegistrationSchema = z
  .object({
    team_id: z.number({ required_error: 'team_id is required' }).int().positive('team_id must be a positive integer'),
    event_id: z.number({ required_error: 'event_id is required' }).int().positive('event_id must be a positive integer'),
  })
  .strict();

export const registrationIdParamSchema = z
  .object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('Registration ID must be a positive integer')),
  })
  .strict();

export const updateRegistrationSchema = z
  .object({
    status: z.literal('CANCELLED', {
      errorMap: () => ({ message: 'Only CANCELLED status transition is allowed' }),
    }),
  })
  .strict();

export const registrationQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().int().min(1, 'Page must be a positive integer')),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')),
    team_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    event_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    status: z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED']).optional(),
  })
  .strict();

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
export type UpdateRegistrationInput = z.infer<typeof updateRegistrationSchema>;
export type RegistrationQueryInput = z.infer<typeof registrationQuerySchema>;
