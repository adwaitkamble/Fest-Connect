import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const DEFAULT_DEV_JWT_SECRET = 'local_demo_jwt_secret_change_in_production_min32chars';
export const DEFAULT_DEV_PASS_HMAC_SECRET = 'local_demo_pass_hmac_secret_min32chars_secure';

export const envSchema = z
  .object({
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    API_PREFIX: z.string().default('/api/v1'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),

    // Database settings
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.coerce.number().default(3306),
    DB_NAME: z.string().default('festconnect'),
    DB_USER: z.string().default('fest_user'),
    DB_PASSWORD: z.string().default('fest_password_local_only'),

    // JWT & Authentication
    JWT_SECRET: z.string().default(DEFAULT_DEV_JWT_SECRET),
    JWT_EXPIRES_IN: z.string().default('24h'),
    COOKIE_NAME: z.string().default('festconnect_token'),
    CSRF_COOKIE_NAME: z.string().default('festconnect_csrf'),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_SECURE: z.coerce.boolean().optional(),

    // Optional Redis (Phase 09)
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional().default(''),
    REDIS_ENABLED: z.coerce.boolean().default(false),
    CACHE_DEFAULT_TTL_SECONDS: z.coerce.number().default(60),

    // Payment settings (Phase 06 & Real Razorpay Gateway)
    PAYMENT_PROVIDER: z.string().default('mock'),
    DEFAULT_CURRENCY: z.string().default('INR'),
    RAZORPAY_KEY_ID: z.string().optional().default(''),
    RAZORPAY_KEY_SECRET: z.string().optional().default(''),

    // Email & Notification settings (Phase 07)
    EMAIL_PROVIDER: z.enum(['console', 'gmail']).default('console'),
    GMAIL_USER: z.string().optional().default(''),
    GMAIL_APP_PASSWORD: z.string().optional().default(''),
    PASS_HMAC_SECRET: z.string().default(DEFAULT_DEV_PASS_HMAC_SECRET),
  })
  .superRefine((data, ctx) => {
    // Security Invariants for Production Mode
    if (data.NODE_ENV === 'production') {
      // 1. JWT Secret strength and non-default requirement
      if (!data.JWT_SECRET || data.JWT_SECRET === DEFAULT_DEV_JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'Production configuration requires an explicit, non-default JWT_SECRET to be configured.',
        });
      } else if (data.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'Production JWT_SECRET must be at least 32 characters long.',
        });
      }

      // 2. Disallow insecure CORS wildcards in production
      if (data.CORS_ORIGIN === '*' || data.CORS_ORIGIN.includes('localhost')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CORS_ORIGIN'],
          message: 'Production CORS_ORIGIN cannot be wildcard (*) or localhost.',
        });
      }

      // 3. Gmail credentials validation if EMAIL_PROVIDER=gmail in production
      if (data.EMAIL_PROVIDER === 'gmail' && (!data.GMAIL_USER || !data.GMAIL_APP_PASSWORD)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GMAIL_USER'],
          message: 'Production configuration with EMAIL_PROVIDER=gmail requires GMAIL_USER and GMAIL_APP_PASSWORD.',
        });
      }

      // 4. Dedicated PASS_HMAC_SECRET requirement in production
      if (!data.PASS_HMAC_SECRET || data.PASS_HMAC_SECRET === DEFAULT_DEV_PASS_HMAC_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PASS_HMAC_SECRET'],
          message: 'Production configuration requires an explicit, non-default PASS_HMAC_SECRET to be configured.',
        });
      } else if (data.PASS_HMAC_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PASS_HMAC_SECRET'],
          message: 'Production PASS_HMAC_SECRET must be at least 32 characters long.',
        });
      }
    } else {
      // Development/test minimal check
      if (data.JWT_SECRET.length < 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be at least 16 characters in development/test.',
        });
      }
      if (data.PASS_HMAC_SECRET.length < 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PASS_HMAC_SECRET'],
          message: 'PASS_HMAC_SECRET must be at least 16 characters in development/test.',
        });
      }
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function parseEnv(rawEnv: Record<string, unknown> = process.env): EnvConfig {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = JSON.stringify(result.error.flatten().fieldErrors);
    console.error('[Config Error] Invalid environment variables:', errorDetails);
    throw new Error(`Environment validation failed: ${errorDetails}`);
  }
  return result.data;
}

export function getEnv(): EnvConfig {
  if (!cachedEnv) {
    cachedEnv = parseEnv(process.env);
  }
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = null;
}
