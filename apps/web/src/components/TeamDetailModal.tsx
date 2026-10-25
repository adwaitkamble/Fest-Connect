import React, { useState } from 'react';
import { TeamDetail, TeamMember } from '../types/team.types.js';
import { AuthUser } from '../types/event.types.js';
import { addTeamMember, removeTeamMember } from '../api/teams.api.js';

interface TeamDetailModalProps {
  team: TeamDetail;
  currentUser: AuthUser | null;
  onClose: () => void;
  onTeamUpdated: (updated: TeamDetail) => void;
}

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({
  team,
  currentUser,
  onClose,
  onTeamUpdated,
}) => {
  const [memberEmail, setMemberEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isLeader = Number(currentUser?.participant_id) === Number(team.leader_id);
  const isAdmin = currentUser?.role === 'ADMIN';
  const canManageMembers = isLeader || isAdmin;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      setActionError('Please enter a participant email address.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setSuccessMsg(null);

    try {
      const updated = await addTeamMember(team.team_id, { email: memberEmail.trim() });
      setMemberEmail('');
      setSuccessMsg('Member added successfully!');
      onTeamUpdated(updated);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to add member to team.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    const isSelf = member.participant_id === currentUser?.participant_id;
    const confirmMsg = isSelf
      ? 'Are you sure you want to leave this team?'
      : `Are you sure you want to remove ${member.first_name} ${member.last_name} from the team?`;

    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    setActionError(null);
    setSuccessMsg(null);

    try {
      await removeTeamMember(team.team_id, member.participant_id);
      // Update local team state
      const updatedMembers = team.members.filter(
        (m) => m.participant_id !== member.participant_id
      );
      const updatedTeam: TeamDetail = {
        ...team,
        member_count: updatedMembers.length,
        members: updatedMembers,
      };
      setSuccessMsg(isSelf ? 'You have left the team.' : 'Member removed successfully.');
      onTeamUpdated(updatedTeam);
      if (isSelf && !isAdmin) {
        onClose();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to remove member.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card modal-large"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '750px', width: '90%' }}
      >
        <div className="modal-header">
          <div>
            <span className={`status-badge ${team.status.toLowerCase()}`}>
              {team.status}
            </span>
            <h2 style={{ marginTop: '0.4rem', marginBottom: '0.2rem' }}>{team.team_name}</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Led by: <strong>{team.leader_name}</strong> ({team.leader_email})
            </p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {actionError && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <span>{actionError}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Member Roster Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Team Members ({team.member_count})</h3>
            </div>

            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Email</th>
                    <th>College</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((member) => {
                    const isMemberLeader = member.role === 'LEADER';
                    const isSelf = member.participant_id === currentUser?.participant_id;
                    const canRemove =
                      !isMemberLeader && (canManageMembers || isSelf);

                    return (
                      <tr key={member.team_member_id}>
                        <td>
                          <strong>{member.first_name} {member.last_name}</strong>
                          {isSelf && <span style={{ marginLeft: '0.4rem', color: 'var(--color-primary-light)', fontSize: '0.75rem' }}>(You)</span>}
                        </td>
                        <td>{member.email}</td>
                        <td>{member.college_name || '—'}</td>
                        <td>
                          <span className={`role-tag ${member.role.toLowerCase()}`}>
                            {member.role}
                          </span>
                        </td>
                        <td>
                          {canRemove && (
                            <button
                              className="btn btn-danger btn-xs"
                              disabled={submitting}
                              onClick={() => handleRemoveMember(member)}
                            >
                              {isSelf ? 'Leave' : 'Remove'}
                            </button>
                          )}
                          {isMemberLeader && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              Leader
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Member Form (Visible only for leader or admin) */}
          {canManageMembers && team.status !== 'DISBANDED' && (
            <div style={{ padding: '1rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.95rem' }}>Add Team Member</h4>
              <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '0.6rem' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Enter participant email (e.g. shivam@festconnect.edu)"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  disabled={submitting}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting || !memberEmail.trim()}
                >
                  {submitting ? 'Adding...' : 'Add Member'}
                </button>
              </form>
            </div>
          )}

          {/* Registered Events Section */}
          <div>
            <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1.1rem' }}>Registered Events</h3>
            {team.registrations && team.registrations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {team.registrations.map((reg) => (
                  <div
                    key={reg.registration_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.8rem',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{reg.event_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {reg.event_type} • Fee: ₹{parseFloat(reg.registration_fee).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className={`status-badge ${reg.status.toLowerCase()}`}>
                        {reg.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
                This team has not registered for any events yet.
              </p>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', padding: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
