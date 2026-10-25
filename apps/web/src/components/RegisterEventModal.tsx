import React, { useEffect, useState } from 'react';
import { EventItem, AuthUser } from '../types/event.types.js';
import { TeamSummary } from '../types/team.types.js';
import { fetchTeams, registerTeamForEvent } from '../api/teams.api.js';

interface RegisterEventModalProps {
  event: EventItem;
  currentUser: AuthUser | null;
  onClose: () => void;
  onRegistered?: () => void;
}

export const RegisterEventModal: React.FC<RegisterEventModalProps> = ({
  event,
  currentUser,
  onClose,
  onRegistered,
}) => {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadUserTeams() {
      if (!currentUser) return;
      try {
        setLoading(true);
        const allTeams = await fetchTeams();
        // Filter teams where currentUser is leader (or all for admin)
        const eligibleTeams =
          currentUser.role === 'ADMIN'
            ? allTeams
            : allTeams.filter((t) => t.leader_id === currentUser.participant_id);

        setTeams(eligibleTeams);
        if (eligibleTeams.length > 0) {
          // Pre-select first eligible team if available
          const validTeam = eligibleTeams.find(
            (t) =>
              t.member_count >= event.min_team_size &&
              t.member_count <= event.max_team_size &&
              t.status !== 'DISBANDED'
          );
          if (validTeam) {
            setSelectedTeamId(validTeam.team_id);
          } else {
            setSelectedTeamId(eligibleTeams[0].team_id);
          }
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load user teams.');
      } finally {
        setLoading(false);
      }
    }

    loadUserTeams();
  }, [currentUser, event]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setError('Please select a team to register.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await registerTeamForEvent(selectedTeamId, event.event_id);
      setSuccess(true);
      if (onRegistered) {
        onRegistered();
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTeam = teams.find((t) => t.team_id === selectedTeamId);
  const isSizeTooSmall =
    selectedTeam && selectedTeam.member_count < event.min_team_size;
  const isSizeTooLarge =
    selectedTeam && selectedTeam.member_count > event.max_team_size;
  const isTeamDisbanded = selectedTeam && selectedTeam.status === 'DISBANDED';
  const isInvalid = isSizeTooSmall || isSizeTooLarge || isTeamDisbanded;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: '0 0 0.2rem 0' }}>Register Team for Event</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              {event.event_name}
            </p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>

        {success ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
            <h3 style={{ color: 'var(--color-primary-light)', margin: '0 0 0.5rem 0' }}>
              Registration Submitted!
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', margin: '0 0 1.5rem 0' }}>
              Team <strong>{selectedTeam?.team_name}</strong> is now registered in{' '}
              <span className="status-badge pending_payment">PENDING PAYMENT</span> status.
            </p>
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                  <span>{error}</span>
                </div>
              )}

              {/* Event Requirements Summary */}
              <div
                style={{
                  background: 'var(--color-surface-hover)',
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.2rem',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Required Team Size:</span>
                  <strong>
                    {event.min_team_size === event.max_team_size
                      ? `${event.min_team_size} members`
                      : `${event.min_team_size} – ${event.max_team_size} members`}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Registration Fee:</span>
                  <strong>
                    {parseFloat(event.registration_fee) === 0
                      ? 'Free'
                      : `₹${parseFloat(event.registration_fee).toFixed(2)}`}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Initial Status:</span>
                  <span className="status-badge pending_payment" style={{ fontSize: '0.75rem' }}>
                    PENDING PAYMENT
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading your teams...</p>
                </div>
              ) : teams.length === 0 ? (
                <div className="empty-state" style={{ padding: '1rem 0' }}>
                  <p style={{ color: 'var(--color-text-muted)', margin: '0 0 0.8rem 0' }}>
                    You do not lead any teams eligible to register for this event.
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Go to the <strong>Teams</strong> tab to create a squad first.
                  </p>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label" htmlFor="select_team">
                    Select Your Team:
                  </label>
                  <select
                    id="select_team"
                    className="form-input"
                    value={selectedTeamId || ''}
                    onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                    disabled={submitting}
                  >
                    {teams.map((t) => (
                      <option key={t.team_id} value={t.team_id}>
                        {t.team_name} ({t.member_count} member{t.member_count > 1 ? 's' : ''}) — {t.status}
                      </option>
                    ))}
                  </select>

                  {/* Dynamic validation hints */}
                  {isSizeTooSmall && (
                    <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                      ⚠️ Team has {selectedTeam?.member_count} members, but event requires at least{' '}
                      {event.min_team_size}. Add members in the Teams tab before registering.
                    </div>
                  )}

                  {isSizeTooLarge && (
                    <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                      ⚠️ Team has {selectedTeam?.member_count} members, which exceeds maximum allowed size of{' '}
                      {event.max_team_size}.
                    </div>
                  )}

                  {isTeamDisbanded && (
                    <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                      ⚠️ Disbanded teams cannot register for events.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="modal-footer"
              style={{
                borderTop: '1px solid var(--color-border)',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.6rem',
              }}
            >
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={submitting || !selectedTeamId || Boolean(isInvalid) || teams.length === 0}
              >
                {submitting ? 'Registering...' : 'Confirm Registration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
