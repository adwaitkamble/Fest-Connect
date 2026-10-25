import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { getDbConfig } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const config = getDbConfig();
  console.log(`[FestConnect Migration] Connecting to MySQL at ${config.host}:${config.port}...`);

  // Connect without database first to ensure target database exists with connection retry
  let rootConn: mysql.Connection | null = null;
  const maxRetries = 15;
  const retryIntervalMs = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      rootConn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
      });
      break;
    } catch (err: unknown) {
      if (attempt === maxRetries) {
        console.error(`[FestConnect Migration] Failed to connect after ${maxRetries} attempts:`, err instanceof Error ? err.message : err);
        throw err;
      }
      console.log(`[FestConnect Migration] Waiting for MySQL at ${config.host}:${config.port} (attempt ${attempt}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
    }
  }

  try {
    if (rootConn) {
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      console.log(`[FestConnect Migration] Database \`${config.database}\` ensured.`);
    }
  } catch (err: unknown) {
    console.error(`[FestConnect Migration] Failed to ensure database:`, err instanceof Error ? err.message : err);
    throw err;
  } finally {
    if (rootConn) await rootConn.end();
  }

  // Connect to target database
  const connection = await mysql.createConnection({
    ...config,
    multipleStatements: true,
  });

  try {
    // Create migrations tracker table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL UNIQUE,
        \`applied_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Read applied migrations
    const [rows] = await connection.query<mysql.RowDataPacket[]>('SELECT `name` FROM `schema_migrations`');
    const appliedSet = new Set(rows.map(r => r.name));

    // Resolve migration files directory with robust runtime fallbacks
    let migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      const candidates = [
        path.join(process.cwd(), 'src', 'db', 'migrations'),
        path.join(process.cwd(), 'dist', 'db', 'migrations'),
        path.join(__dirname, '..', '..', 'src', 'db', 'migrations'),
        path.join(__dirname, '..', 'src', 'db', 'migrations'),
        path.join(process.cwd(), 'apps', 'api', 'src', 'db', 'migrations'),
        path.join(process.cwd(), 'apps', 'api', 'dist', 'db', 'migrations'),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          migrationsDir = cand;
          break;
        }
      }
    }

    if (!fs.existsSync(migrationsDir)) {
      console.log(`[FestConnect Migration] No migrations directory found at ${migrationsDir}`);
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let appliedCount = 0;
    for (const file of files) {
      if (!appliedSet.has(file)) {
        console.log(`[FestConnect Migration] Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        await connection.beginTransaction();
        try {
          await connection.query(sql);
          await connection.query('INSERT INTO `schema_migrations` (`name`) VALUES (?)', [file]);
          await connection.commit();
          console.log(`[FestConnect Migration] Successfully applied: ${file}`);
          appliedCount++;
        } catch (err) {
          await connection.rollback();
          console.error(`[FestConnect Migration] Error executing migration ${file}. Rolled back.`);
          throw err;
        }
      } else {
        console.log(`[FestConnect Migration] Already applied: ${file}`);
      }
    }

    console.log(`[FestConnect Migration] Migration process complete. Total newly applied: ${appliedCount}`);
  } finally {
    await connection.end();
  }
}

// Execute directly if run as a script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('[FestConnect Migration] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[FestConnect Migration] Migration failed:', err);
      process.exit(1);
    });
}
