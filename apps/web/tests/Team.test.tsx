import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TeamList } from '../src/components/TeamList.js';
import { TeamDetailModal } from '../src/components/TeamDetailModal.js';
import { RegisterEventModal } from '../src/components/RegisterEventModal.js';
import { RegistrationList } from '../src/components/RegistrationList.js';
import { AuthUser, EventItem } from '../src/types/event.types.js';
import { TeamSummary, TeamDetail, RegistrationDetail } from '../src/types/team.types.js';

const mockParticipantUser: AuthUser = {
  participant_id: 3,
  first_name: 'Adwait',
  last_name: 'Kamble',
  email: 'adwait@festconnect.edu',
  phone: '9876543212',
  college_name: 'PCCoE Autonomous',
  role: 'PARTICIPANT',
};

const mockTeams: TeamSummary[] = [
  {
    team_id: 1,
    team_name: 'CodeCrafters Alpha',
    leader_id: 3,
    leader_name: 'Adwait Kamble',
    leader_email: 'adwait@festconnect.edu',
    status: 'READY',
    member_count: 2,
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
  },
];

const mockTeamDetail: TeamDetail = {
  ...mockTeams[0],
  members: [
    {
      team_member_id: 1,
      team_id: 1,
      participant_id: 3,
      role: 'LEADER',
      first_name: 'Adwait',
      last_name: 'Kamble',
      email: 'adwait@festconnect.edu',
      college_name: 'PCCoE Autonomous',
    },
    {
      team_member_id: 2,
      team_id: 1,
      participant_id: 4,
      role: 'MEMBER',
      first_name: 'Shivam',
      last_name: 'Kasodekar',
      email: 'shivam@festconnect.edu',
      college_name: 'PCCoE Autonomous',
    },
  ],
  registrations: [
    {
      registration_id: 1,
      event_id: 1,
      event_name: 'CodeCraft 24h Hackathon',
      event_type: 'Coding / Software',
      registration_fee: '400.00',
      status: 'PENDING_PAYMENT',
      registration_date: '2026-11-02T00:00:00.000Z',
    },
  ],
};

const mockEvent: EventItem = {
  event_id: 1,
  coordinator_id: 1,
  coordinator_name: 'Prof. Shalu Mahajan',
  coordinator_email: 'coordinator@festconnect.edu',
  event_name: 'CodeCraft 24h Hackathon',
  event_type: 'Coding / Software',
  description: 'Flagship 24-hour hackathon',
  min_team_size: 2,
  max_team_size: 4,
  registration_fee: '400.00',
  status: 'UPCOMING',
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
};

const mockRegistrations: RegistrationDetail[] = [
  {
    registration_id: 1,
    team_id: 1,
    team_name: 'CodeCrafters Alpha',
    leader_id: 3,
    leader_name: 'Adwait Kamble',
    event_id: 1,
    event_name: 'CodeCraft 24h Hackathon',
    event_type: 'Coding / Software',
    registration_fee: '400.00',
    registration_date: '2026-11-02T00:00:00.000Z',
    status: 'PENDING_PAYMENT',
    created_at: '2026-11-02T00:00:00.000Z',
    updated_at: '2026-11-02T00:00:00.000Z',
  },
];

function createMockResponse(data: any) {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify({ success: true, data })),
    json: () => Promise.resolve(data),
  });
}

describe('Phase 05 — Team & Registration Frontend Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      const method = (options?.method || 'GET').toUpperCase();

      if (url.includes('/api/v1/auth/csrf')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ csrfToken: 'fake-csrf-token' }),
          text: () => Promise.resolve(JSON.stringify({ csrfToken: 'fake-csrf-token' })),
        });
      }

      if (url.includes('/api/v1/teams/1/members') && method === 'POST') {
        const updatedDetail: TeamDetail = {
          ...mockTeamDetail,
          member_count: 3,
          members: [
            ...mockTeamDetail.members,
            {
              team_member_id: 3,
              team_id: 1,
              participant_id: 5,
              role: 'MEMBER',
              first_name: 'Nikhil',
              last_name: 'Puppalwar',
              email: 'nikhil@festconnect.edu',
            },
          ],
        };
        return createMockResponse(updatedDetail);
      }

      if (url.includes('/api/v1/teams/1/members/2') && method === 'DELETE') {
        return createMockResponse({ success: true, message: 'Member removed' });
      }

      if (url.includes('/api/v1/teams/1')) {
        return createMockResponse(mockTeamDetail);
      }

      if (url.includes('/api/v1/teams') && method === 'POST') {
        return createMockResponse({
          ...mockTeamDetail,
          team_id: 2,
          team_name: 'Binary Beasts',
        });
      }

      if (url.includes('/api/v1/teams')) {
        return createMockResponse(mockTeams);
      }

      if (url.includes('/api/v1/registrations/1') && method === 'PATCH') {
        return createMockResponse({
          ...mockRegistrations[0],
          status: 'CANCELLED',
        });
      }

      if (url.includes('/api/v1/registrations') && method === 'POST') {
        return createMockResponse(mockRegistrations[0]);
      }

      if (url.includes('/api/v1/registrations')) {
        return createMockResponse({
          registrations: mockRegistrations,
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
        });
      }

      return createMockResponse({});
    });
  });

  // 1. TeamList Tests
  describe('TeamList', () => {
    it('renders list of user teams with status badges and member counts', async () => {
      render(<TeamList currentUser={mockParticipantUser} />);

      expect(screen.getByText(/Loading teams.../i)).toBeDefined();

      await waitFor(() => {
        expect(screen.getByText('CodeCrafters Alpha')).toBeDefined();
      });

      expect(screen.getByText('READY')).toBeDefined();
      expect(screen.getByText(/2 Members/i)).toBeDefined();
      expect(screen.getByText('+ Create New Team')).toBeDefined();
    });

    it('renders empty state when backend returns 0 teams', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/v1/teams')) {
          return createMockResponse([]);
        }
        return createMockResponse({});
      });

      render(<TeamList currentUser={mockParticipantUser} />);

      await waitFor(() => {
        expect(screen.getByText('No Teams Found')).toBeDefined();
      });
      expect(screen.getByText('Create Your First Team')).toBeDefined();
    });

    it('opens create team modal and creates a new team on submit', async () => {
      render(<TeamList currentUser={mockParticipantUser} />);

      await waitFor(() => {
        expect(screen.getByText('CodeCrafters Alpha')).toBeDefined();
      });

      fireEvent.click(screen.getByText('+ Create New Team'));

      expect(screen.getByText('Create New Team')).toBeDefined();
      const input = screen.getByLabelText(/Team Name/i);
      fireEvent.change(input, { target: { value: 'Binary Beasts' } });

      const submitBtn = screen.getByRole('button', { name: /^Create Team$/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Binary Beasts')).toBeDefined();
      });
    });
  });

  // 2. TeamDetailModal Tests
  describe('TeamDetailModal', () => {
    it('renders member roster and allows team leader to add member by email', async () => {
      const onUpdated = vi.fn();
      const onClose = vi.fn();

      render(
        <TeamDetailModal
          team={mockTeamDetail}
          currentUser={mockParticipantUser}
          onClose={onClose}
          onTeamUpdated={onUpdated}
        />
      );

      expect(screen.getByText('Team Members (2)')).toBeDefined();
      expect(screen.getAllByText('Adwait Kamble').length).toBe(2);
      expect(screen.getByText('Shivam Kasodekar')).toBeDefined();

      // Team leader can see Add Member form
      const emailInput = screen.getByPlaceholderText(/Enter participant email/i);
      fireEvent.change(emailInput, { target: { value: 'nikhil@festconnect.edu' } });

      const addBtn = screen.getByRole('button', { name: /Add Member/i });
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(onUpdated).toHaveBeenCalled();
        expect(screen.getByText('Member added successfully!')).toBeDefined();
      });
    });
  });

  // 3. RegisterEventModal Tests
  describe('RegisterEventModal', () => {
    it('renders team selector, checks eligibility, and confirms registration', async () => {
      const onClose = vi.fn();
      const onRegistered = vi.fn();

      render(
        <RegisterEventModal
          event={mockEvent}
          currentUser={mockParticipantUser}
          onClose={onClose}
          onRegistered={onRegistered}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Select Your Team:/i)).toBeDefined();
      });

      const confirmBtn = screen.getByRole('button', { name: /Confirm Registration/i });
      expect(confirmBtn.hasAttribute('disabled')).toBe(false);

      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText('Registration Submitted!')).toBeDefined();
      });
    });
  });

  // 4. RegistrationList Tests
  describe('RegistrationList', () => {
    it('renders registrations and provides cancellation button for leader', async () => {
      render(<RegistrationList currentUser={mockParticipantUser} />);

      await waitFor(() => {
        expect(screen.getByText('CodeCraft 24h Hackathon')).toBeDefined();
      });

      expect(screen.getByText('CodeCrafters Alpha')).toBeDefined();
      expect(screen.getByText('PENDING PAYMENT')).toBeDefined();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDefined();
    });
  });
});
