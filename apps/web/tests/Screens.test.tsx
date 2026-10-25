import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../src/App.js';
import { CoordinatorDashboard } from '../src/components/CoordinatorDashboard.js';
import { EventDetailScreen } from '../src/components/EventDetailScreen.js';
import { ParticipantDashboard } from '../src/components/ParticipantDashboard.js';
import { AuthScreen } from '../src/components/AuthScreen.js';
import { PassScreen } from '../src/components/PassScreen.js';
import { AuthUser, EventDetail } from '../src/types/event.types.js';

// Mock Users
const mockParticipantUser: AuthUser = {
  participant_id: 1,
  first_name: 'Adwait',
  last_name: 'Kamble',
  email: 'adwait@festconnect.edu',
  phone: '+91 9876543210',
  college_name: 'University Institute of Technology',
  role: 'PARTICIPANT',
};

const mockCoordinatorUser: AuthUser = {
  participant_id: 4,
  first_name: 'Prof. Shalu',
  last_name: 'Mahajan',
  email: 'coordinator@festconnect.edu',
  phone: '+91 9876543211',
  college_name: 'University Institute of Technology',
  role: 'COORDINATOR',
  coordinator_id: 1,
};

const mockAdminUser: AuthUser = {
  participant_id: 5,
  first_name: 'System',
  last_name: 'Admin',
  email: 'admin@festconnect.edu',
  phone: null,
  college_name: 'University Institute of Technology',
  role: 'ADMIN',
};

// Mock Event
const mockEventDetail: EventDetail = {
  event_id: 1,
  event_name: 'CodeCraft 24h Hackathon',
  event_type: 'Coding / Software',
  description: 'Annual overnight hackathon building AI and cloud solutions.',
  min_team_size: 2,
  max_team_size: 4,
  registration_fee: '400.00',
  status: 'ACTIVE',
  coordinator_id: 1,
  coordinator_name: 'Prof. Shalu Mahajan',
  coordinator_email: 'coordinator@festconnect.edu',
  coordinator_phone: '+91 9876543210',
  created_at: '2026-10-24T00:00:00.000Z',
  updated_at: '2026-10-24T00:00:00.000Z',
  schedules: [
    {
      schedule_id: 1,
      event_id: 1,
      event_date: '2026-11-15',
      start_time: '09:00:00',
      end_time: '18:00:00',
      venue: 'Auditorium Hall B',
      created_at: '2026-10-24T00:00:00.000Z',
      updated_at: '2026-10-24T00:00:00.000Z',
    },
  ],
};

// Mock Pass Detail
const mockPassDetail = {
  pass: {
    pass_id: 1,
    registration_id: 1,
    payment_id: 1,
    pass_number: 'FEST-2026-CC1-001',
    qr_code: 'FESTCONNECT::PASS::REG1::EVENT1::TEAM1::PAY1::SIGtest',
    issued_at: '2026-10-24T12:00:00.000Z',
  },
  registration: {
    registration_id: 1,
    team_id: 1,
    team_name: 'CodeCrafters Alpha',
    leader_id: 1,
    event_id: 1,
    event_name: 'CodeCraft 24h Hackathon',
    event_type: 'Coding / Software',
    registration_fee: '400.00',
    registration_date: '2026-10-24T11:00:00.000Z',
    status: 'CONFIRMED',
  },
  payment: {
    payment_id: 1,
    amount: '400.00',
    payment_status: 'SUCCESS',
    payment_method: 'MOCK',
    transaction_id: 'TXN-MOCK-PASS-1001',
    payment_date: '2026-10-24T11:30:00.000Z',
  },
  members: [
    {
      participant_id: 1,
      first_name: 'Adwait',
      last_name: 'Kamble',
      email: 'adwait@festconnect.edu',
      role: 'LEADER',
    },
    {
      participant_id: 2,
      first_name: 'Shivam',
      last_name: 'Kasodekar',
      email: 'shivam@festconnect.edu',
      role: 'MEMBER',
    },
  ],
  schedules: [
    {
      schedule_id: 1,
      event_date: '2026-11-15',
      start_time: '09:00:00',
      end_time: '18:00:00',
      venue: 'Auditorium Hall B',
    },
  ],
  qr_data_url: 'data:image/png;base64,mockQrImageDataUrl',
};

const createMockResponse = (data: any, status = 200, ok = true) =>
  Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve({ success: ok, data }),
    text: () => Promise.resolve(JSON.stringify({ success: ok, data })),
  } as Response);

describe('Phase 08 — Dedicated React Screens & Dashboards', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      // CSRF token probe
      if (url.includes('/api/v1/auth/csrf')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ csrfToken: 'fake-csrf-token' }),
          text: () => Promise.resolve(JSON.stringify({ csrfToken: 'fake-csrf-token' })),
        });
      }

      // Health probe
      if (url.includes('/api/health')) {
        return createMockResponse({
          status: 'ok',
          uptime: 100,
          service: 'festconnect-api',
          version: '0.1.0',
          environment: 'development',
        });
      }

      // Auth /me
      if (url.includes('/api/v1/auth/me')) {
        return createMockResponse({ user: mockParticipantUser });
      }

      // Login
      if (url.includes('/api/v1/auth/login')) {
        return createMockResponse({ user: mockParticipantUser, csrfToken: 'fake-csrf-token' });
      }

      // Register
      if (url.includes('/api/v1/auth/register')) {
        return createMockResponse({ user: mockParticipantUser, csrfToken: 'fake-csrf-token' }, 201);
      }

      // Pass Verification
      if (url.includes('/api/v1/passes/verify')) {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        if (body.pass_number === 'FORGED-PASS' || body.qr_code?.includes('FORGERY')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({
              success: false,
              message: 'Invalid cryptographic QR signature',
              error: { code: 'INVALID_SIGNATURE', message: 'Invalid cryptographic QR signature' },
            }),
            text: () => Promise.resolve(JSON.stringify({
              success: false,
              message: 'Invalid cryptographic QR signature',
              error: { code: 'INVALID_SIGNATURE', message: 'Invalid cryptographic QR signature' },
            })),
          } as Response);
        }

        return createMockResponse({
          valid: true,
          pass: mockPassDetail.pass,
          event: {
            event_id: 1,
            event_name: 'CodeCraft 24h Hackathon',
            event_type: 'Coding / Software',
            registration_fee: '400.00',
          },
          team: {
            team_id: 1,
            team_name: 'CodeCrafters Alpha',
            leader_id: 1,
          },
          payment: mockPassDetail.payment,
          members: mockPassDetail.members,
          verified_at: new Date().toISOString(),
          message: 'Pass signature and entitlement verified successfully.',
        });
      }

      // Pass Details
      if (url.includes('/pass')) {
        return createMockResponse(mockPassDetail);
      }

      // Notifications Email Status
      if (url.includes('/notifications/email')) {
        return createMockResponse({
          registration_id: 1,
          status: 'DELIVERED',
          recipient: 'adwait@festconnect.edu',
          attempts: 1,
          last_sent_at: new Date().toISOString(),
          provider: 'console',
          preview_available: true,
          message: 'Delivered',
        });
      }

      // Single Event detail
      if (url.includes('/api/v1/events/1/schedules')) {
        return createMockResponse(mockEventDetail.schedules);
      }
      if (url.includes('/api/v1/events/1')) {
        return createMockResponse(mockEventDetail);
      }

      // Events list
      if (url.includes('/api/v1/events')) {
        return createMockResponse({
          events: [mockEventDetail],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        });
      }

      // Registrations list
      if (url.includes('/api/v1/registrations')) {
        return createMockResponse({
          registrations: [mockPassDetail.registration],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        });
      }

      // Teams list
      if (url.includes('/api/v1/teams')) {
        return createMockResponse([
          {
            team_id: 1,
            team_name: 'CodeCrafters Alpha',
            leader_id: 1,
            leader_name: 'Adwait Kamble',
            leader_email: 'adwait@festconnect.edu',
            status: 'REGISTERED',
            member_count: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }

      return createMockResponse({});
    });
  });

  // 1. Router & 404 Catch-All
  it('renders 404 Not Found screen when accessing an unknown route', async () => {
    render(<App initialPath="/non-existent-route-404" useMemoryRouter={true} />);

    await waitFor(() => {
      expect(screen.getByText(/404 — Screen Not Found/i)).toBeDefined();
      expect(screen.getByText(/Return to Overview/i)).toBeDefined();
    });
  });

  // 2. AuthScreen: Sign In and Create Account
  it('renders AuthScreen with tabs for Login and Sign Up with validation', async () => {
    const handleSuccess = vi.fn();
    render(<AuthScreen initialMode="login" onSuccess={handleSuccess} />);

    expect(screen.getAllByRole('button', { name: 'Sign In' })[0]).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeDefined();
    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();

    // Click quick login for student
    const studentBtn = screen.getByRole('button', { name: /Student/i });
    fireEvent.click(studentBtn);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(mockParticipantUser);
    });

    // Switch to Create Account tab
    const createTabBtn = screen.getByRole('button', { name: 'Create Account' });
    fireEvent.click(createTabBtn);

    expect(screen.getByLabelText(/First Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Last Name/i)).toBeDefined();
    expect(screen.getByLabelText(/University Email/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
  });

  // 3. EventDetailScreen: Full Event View, Schedule Timeline, and CTA
  it('renders EventDetailScreen with rules, schedules timeline, and coordinator card', async () => {
    render(<EventDetailScreen eventId={1} currentUser={mockParticipantUser} />);

    await waitFor(() => {
      expect(screen.getByText('CodeCraft 24h Hackathon')).toBeDefined();
      expect(screen.getByText('Coding / Software')).toBeDefined();
      expect(screen.getAllByText(/₹400.00/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Auditorium Hall B')).toBeDefined();
      expect(screen.getByText('Prof. Shalu Mahajan')).toBeDefined();
      expect(screen.getByRole('button', { name: /Register Team for Event/i })).toBeDefined();
    });
  });

  // 4. Coordinator Access Gate: Unauthenticated vs 403 Forbidden vs Authorized
  it('enforces 403 Forbidden on CoordinatorDashboard for participant role', async () => {
    render(<CoordinatorDashboard currentUser={mockParticipantUser} />);

    expect(screen.getByText(/403 Forbidden — Access Denied/i)).toBeDefined();
    expect(screen.getByText(/You are currently signed in as/i)).toBeDefined();
    expect(screen.getByText(/strictly restricted to authorized Event Coordinators/i)).toBeDefined();
  });

  it('renders CoordinatorDashboard when authenticated as coordinator or admin', async () => {
    const { unmount } = render(<CoordinatorDashboard currentUser={mockCoordinatorUser} />);

    await waitFor(() => {
      expect(screen.getByText('Coordinator Control Dashboard')).toBeDefined();
      expect(screen.getByText(/Coordinated Events/i)).toBeDefined();
      expect(screen.getByText(/Registrations & Passholders/i)).toBeDefined();
      expect(screen.getByText(/Gate Pass Verifier/i)).toBeDefined();
    });
    unmount();

    // Verify Admin can also access CoordinatorDashboard
    render(<CoordinatorDashboard currentUser={mockAdminUser} />);
    await waitFor(() => {
      expect(screen.getByText('Coordinator Control Dashboard')).toBeDefined();
    });
  });

  // 5. Gate Pass Verifier Tool: Valid vs Forgery
  it('verifies valid pass reference and displays approved attendee details', async () => {
    render(<CoordinatorDashboard currentUser={mockCoordinatorUser} />);

    // Switch to Gate Pass Verifier tab
    const verifierTab = screen.getByRole('button', { name: /Gate Pass Verifier/i });
    fireEvent.click(verifierTab);

    expect(screen.getByText(/Gate Pass Verification Scanner/i)).toBeDefined();

    const input = screen.getByLabelText(/Pass Number or QR Code String/i);
    fireEvent.change(input, { target: { value: 'FEST-2026-CC1-001' } });

    const verifyBtn = screen.getByRole('button', { name: /Verify Pass Status/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/VALID PASS — ENTRY APPROVED/i)).toBeDefined();
      expect(screen.getByText('CodeCrafters Alpha')).toBeDefined();
      expect(screen.getByText(/VERIFIED \(SUCCESS\)/i)).toBeDefined();
    });
  });

  it('rejects forged pass reference and displays red error banner', async () => {
    render(<CoordinatorDashboard currentUser={mockCoordinatorUser} />);

    const verifierTab = screen.getByRole('button', { name: /Gate Pass Verifier/i });
    fireEvent.click(verifierTab);

    const input = screen.getByLabelText(/Pass Number or QR Code String/i);
    fireEvent.change(input, { target: { value: 'FORGED-PASS' } });

    const verifyBtn = screen.getByRole('button', { name: /Verify Pass Status/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/PASS VERIFICATION REJECTED/i)).toBeDefined();
      expect(screen.getByText(/Invalid cryptographic QR signature/i)).toBeDefined();
    });
  });

  // 6. Participant Dashboard
  it('renders ParticipantDashboard with user highlights and registrations table', async () => {
    render(<ParticipantDashboard currentUser={mockParticipantUser} onNavigateTab={vi.fn()} />);

    expect(screen.getByText('Adwait Kamble')).toBeDefined();
    expect(screen.getByText('adwait@festconnect.edu')).toBeDefined();
    expect(screen.getByText('PARTICIPANT DASHBOARD')).toBeDefined();
    expect(screen.getByRole('button', { name: /Explore Events/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /My Teams/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('CodeCrafters Alpha')).toBeDefined();
    });
  });

  // 7. PassScreen: Direct Pass Display & Print
  it('renders PassScreen with official pass number, QR code data URL, and print action', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<PassScreen passId={1} />);

    await waitFor(() => {
      expect(screen.getByText('FEST-2026-CC1-001')).toBeDefined();
      expect(screen.getByText('CONFIRMED ENTRY')).toBeDefined();
      expect(screen.getByAltText('Pass QR Code FEST-2026-CC1-001')).toBeDefined();
      expect(screen.getByText(/TXN-MOCK-PASS-1001/)).toBeDefined();
      expect(screen.getByText('DELIVERED')).toBeDefined();
    });

    const printBtn = screen.getByRole('button', { name: /Print Pass/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  // 8. Check D: Coordinator Dashboard filters strictly to assigned events
  it('restricts CoordinatorDashboard events list to events matching coordinator_id', async () => {
    // Return two events: one belonging to coordinator 1, and one belonging to coordinator 2
    const otherEvent = {
      ...mockEventDetail,
      event_id: 99,
      event_name: 'Other Coordinator Robotics Challenge',
      coordinator_id: 99, // Different coordinator
    };

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/events')) {
        return createMockResponse({
          events: [mockEventDetail, otherEvent],
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        });
      }
      return originalFetch(url, init);
    });

    render(<CoordinatorDashboard currentUser={mockCoordinatorUser} />);

    await waitFor(() => {
      // Must display Event 1 (assigned to coordinator 1)
      expect(screen.getByText('CodeCraft 24h Hackathon')).toBeDefined();
      // Must NOT display Event 99 (assigned to coordinator 99)
      expect(screen.queryByText('Other Coordinator Robotics Challenge')).toBeNull();
    });
  });
});

