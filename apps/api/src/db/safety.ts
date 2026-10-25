import { getDbConfig } from './connection.js';

const LOCAL_SAFE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'mysql',
  'db',
  'host.docker.internal',
]);

/**
 * Validates that the current database configuration targets a disposable development/test environment.
 * Prevents accidental execution of destructive operations (resets, table drops, dummy seeds)
 * against staging, production, or remote cloud databases.
 */
export function assertDisposableDatabase(actionName: string): void {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    throw new Error(`[FestConnect ${actionName}] FATAL: Destructive operation cannot be run in production mode (NODE_ENV=production).`);
  }

  const config = getDbConfig();

  // 1. Database name check: Reject if database name reflects production/live data
  if (/(prod|production|live)/i.test(config.database)) {
    throw new Error(`[FestConnect ${actionName}] FATAL: Refusing to run on database named '${config.database}' which matches production naming pattern.`);
  }

  // 2. Host safety check: Reject remote host unless explicit developer override is set
  const isLocalHost = LOCAL_SAFE_HOSTS.has(config.host.toLowerCase());
  const overrideExplicit = process.env.ALLOW_DESTRUCTIVE_DB_RESET === 'true';

  if (!isLocalHost && !overrideExplicit) {
    throw new Error(
      `[FestConnect ${actionName}] FATAL: Database host '${config.host}' is not a recognized local/disposable host. If intentional, set ALLOW_DESTRUCTIVE_DB_RESET=true.`
    );
  }
}
