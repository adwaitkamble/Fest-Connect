import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { getDbConfig } from './connection.js';
import { runMigrations } from './migrate.js';
import { runSeeds } from './seed.js';
import { assertDisposableDatabase } from './safety.js';

export async function resetDatabase(): Promise<void> {
  assertDisposableDatabase('Reset');

  const config = getDbConfig();
  console.log(`[FestConnect Reset] Resetting database \`${config.database}\` on ${config.host}:${config.port}...`);

  const connection = await mysql.createConnection({
    ...config,
    multipleStatements: true,
  });

  try {
    console.log('[FestConnect Reset] Disabling foreign key checks and dropping existing tables...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    const tables = [
      'email_notification_attempt',
      'email_notification',
      'pass_receipt',
      'payment',
      'registration',
      'team_member',
      'team',
      'schedule',
      'event',
      'event_coordinator',
      'participant_skill',
      'participant',
      'schema_migrations',
    ];

    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS \`${table}\`;`);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('[FestConnect Reset] All tables dropped.');
  } finally {
    await connection.end();
  }

  console.log('[FestConnect Reset] Re-running migrations...');
  await runMigrations();

  console.log('[FestConnect Reset] Re-running seeds...');
  await runSeeds();

  console.log('[FestConnect Reset] Database reset complete.');
}

// Execute directly if run as a script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  resetDatabase()
    .then(() => {
      console.log('[FestConnect Reset] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[FestConnect Reset] Reset failed:', err);
      process.exit(1);
    });
}
