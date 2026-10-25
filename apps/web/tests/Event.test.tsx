import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { EventList } from '../src/components/EventList.js';
import { AuthUser, EventListResponse, EventDetail } from '../src/types/event.types.js';

const mockEventsResponse: EventListResponse = {
  events: [
    {
      event_id: 1,
      coordinator_id: 1,
      coordinator_name: 'Prof. Shalu Mahajan',
      coordinator_email: 'coordinator@festconnect.edu',
      event_name: 'CodeCraft 24h Hackathon',
      event_type: 'Coding / Software',
      description: 'Flagship university 24-hour hackathon.',
      min_team_size: 2,
      max_team_size: 4,
      registration_fee: '400.00',
      status: 'UPCOMING',
      created_at: '2026-11-01T00:00:00.000Z',
      updated_at: '2026-11-01T00:00:00.000Z',
    },
    {
      event_id: 2,
      coordinator_id: 1,
      coordinator_name: 'Prof. Shalu Mahajan',
      coordinator_email: 'coordinator@festconnect.edu',
      event_name: 'RoboSumo Autonomous Arena',
      event_type: 'Robotics',
      description: 'Combat robotics challenge.',
      min_team_size: 1,
      max_team_size: 3,
      registration_fee: '300.00',
      status: 'UPCOMING',
      created_at: '2026-11-01T00:00:00.000Z',
      updated_at: '2026-11-01T00:00:00.000Z',
    },
  ],
  pagination: {
    page: 1,
    limit: 6,
    total: 2,
    totalPages: 1,
  },
};

const mockEventDetail: EventDetail = {
  ...mockEventsResponse.events[0],
  schedules: [
    {
      schedule_id: 1,
      event_id: 1,
      event_date: '2026-11-15',
      start_time: '09:00:00',
      end_time: '18:00:00',
      venue: 'Auditorium Hall B',
      created_at: '2026-11-01T00:00:00.000Z',
      updated_at: '2026-11-01T00:00:00.000Z',
    },
  ],
};

const coordinatorUser: AuthUser = {
  participant_id: 2,
  first_name: 'Shalu',
  last_name: 'Mahajan',
  email: 'coordinator@festconnect.edu',
  phone: '9876543211',
  college_name: 'PCCoE Autonomous',
  role: 'COORDINATOR',
  coordinator_id: 1,
};

const participantUser: AuthUser = {
  participant_id: 3,
  first_name: 'Adwait',
  last_name: 'Kamble',
  email: 'adwait@festconnect.edu',
  phone: '9876543212',
  college_name: 'PCCoE Autonomous',
  role: 'PARTICIPANT',
  coordinator_id: null,
};

describe('Phase 04 Frontend — Event Discovery and Management Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/events/1')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ success: true, data: mockEventDetail })),
        });
      }

      if (url.includes('/api/v1/events')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ success: true, data: mockEventsResponse })),
        });
      }

      if (url.includes('/api/v1/auth/csrf')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ csrfToken: 'fake-csrf-token' }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ success: true, data: {} })),
      });
    });
  });

  it('renders event list title, filters, and event cards successfully', async () => {
    render(<EventList currentUser={null} />);

    expect(screen.getByText('Fest Technical Events & Competitions')).toBeDefined();
    expect(screen.getByPlaceholderText(/Search by event name/i)).toBeDefined();

    // Verify loading spinner is present initially
    await waitFor(() => {
      expect(screen.getByText('CodeCraft 24h Hackathon')).toBeDefined();
      expect(screen.getByText('RoboSumo Autonomous Arena')).toBeDefined();
      expect(screen.getAllByText('Prof. Shalu Mahajan').length).toBe(2);
    });
  });

  it('displays empty state when backend returns 0 events', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/events')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                success: true,
                data: {
                  events: [],
                  pagination: { page: 1, limit: 6, total: 0, totalPages: 1 },
                },
              })
            ),
        });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
    });

    render(<EventList currentUser={null} />);

    await waitFor(() => {
      expect(screen.getByText('No Events Found')).toBeDefined();
      expect(
        screen.getByText(/There are no events matching your selected category/i)
      ).toBeDefined();
    });
  });

  it('displays error card with retry button on network failure', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/events')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' },
              })
            ),
        });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
    });

    render(<EventList currentUser={null} />);

    await waitFor(() => {
      expect(screen.getByText(/Database connection failed/i)).toBeDefined();
      expect(screen.getByText('Retry')).toBeDefined();
    });
  });

  it('opens EventDetailModal with schedule timeline when View Details is clicked', async () => {
    render(<EventList currentUser={null} />);

    await waitFor(() => {
      expect(screen.getByText('CodeCraft 24h Hackathon')).toBeDefined();
    });

    const detailButtons = screen.getAllByText('View Details & Schedule');
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('About the Event')).toBeDefined();
      expect(screen.getByText('Event Schedule & Venues')).toBeDefined();
      expect(screen.getByText('Auditorium Hall B')).toBeDefined();
      expect(screen.getByText(/09:00:00 – 18:00:00/)).toBeDefined();
    });

    // Close modal
    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('shows "+ Create New Event" button for coordinator but hides it for participant', async () => {
    // 1. Participant
    const { unmount } = render(<EventList currentUser={participantUser} />);
    await waitFor(() => {
      expect(screen.getByText('CodeCraft 24h Hackathon')).toBeDefined();
    });
    expect(screen.queryByText('+ Create New Event')).toBeNull();
    unmount();

    // 2. Coordinator
    render(<EventList currentUser={coordinatorUser} />);
    await waitFor(() => {
      expect(screen.getByText('+ Create New Event')).toBeDefined();
    });
  });

  it('shows "Edit" button only for events owned by the coordinator', async () => {
    render(<EventList currentUser={coordinatorUser} />);

    await waitFor(() => {
      expect(screen.getByText('CodeCraft 24h Hackathon')).toBeDefined();
    });

    // Both mock events have coordinator_id: 1, which matches coordinatorUser.coordinator_id
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBe(2);
  });
});
