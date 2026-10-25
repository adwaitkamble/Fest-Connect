import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('API Foundation & Health Checks', () => {
  const app = createApp();

  it('GET /api/health should return 200 OK with truthful liveness & readiness', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.liveness).toBe('ok');
    expect(res.body.readiness).toBe('unconfigured');
    expect(res.body.service).toBe('festconnect-api');
    expect(res.body.version).toBe('0.1.0');
    expect(res.body.subsystems).toBeDefined();
    expect(res.body.subsystems.api).toBe('healthy');
    expect(res.body.subsystems.database).toBe('not_configured_in_phase_01');
  });

  it('GET /nonexistent-route should return 404 with TRD standard error shape', async () => {
    const res = await request(app).get('/api/nonexistent-path');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBeDefined();
  });
});
