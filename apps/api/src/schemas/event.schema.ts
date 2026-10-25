import { z } from 'zod';

const eventStatusEnum = z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'], {
  errorMap: () => ({ message: 'Status must be one of: UPCOMING, ACTIVE, COMPLETED, CANCELLED' }),
});

const timeStringRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const dateStringRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Normalizes HH:MM or HH:MM:SS to seconds from midnight for strict comparison
 */
function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

export const eventQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().int().min(1, 'Page must be a positive integer')),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .pipe(z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')),
    event_type: z.string().trim().min(1).max(100).optional(),
    status: eventStatusEnum.optional(),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const eventIdParamSchema = z
  .object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('Event ID must be a positive integer')),
  })
  .strict();

export const scheduleParamSchema = z
  .object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('Event ID must be a positive integer')),
    scheduleId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('Schedule ID must be a positive integer')),
  })
  .strict();

export const createEventSchema = z
  .object({
    event_name: z
      .string({ required_error: 'Event name is required' })
      .trim()
      .min(2, 'Event name must be at least 2 characters')
      .max(255, 'Event name cannot exceed 255 characters'),
    event_type: z
      .string({ required_error: 'Event type is required' })
      .trim()
      .min(2, 'Event type must be at least 2 characters')
      .max(100, 'Event type cannot exceed 100 characters'),
    description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').nullable().optional(),
    min_team_size: z
      .number({ required_error: 'Minimum team size is required' })
      .int('Minimum team size must be an integer')
      .min(1, 'Minimum team size must be at least 1')
      .max(100, 'Minimum team size cannot exceed 100')
      .default(1),
    max_team_size: z
      .number({ required_error: 'Maximum team size is required' })
      .int('Maximum team size must be an integer')
      .min(1, 'Maximum team size must be at least 1')
      .max(100, 'Maximum team size cannot exceed 100')
      .default(1),
    registration_fee: z
      .union([z.number().min(0, 'Registration fee must be 0 or greater'), z.string()])
      .transform((val) => {
        const num = typeof val === 'number' ? val : parseFloat(val);
        if (isNaN(num) || num < 0) {
          throw new Error('Registration fee must be a valid non-negative number');
        }
        return num.toFixed(2);
      })
      .default(0),
    status: eventStatusEnum.default('UPCOMING'),
    coordinator_id: z.number().int().positive('Coordinator ID must be a positive integer').nullable().optional(),
  })
  .strict()
  .refine((data) => data.min_team_size <= data.max_team_size, {
    message: 'min_team_size cannot exceed max_team_size',
    path: ['min_team_size'],
  });

export const updateEventSchema = z
  .object({
    event_name: z
      .string()
      .trim()
      .min(2, 'Event name must be at least 2 characters')
      .max(255, 'Event name cannot exceed 255 characters')
      .optional(),
    event_type: z
      .string()
      .trim()
      .min(2, 'Event type must be at least 2 characters')
      .max(100, 'Event type cannot exceed 100 characters')
      .optional(),
    description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').nullable().optional(),
    min_team_size: z
      .number()
      .int('Minimum team size must be an integer')
      .min(1, 'Minimum team size must be at least 1')
      .max(100, 'Minimum team size cannot exceed 100')
      .optional(),
    max_team_size: z
      .number()
      .int('Maximum team size must be an integer')
      .min(1, 'Maximum team size must be at least 1')
      .max(100, 'Maximum team size cannot exceed 100')
      .optional(),
    registration_fee: z
      .union([z.number().min(0, 'Registration fee must be 0 or greater'), z.string()])
      .transform((val) => {
        const num = typeof val === 'number' ? val : parseFloat(val);
        if (isNaN(num) || num < 0) {
          throw new Error('Registration fee must be a valid non-negative number');
        }
        return num.toFixed(2);
      })
      .optional(),
    status: eventStatusEnum.optional(),
    coordinator_id: z.number().int().positive('Coordinator ID must be a positive integer').nullable().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.min_team_size !== undefined && data.max_team_size !== undefined) {
        return data.min_team_size <= data.max_team_size;
      }
      return true;
    },
    {
      message: 'min_team_size cannot exceed max_team_size',
      path: ['min_team_size'],
    }
  );

export const createScheduleSchema = z
  .object({
    event_date: z
      .string({ required_error: 'event_date is required' })
      .regex(dateStringRegex, 'event_date must be in YYYY-MM-DD format')
      .refine((val) => !isNaN(new Date(val).getTime()), 'event_date must be a valid calendar date'),
    start_time: z
      .string({ required_error: 'start_time is required' })
      .regex(timeStringRegex, 'start_time must be in HH:MM or HH:MM:SS format'),
    end_time: z
      .string({ required_error: 'end_time is required' })
      .regex(timeStringRegex, 'end_time must be in HH:MM or HH:MM:SS format'),
    venue: z
      .string({ required_error: 'venue is required' })
      .trim()
      .min(1, 'Venue is required')
      .max(255, 'Venue cannot exceed 255 characters'),
  })
  .strict()
  .refine(
    (data) => timeToSeconds(data.start_time) < timeToSeconds(data.end_time),
    {
      message: 'Schedule start_time must be earlier than end_time',
      path: ['start_time'],
    }
  );

export const updateScheduleSchema = z
  .object({
    event_date: z
      .string()
      .regex(dateStringRegex, 'event_date must be in YYYY-MM-DD format')
      .refine((val) => !isNaN(new Date(val).getTime()), 'event_date must be a valid calendar date')
      .optional(),
    start_time: z
      .string()
      .regex(timeStringRegex, 'start_time must be in HH:MM or HH:MM:SS format')
      .optional(),
    end_time: z
      .string()
      .regex(timeStringRegex, 'end_time must be in HH:MM or HH:MM:SS format')
      .optional(),
    venue: z
      .string()
      .trim()
      .min(1, 'Venue cannot be empty')
      .max(255, 'Venue cannot exceed 255 characters')
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return timeToSeconds(data.start_time) < timeToSeconds(data.end_time);
      }
      return true;
    },
    {
      message: 'Schedule start_time must be earlier than end_time',
      path: ['start_time'],
    }
  );

export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
