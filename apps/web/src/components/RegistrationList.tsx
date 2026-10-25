import React, { useEffect, useState } from 'react';
import { RegistrationDetail } from '../types/team.types.js';
import { AuthUser } from '../types/event.types.js';
import { fetchRegistrations, cancelRegistration } from '../api/teams.api.js';
import { PaymentModal } from './PaymentModal.js';
import { PassModal } from './PassModal.js';

interface RegistrationListProps {
  currentUser: AuthUser | null;
}

export const RegistrationList: React.FC<RegistrationListProps> = ({ currentUser }) => {
  const [registrations, setRegistrations] = useState<RegistrationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const [selectedPaymentReg, setSelectedPaymentReg] = useState<RegistrationDetail | null>(null);
  const [selectedPassReg, setSelectedPassReg] = useState<RegistrationDetail | null>(null);

  const loadRegistrations = async () => {
    if (!currentUser) {
      setRegistrations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchRegistrations({
        status: statusFilter || undefined,
        limit: 50,
      });
      const regList = Array.isArray(res) ? res : (res?.registrations || []);
      setRegistrations(regList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load registrations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, [currentUser, statusFilter]);

  const handleCancel = async (reg: RegistrationDetail) => {
    if (
      !window.confirm(
        `Are you sure you want to cancel the registration of '${reg.team_name}' for '${reg.event_name}'?`
      )
    ) {
      return;
    }

    setActionInProgress(reg.registration_id);
    try {
      await cancelRegistration(reg.registration_id);
      await loadRegistrations();
    } catch (err: any) {
      alert(`Cancellation failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-title">Authentication Required</div>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Please log in using one of the demo participant accounts in the header to view your registrations.
        </p>
      </div>
    );
  }

  return (
    <div className="registration-container" style={{ padding: '1rem 0' }}>
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
          <h2 style={{ margin: 0 }}>Event Registrations</h2>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            {currentUser.role === 'ADMIN'
              ? 'Administrator Overview: All university event registrations'
              : currentUser.role === 'COORDINATOR'
              ? 'Coordinator Overview: Registrations for your coordinated events'
              : 'Track registration and payment status for your team entries'}
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Status:
          </label>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>{error}</span>
          <button
            className="btn btn-outline btn-xs"
            onClick={loadRegistrations}
            style={{ marginLeft: '1rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading registrations...</p>
        </div>
      ) : registrations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎟️</div>
          <div className="empty-state-title">No Registrations Found</div>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            {statusFilter
              ? `No registrations found with status '${statusFilter}'.`
              : 'You have not registered any teams for events yet. Browse the Events tab to register!'}
          </p>
        </div>
      ) : (
        <div className="table-responsive" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Registration ID</th>
                <th>Event</th>
                <th>Team</th>
                <th>Leader</th>
                <th>Fee</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => {
                const canCancel =
                  reg.status !== 'CANCELLED' &&
                  (currentUser.role === 'ADMIN' || reg.leader_id === currentUser.participant_id);

                return (
                  <tr key={reg.registration_id}>
                    <td>
                      <code>#{reg.registration_id}</code>
                    </td>
                    <td>
                      <strong>{reg.event_name}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {reg.event_type}
                      </div>
                    </td>
                    <td>{reg.team_name}</td>
                    <td>{reg.leader_name}</td>
                    <td>
                      {parseFloat(reg.registration_fee) === 0
                        ? 'Free'
                        : `₹${parseFloat(reg.registration_fee).toFixed(2)}`}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {new Date(reg.registration_date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`status-badge ${reg.status.toLowerCase()}`}>
                        {reg.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {reg.status === 'PENDING_PAYMENT' && (currentUser.role === 'ADMIN' || reg.leader_id === currentUser.participant_id) && (
                        <button
                          className="btn btn-primary btn-xs"
                          style={{ marginRight: '0.4rem' }}
                          onClick={() => setSelectedPaymentReg(reg)}
                        >
                          Pay Now
                        </button>
                      )}
                      {canCancel && (
                        <button
                          className="btn btn-danger btn-xs"
                          disabled={actionInProgress === reg.registration_id}
                          onClick={() => handleCancel(reg)}
                        >
                          {actionInProgress === reg.registration_id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                      {reg.status === 'CANCELLED' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          Inactive
                        </span>
                      )}
                      {reg.status === 'CONFIRMED' && (
                        <button
                          className="btn btn-primary btn-xs"
                          style={{
                            marginRight: '0.4rem',
                            backgroundColor: 'var(--color-success, #10b981)',
                            borderColor: 'var(--color-success, #10b981)',
                          }}
                          onClick={() => setSelectedPassReg(reg)}
                        >
                          🎟️ View Pass
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedPaymentReg && (
        <PaymentModal
          registration={selectedPaymentReg}
          onClose={() => setSelectedPaymentReg(null)}
          onPaymentSuccess={() => {
            loadRegistrations();
          }}
        />
      )}

      {selectedPassReg && (
        <PassModal
          registration={selectedPassReg}
          onClose={() => setSelectedPassReg(null)}
        />
      )}
    </div>
  );
};

