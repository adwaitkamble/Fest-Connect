import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RegistrationList } from '../src/components/RegistrationList.js';
import { PassModal } from '../src/components/PassModal.js';
import { AuthUser } from '../src/types/event.types.js';
import { RegistrationDetail } from '../src/types/team.types.js';
import { PassDetailResponse } from '../src/types/pass.types.js';

const mockLeaderUser: AuthUser = {
  participant_id: 3,
  first_name: 'Adwait',
  last_name: 'Kamble',
  email: 'adwait@festconnect.edu',
  phone: '9876543212',
  college_name: 'PCCoE Autonomous',
  role: 'PARTICIPANT',
};

const mockConfirmedRegistration: RegistrationDetail = {
  registration_id: 1,
  team_id: 1,
  team_name: 'CodeCrafters Alpha',
  leader_id: 3,
  leader_name: 'Adwait Kamble',
  event_id: 1,
  event_name: 'CodeCraft 24h Hackathon',
  event_type: 'Coding / Software',
  registration_fee: '400.00',
  status: 'CONFIRMED',
  registration_date: '2026-10-24T10:00:00.000Z',
  created_at: '2026-10-24T10:00:00.000Z',
  updated_at: '2026-10-24T10:00:00.000Z',
};

const mockPendingRegistration: RegistrationDetail = {
  ...mockConfirmedRegistration,
  registration_id: 2,
  status: 'PENDING_PAYMENT',
};

const mockCancelledRegistration: RegistrationDetail = {
  ...mockConfirmedRegistration,
  registration_id: 3,
  status: 'CANCELLED',
};

const mockPassDetail: PassDetailResponse = {
  pass: {
    pass_id: 1,
    registration_id: 1,
    payment_id: 2,
    pass_number: 'FEST-2026-CC1-001',
    qr_code: 'FESTCONNECT::PASS::REG1::EVENT1::TEAM1::PAY2::SIG789ABC',
    issued_at: '2026-10-24T12:00:00.000Z',
  },
  registration: {
    registration_id: 1,
    team_id: 1,
    team_name: 'CodeCrafters Alpha',
    leader_id: 3,
    event_id: 1,
    event_name: 'CodeCraft 24h Hackathon',
    event_type: 'Coding / Software',
    registration_fee: '400.00',
    registration_date: '2026-10-24T10:00:00.000Z',
    status: 'CONFIRMED',
  },
  payment: {
    payment_id: 2,
    amount: '400.00',
    payment_status: 'SUCCESS',
    payment_method: 'MOCK',
    transaction_id: 'TXN-MOCK-PASS-1001',
    payment_date: '2026-10-24T11:00:00.000Z',
  },
  members: [
    {
      participant_id: 3,
      first_name: 'Adwait',
      last_name: 'Kamble',
      email: 'adwait@festconnect.edu',
      role: 'LEADER',
    },
    {
      participant_id: 4,
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
  qr_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQMAAACifLWRAAAABlBMVEX',
};

function createMockResponse(data: any, status = 200, ok = true) {
  return Promise.resolve({
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify({ success: ok, data })),
    json: () => Promise.resolve({ success: ok, data }),
  });
}

describe('Phase 07 — Frontend Digital Pass & QR Presentation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/auth/csrf')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ csrfToken: 'fake-csrf-token' }),
          text: () => Promise.resolve(JSON.stringify({ csrfToken: 'fake-csrf-token' })),
        });
      }

      if (url.includes('/notifications/email')) {
        return createMockResponse({
          registration_id: 1,
          status: 'DELIVERED',
          recipient: 'adwait@festconnect.edu',
          attempts: 1,
          last_sent_at: '2026-10-24T12:00:00.000Z',
          provider: 'console',
          preview_available: true,
          message: 'Email preview generated in server logs.',
        });
      }

      if (url.includes('/pass')) {
        return createMockResponse(mockPassDetail);
      }

      if (url.includes('/api/v1/registrations')) {
        return createMockResponse({
          registrations: [mockConfirmedRegistration],
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
        });
      }

      return createMockResponse({});
    });
  });

  it('renders "View Pass" button for CONFIRMED registrations in RegistrationList', async () => {
    render(<RegistrationList currentUser={mockLeaderUser} />);

    await waitFor(() => {
      expect(screen.getByText('CodeCraft 24h Hackathon')).toBeDefined();
      expect(screen.getByText('CONFIRMED')).toBeDefined();
    });

    const passButton = screen.getByRole('button', { name: /View Pass/i });
    expect(passButton).toBeDefined();
  });

  it('does NOT render "View Pass" button for PENDING_PAYMENT or CANCELLED registrations', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/registrations')) {
        return createMockResponse({
          registrations: [mockPendingRegistration, mockCancelledRegistration],
          pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
        });
      }
      return createMockResponse({});
    });

    render(<RegistrationList currentUser={mockLeaderUser} />);

    await waitFor(() => {
      expect(screen.getByText('PENDING PAYMENT')).toBeDefined();
      expect(screen.getByText('CANCELLED')).toBeDefined();
    });

    const passButtons = screen.queryAllByRole('button', { name: /View Pass/i });
    expect(passButtons.length).toBe(0);
  });

  it('opens PassModal and displays pass number, QR code image, and team details', async () => {
    render(<RegistrationList currentUser={mockLeaderUser} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /View Pass/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /View Pass/i }));

    await waitFor(() => {
      expect(screen.getByText('Official Digital Pass')).toBeDefined();
      expect(screen.getByText('ACTIVE ENTRY PASS')).toBeDefined();
      expect(screen.getByText('FEST-2026-CC1-001')).toBeDefined();
    });

    // Check QR code image
    const qrImg = screen.getByAltText(/Pass QR Code FEST-2026-CC1-001/i) as HTMLImageElement;
    expect(qrImg).toBeDefined();
    expect(qrImg.src).toContain('data:image/png;base64');

    // Check Venue and team info
    expect(screen.getByText('Auditorium Hall B')).toBeDefined();
    expect(screen.getAllByText(/Adwait Kamble/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Shivam Kasodekar/)).toBeDefined();
    expect(screen.getByText(/TXN-MOCK-PASS-1001/)).toBeDefined();
  });

  it('handles pass retrieval failure with a clear informative error state in PassModal', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/pass')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              success: false,
              error: { message: 'Pass requires verified SUCCESS payment.' },
            }),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                success: false,
                error: { message: 'Pass requires verified SUCCESS payment.' },
              })
            ),
        });
      }
      return createMockResponse({});
    });

    render(
      <PassModal
        registration={mockPendingRegistration}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Pass Unavailable:/i)).toBeDefined();
      expect(screen.getByText(/Pass requires verified SUCCESS payment/i)).toBeDefined();
    });
  });

  it('triggers window.print when Print Pass button is clicked', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <PassModal
        registration={mockConfirmedRegistration}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('FEST-2026-CC1-001')).toBeDefined();
    });

    const printButton = screen.getByRole('button', { name: /Print Pass/i });
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('displays backend-confirmed email delivery status in PassModal', async () => {
    render(
      <PassModal
        registration={mockConfirmedRegistration}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Email Delivery Status')).toBeDefined();
      expect(screen.getByText('DELIVERED')).toBeDefined();
      expect(screen.getByText('adwait@festconnect.edu')).toBeDefined();
    });
  });

  it('triggers email resend when Resend Email button is clicked', async () => {
    let emailSentRequested = false;
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/notifications/email') && init?.method === 'POST') {
        emailSentRequested = true;
        return createMockResponse({
          registration_id: 1,
          status: 'DELIVERED',
          recipient: 'adwait@festconnect.edu',
          attempts: 2,
          last_sent_at: '2026-10-24T12:05:00.000Z',
          provider: 'console',
          preview_available: true,
          message: 'Email notification dispatched successfully.',
        });
      }

      if (url.includes('/notifications/email')) {
        return createMockResponse({
          registration_id: 1,
          status: 'DELIVERED',
          recipient: 'adwait@festconnect.edu',
          attempts: 1,
          last_sent_at: '2026-10-24T12:00:00.000Z',
          provider: 'console',
          preview_available: true,
          message: 'Email preview generated in server logs.',
        });
      }

      if (url.includes('/pass')) {
        return createMockResponse(mockPassDetail);
      }

      return createMockResponse({});
    });

    render(
      <PassModal
        registration={mockConfirmedRegistration}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resend Email/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Resend Email/i }));

    await waitFor(() => {
      expect(emailSentRequested).toBe(true);
    });
  });
});
