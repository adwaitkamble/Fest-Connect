import { describe, it, expect } from 'vitest';
import { assertDisposableDatabase } from '../src/db/safety.js';

describe('Phase 02 — Reset and Seed Safety Guard Verification', () => {
  it('throws an error if NODE_ENV is production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      expect(() => assertDisposableDatabase('TestOp')).toThrow(/production mode/i);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('throws an error if DB_NAME indicates production/live database', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDb = process.env.DB_NAME;
    process.env.NODE_ENV = 'development';
    process.env.DB_NAME = 'festconnect_production_live';

    try {
      expect(() => assertDisposableDatabase('TestOp')).toThrow(/production naming pattern/i);
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.DB_NAME = originalDb;
    }
  });

  it('throws an error if DB_HOST is remote and no override is present', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalHost = process.env.DB_HOST;
    const originalOverride = process.env.ALLOW_DESTRUCTIVE_DB_RESET;
    process.env.NODE_ENV = 'development';
    process.env.DB_HOST = 'db.production.mycloud.com';
    delete process.env.ALLOW_DESTRUCTIVE_DB_RESET;

    try {
      expect(() => assertDisposableDatabase('TestOp')).toThrow(/not a recognized local\/disposable host/i);
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.DB_HOST = originalHost;
      if (originalOverride !== undefined) {
        process.env.ALLOW_DESTRUCTIVE_DB_RESET = originalOverride;
      }
    }
  });

  it('permits execution on local disposable database hosts', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalHost = process.env.DB_HOST;
    const originalDb = process.env.DB_NAME;
    process.env.NODE_ENV = 'development';
    process.env.DB_HOST = 'localhost';
    process.env.DB_NAME = 'festconnect_dev';

    try {
      expect(() => assertDisposableDatabase('TestOp')).not.toThrow();
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.DB_HOST = originalHost;
      process.env.DB_NAME = originalDb;
    }
  });
});
