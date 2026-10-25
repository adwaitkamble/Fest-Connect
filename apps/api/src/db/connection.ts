import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export function getDbConfig(): DbConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'fest_user',
    password: process.env.DB_PASSWORD || 'fest_password_local_only',
    database: process.env.DB_NAME || 'festconnect',
  };
}

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (!pool) {
    const config = getDbConfig();
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
      timezone: '+00:00', // UTC timestamps
    });
  }
  return pool;
}

export async function checkDbConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const p = getDbPool();
    const conn = await p.getConnection();
    await conn.ping();
    conn.release();
    return { connected: true };
  } catch (err: unknown) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Database unreachable',
    };
  }
}
