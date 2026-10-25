import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RegistrationList } from '../src/components/RegistrationList.js';
import { PaymentModal } from '../src/components/PaymentModal.js';
import { AuthUser } from '../src/types/event.types.js';
import { RegistrationDetail } from '../src/types/team.types.js';
import { PaymentRecord } from '../src/types/payment.types.js';

const mockLeaderUser: AuthUser = {
  participant_id: 3,
  first_name: 'Adwait',
  last_name: 'Kamble',
  email: 'adwait@festconnect.edu',
  phone: '9876543212',
  college_name: 'PCCoE Autonomous',
  role: 'PARTICIPANT',
};

const mockPendingRegistration: RegistrationDetail = {
  registration_id: 101,
  team_id: 1,
  team_name: 'CodeCrafters Alpha',
  leader_id: 3,
  leader_name: 'Adwait Kamble',
  event_id: 2,
  event_name: 'Autonomous Robotics Challenge',
  event_type: 'ROBOTICS',
  registration_fee: '250.00',
  status: 'PENDING_PAYMENT',
  registration_date: '2026-11-01T10:00:00.000Z',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-01T10:00:00.000Z',
};

const mockConfirmedRegistration: RegistrationDetail = {
  ...mockPendingRegistration,
  registration_id: 102,
  status: 'CONFIRMED',
};

const mockCancelledRegistration: RegistrationDetail = {
  ...mockPendingRegistration,
  registration_id: 103,
  status: 'CANCELLED',
};

const mockSuccessPayment: PaymentRecord = {
  payment_id: 55,
  registration_id: 101,
  attempt_number: 1,
  amount: '250.00',
  currency: 'INR',
  payment_status: 'SUCCESS',
  payment_method: 'MOCK',
  transaction_id: 'MOCK-SUCC-20261023-AABB',
  payment_date: '2026-10-23T12:00:00.000Z',
  created_at: '2026-10-23T12:00:00.000Z',
  updated_at: '2026-10-23T12:00:00.000Z',
  team_id: 1,
  team_name: 'CodeCrafters Alpha',
  leader_id: 3,
  leader_name: 'Adwait Kamble',
  event_id: 2,
  event_name: 'Autonomous Robotics Challenge',
  registration_status: 'CONFIRMED',
};

const mockFailedPayment: PaymentRecord = {
  payment_id: 56,
  registration_id: 101,
  attempt_number: 1,
  amount: '250.00',
  currency: 'INR',
  payment_status: 'FAILED',
  payment_method: 'MOCK',
  transaction_id: 'MOCK-FAIL-20261023-CCDD',
  payment_date: '2026-10-23T12:00:00.000Z',
  created_at: '2026-10-23T12:00:00.000Z',
  updated_at: '2026-10-23T12:00:00.000Z',
  team_id: 1,
  team_name: 'CodeCrafters Alpha',
  leader_id: 3,
  leader_name: 'Adwait Kamble',
  event_id: 2,
  event_name: 'Autonomous Robotics Challenge',
  registration_status: 'PENDING_PAYMENT',
};

function createMockResponse(data: any) {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify({ success: true, data })),
    json: () => Promise.resolve({ success: true, data }),
  });
}

describe('Phase 06 — Frontend Payment Experience Suite', () => {
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

      if (url.includes('/api/v1/registrations') && !url.includes('/payments')) {
        return createMockResponse({
          registrations: [mockPendingRegistration],
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
        });
      }

      if (url.includes('/payments')) {
        return createMockResponse(mockSuccessPayment);
      }

      return createMockResponse({});
    });
  });

  it('renders "Pay Now" action for PENDING_PAYMENT registration when user is team leader', async () => {
    render(<RegistrationList currentUser={mockLeaderUser} />);

    await waitFor(() => {
      expect(screen.getByText('Autonomous Robotics Challenge')).toBeDefined();
      expect(screen.getByText('PENDING PAYMENT')).toBeDefined();
    });

    const payButton = screen.getByRole('button', { name: /Pay Now/i });
    expect(payButton).toBeDefined();
  });

  it('does NOT render "Pay Now" button for CONFIRMED or CANCELLED registrations', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/registrations')) {
        return createMockResponse({
          registrations: [mockConfirmedRegistration, mockCancelledRegistration],
          pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
        });
      }
      return createMockResponse({});
    });

    render(<RegistrationList currentUser={mockLeaderUser} />);

    await waitFor(() => {
      expect(screen.getByText('CONFIRMED')).toBeDefined();
      expect(screen.getByText('CANCELLED')).toBeDefined();
    });

    expect(screen.queryByRole('button', { name: /Pay Now/i })).toBeNull();
  });

  it('PaymentModal renders event details, amount due, and Demo Notice banner', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <PaymentModal
        registration={mockPendingRegistration}
        onClose={handleClose}
        onPaymentSuccess={handleSuccess}
      />
    );

    expect(screen.getByText('Event Fee Payment')).toBeDefined();
    expect(screen.getByText('Demo Payment — No Real Money Charged')).toBeDefined();
    expect(screen.getByText('Autonomous Robotics Challenge')).toBeDefined();
    expect(screen.getByText('CodeCrafters Alpha')).toBeDefined();
    expect(screen.getByText('₹250.00')).toBeDefined();
    expect(screen.getByRole('button', { name: /Pay ₹250.00/i })).toBeDefined();
  });

  it('PaymentModal submits payment and displays success feedback', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <PaymentModal
        registration={mockPendingRegistration}
        onClose={handleClose}
        onPaymentSuccess={handleSuccess}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Pay ₹250.00/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Payment Succeeded!/i)).toBeDefined();
      expect(screen.getByText('MOCK-SUCC-20261023-AABB')).toBeDefined();
      expect(screen.getByText(/Registration is now CONFIRMED/i)).toBeDefined();
    });

    expect(handleSuccess).toHaveBeenCalledWith(mockSuccessPayment);
  });

  it('PaymentModal handles simulated failure and displays retry action', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/auth/csrf')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ csrfToken: 'fake-csrf-token' }),
          text: () => Promise.resolve(JSON.stringify({ csrfToken: 'fake-csrf-token' })),
        });
      }
      if (url.includes('/payments')) {
        return createMockResponse(mockFailedPayment);
      }
      return createMockResponse({});
    });

    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <PaymentModal
        registration={mockPendingRegistration}
        onClose={handleClose}
        onPaymentSuccess={handleSuccess}
      />
    );

    // Select FAILED radio option
    const failedRadio = screen.getByLabelText(/FAILED/i);
    fireEvent.click(failedRadio);

    const submitBtn = screen.getByRole('button', { name: /Pay ₹250.00/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/MOCK-FAIL-20261023-CCDD/)).toBeDefined();
    });

    // Verify retry button is rendered
    expect(screen.getByRole('button', { name: /Retry Payment/i })).toBeDefined();
    expect(handleSuccess).not.toHaveBeenCalled();
  });
});
