import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App.js';

describe('Web App Shell & Scaffold', () => {
  beforeEach(() => {
    // Mock fetch for isolated unit testing of App component
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'ok',
            liveness: 'ok',
            readiness: 'unconfigured',
            uptime: 10,
            timestamp: new Date().toISOString(),
            service: 'festconnect-api',
            version: '0.1.0',
            environment: 'development',
            subsystems: {
              api: 'healthy',
              database: 'not_configured_in_phase_01',
              cache: 'not_configured_in_phase_01',
            },
          }),
      })
    );
  });

  it('renders FestConnect product brand and header navigation', async () => {
    render(<App />);
    expect(screen.getByText('FestConnect')).toBeDefined();
    expect(screen.getByText('Technical Fest & Event Registration')).toBeDefined();
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Events')).toBeDefined();

    // Await async fetch state update to prevent act(...) warnings
    await waitFor(() => {
      expect(screen.getByText('Live & Responsive')).toBeDefined();
    });
  });

  it('displays the Phase 01 scaffold notice', async () => {
    render(<App />);
    expect(screen.getByText('FestConnect Monorepo Scaffold Initialized')).toBeDefined();
    expect(screen.getByText(/Object Oriented Modelling and System Design/)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Live & Responsive')).toBeDefined();
    });
  });

  it('contains the API Connection Status card and displays health data', async () => {
    render(<App />);
    expect(screen.getByText('API Connection Status')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Live & Responsive')).toBeDefined();
      expect(screen.getByText(/festconnect-api/)).toBeDefined();
    });
  });
});

