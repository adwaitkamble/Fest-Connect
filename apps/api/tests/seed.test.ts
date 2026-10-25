import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { runSeeds } from '../src/db/seed.js';

describe('Phase 02 — Safe Demo Seed Verification', () => {
  it('hashes passwords securely using bcrypt', async () => {
    const rawPassword = 'demo1234';
    const hash = await bcrypt.hash(rawPassword, 10);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const matches = await bcrypt.compare(rawPassword, hash);
    expect(matches).toBe(true);

    const wrongMatches = await bcrypt.compare('wrongpassword', hash);
    expect(wrongMatches).toBe(false);
  });

  it('seed runner strictly refuses execution in production mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await expect(runSeeds()).rejects.toThrow(/production mode/i);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
