import React, { useEffect, useState } from 'react';
import { TeamSummary, TeamDetail } from '../types/team.types.js';
import { AuthUser } from '../types/event.types.js';
import { fetchTeams, fetchTeamById, createTeam } from '../api/teams.api.js';
import { TeamDetailModal } from './TeamDetailModal.js';

interface TeamListProps {
  currentUser: AuthUser | null;
}

export const TeamList: React.FC<TeamListProps> = ({ currentUser }) => {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected team for details modal
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Create team modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadTeams = async () => {
    if (!currentUser) {
      setTeams([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchTeams();
      setTeams(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load teams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [currentUser]);

  const handleOpenDetails = async (teamId: number) => {
    setLoadingDetails(true);
    try {
      const details = await fetchTeamById(teamId);
      setSelectedTeam(details);
    } catch (err: any) {
      alert(`Could not load team details: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      setCreateError('Team name is required.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const created = await createTeam(newTeamName.trim());
      setNewTeamName('');
      setShowCreateModal(false);
      // Refresh teams list and immediately open details
      await loadTeams();
      setSelectedTeam(created);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create team.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">👥</div>
        <div className="empty-state-title">Authentication Required</div>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Please log in using one of the demo participant accounts in the header to view or manage your teams.
        </p>
      </div>
    );
  }

  return (
    <div className="team-container" style={{ padding: '1rem 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Team Management</h2>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            {currentUser.role === 'ADMIN'
              ? 'Administrator Overview: Managing all university event teams'
              : 'Collaborate with peers, form squads, and register for technical events'}
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          id="btn-create-team"
        >
          + Create New Team
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>{error}</span>
          <button className="btn btn-outline btn-xs" onClick={loadTeams} style={{ marginLeft: '1rem' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading teams...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛡️</div>
          <div className="empty-state-title">No Teams Found</div>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            You are not currently a member of any teams. Create a team to get started!
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="event-grid">
          {teams.map((t) => {
            const isUserLeader = Number(currentUser.participant_id) === Number(t.leader_id);

            return (
              <div
                key={t.team_id}
                className="event-card"
                onClick={() => handleOpenDetails(t.team_id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="event-card-header">
                  <span className={`status-badge ${t.status.toLowerCase()}`}>
                    {t.status}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {t.member_count} {t.member_count === 1 ? 'Member' : 'Members'}
                  </span>
                </div>

                <h3 className="event-title" style={{ fontSize: '1.15rem', marginTop: '0.5rem' }}>
                  {t.team_name}
                </h3>

                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.4rem 0' }}>
                  Leader: <strong>{t.leader_name}</strong> {isUserLeader && <span style={{ color: 'var(--color-primary-light)' }}>(You)</span>}
                </p>

                <div className="event-card-footer" style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid var(--color-border)' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ width: '100%' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetails(t.team_id);
                    }}
                    disabled={loadingDetails}
                  >
                    View Roster & Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Create New Team</h3>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {createError && (
                  <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                    <span>{createError}</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="team_name">Team Name</label>
                  <input
                    id="team_name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. CyberKnights Alpha"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    disabled={createSubmitting}
                    autoFocus
                  />
                  <small style={{ color: 'var(--color-text-muted)', marginTop: '0.3rem', display: 'block' }}>
                    You will automatically be registered as the canonical team leader.
                  </small>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', padding: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={createSubmitting || !newTeamName.trim()}
                >
                  {createSubmitting ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Details & Roster Modal */}
      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          currentUser={currentUser}
          onClose={() => setSelectedTeam(null)}
          onTeamUpdated={(updated) => {
            setSelectedTeam(updated);
            loadTeams();
          }}
        />
      )}
    </div>
  );
};
