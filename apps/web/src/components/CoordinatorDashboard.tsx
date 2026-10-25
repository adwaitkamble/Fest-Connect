import React, { useEffect, useState } from 'react';
import { AuthUser, EventItem } from '../types/event.types.js';
import { RegistrationDetail } from '../types/team.types.js';
import { VerifyPassResponse } from '../types/pass.types.js';
import { fetchEvents } from '../api/events.api.js';
import { fetchRegistrations } from '../api/teams.api.js';
import { verifyPass } from '../api/passes.api.js';
import { EventFormModal } from './EventFormModal.js';
import { ScheduleFormModal } from './ScheduleFormModal.js';
import { PassModal } from './PassModal.js';
import { isDemoMode } from '../utils/env.utils.js';

export interface CoordinatorDashboardProps {
  currentUser: AuthUser | null;
  onSwitchDemoRole?: (email: string) => void;
  onSelectEvent?: (eventId: number) => void;
}

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  currentUser,
  onSwitchDemoRole,
  onSelectEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'registrations' | 'verifier'>('events');

  // Coordinated Events
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Registrations
  const [registrations, setRegistrations] = useState<RegistrationDetail[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [regFilter, setRegFilter] = useState<string>('');
  const [registrationsError, setRegistrationsError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<EventItem | null>(null);
  const [selectedEventForSchedule, setSelectedEventForSchedule] = useState<number | null>(null);
  const [selectedPassReg, setSelectedPassReg] = useState<RegistrationDetail | null>(null);

  // Pass Verification Tool
  const [passQuery, setPassQuery] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyPassResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Load Events
  const loadEvents = async () => {
    if (!currentUser || (currentUser.role !== 'COORDINATOR' && currentUser.role !== 'ADMIN')) {
      return;
    }
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const res = await fetchEvents({ limit: 100 });
      const allEvents = res.events || [];
      const assignedEvents =
        currentUser.role === 'ADMIN'
          ? allEvents
          : allEvents.filter((ev) => ev.coordinator_id === currentUser.coordinator_id);
      setEvents(assignedEvents);
    } catch (err: any) {
      setEventsError(err?.message || 'Failed to load coordinator events.');
    } finally {
      setLoadingEvents(false);
    }
  };

  // Load Registrations
  const loadRegistrations = async () => {
    if (!currentUser || (currentUser.role !== 'COORDINATOR' && currentUser.role !== 'ADMIN')) {
      return;
    }
    setLoadingRegistrations(true);
    setRegistrationsError(null);
    try {
      const res = await fetchRegistrations({
        status: regFilter || undefined,
        limit: 100,
      });
      const list = Array.isArray(res) ? res : res.registrations || [];
      setRegistrations(list);
    } catch (err: any) {
      setRegistrationsError(err?.message || 'Failed to load event registrations.');
    } finally {
      setLoadingRegistrations(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'COORDINATOR' || currentUser?.role === 'ADMIN') {
      loadEvents();
      loadRegistrations();
    }
  }, [currentUser, regFilter]);

  // Handle Pass Verification
  const handleVerifyPass = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = passQuery.trim();
    if (!query) {
      setVerifyError('Please enter a pass number or paste a QR code string.');
      setVerifyResult(null);
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const reqPayload = query.startsWith('FESTCONNECT::PASS::')
        ? { qr_code: query }
        : { pass_number: query };

      const res = await verifyPass(reqPayload);
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyError(err?.message || 'Verification failed. Pass may be invalid or unauthorized.');
    } finally {
      setVerifying(false);
    }
  };

  // 1. Unauthenticated State
  if (!currentUser) {
    return (
      <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="empty-state-icon" style={{ fontSize: '3rem' }}>🔒</div>
        <div className="empty-state-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.5rem 0' }}>
          Coordinator Sign-In Required
        </div>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
          The Coordinator Dashboard is restricted to authorized faculty event coordinators and administrators.
        </p>
        {isDemoMode && onSwitchDemoRole && (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onSwitchDemoRole('coordinator@festconnect.edu')}
            >
              Sign In as Coordinator (Prof. Shalu Mahajan)
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onSwitchDemoRole('admin@festconnect.edu')}
            >
              Sign In as Administrator
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. 403 Forbidden State (Participant trying to access coordinator dashboard)
  if (currentUser.role !== 'COORDINATOR' && currentUser.role !== 'ADMIN') {
    return (
      <div
        className="card error-card"
        role="alert"
        style={{
          maxWidth: '650px',
          margin: '2rem auto',
          padding: '2.5rem',
          textAlign: 'center',
          border: '1px solid var(--color-danger, #dc2626)',
          borderRadius: 'var(--radius-lg, 12px)',
          background: 'var(--color-bg-card, #ffffff)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🚫</div>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--color-danger, #dc2626)', marginBottom: '0.75rem', fontWeight: 700 }}>
          403 Forbidden &mdash; Access Denied
        </h2>
        <p style={{ color: 'var(--color-text-main)', marginBottom: '1rem', lineHeight: 1.5 }}>
          You are currently signed in as <strong>{currentUser.first_name} {currentUser.last_name}</strong> with role{' '}
          <span className="role-tag participant" style={{ fontWeight: 600 }}>
            {currentUser.role}
          </span>
          .
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          This screen is strictly restricted to authorized Event Coordinators and System Administrators.
          Backend permission checks will reject mutative operations for participant accounts.
        </p>

        {isDemoMode && onSwitchDemoRole && (
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              Switch to an authorized role for demonstration:
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onSwitchDemoRole('coordinator@festconnect.edu')}
              >
                📋 Switch to Coordinator
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onSwitchDemoRole('admin@festconnect.edu')}
              >
                ⚙️ Switch to Admin
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Authorized Coordinator View
  return (
    <div className="coordinator-dashboard" style={{ padding: '0.5rem 0' }}>
      {/* Dashboard Header */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
          color: '#ffffff',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '1.75rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {currentUser.role} CONSOLE
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.2rem 0', color: '#ffffff' }}>
              Coordinator Control Dashboard
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              Welcome back, <strong>{currentUser.first_name} {currentUser.last_name}</strong> ({currentUser.email})
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              className="btn btn-sm"
              style={{ background: '#ffffff', color: '#065f46', fontWeight: 600 }}
              onClick={() => setShowCreateModal(true)}
            >
              + Create New Event
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Events Coordinated</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{events.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Total Registrations</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{registrations.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Confirmed Entries</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {registrations.filter((r) => r.status === 'CONFIRMED').length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Pending Payments</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {registrations.filter((r) => r.status === 'PENDING_PAYMENT').length}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '1.5rem',
        }}
      >
        <button
          className={`btn-tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'events' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'events' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 600,
            fontSize: '0.95rem',
            padding: '0.6rem 1rem',
            cursor: 'pointer',
          }}
        >
          📁 Coordinated Events ({events.length})
        </button>
        <button
          className={`btn-tab ${activeTab === 'registrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrations')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'registrations' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'registrations' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 600,
            fontSize: '0.95rem',
            padding: '0.6rem 1rem',
            cursor: 'pointer',
          }}
        >
          📋 Registrations & Passholders ({registrations.length})
        </button>
        <button
          className={`btn-tab ${activeTab === 'verifier' ? 'active' : ''}`}
          onClick={() => setActiveTab('verifier')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'verifier' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'verifier' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 600,
            fontSize: '0.95rem',
            padding: '0.6rem 1rem',
            cursor: 'pointer',
          }}
        >
          🔍 Gate Pass Verifier
        </button>
      </div>

      {/* TAB 1: Coordinated Events */}
      {activeTab === 'events' && (
        <div>
          {eventsError && (
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
              <span>{eventsError}</span>
              <button className="btn btn-outline btn-xs" onClick={loadEvents} style={{ marginLeft: '1rem' }}>
                Retry
              </button>
            </div>
          )}

          {loadingEvents ? (
            <div className="loading-spinner" style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p>Loading your coordinated events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>📂</div>
              <div className="empty-state-title" style={{ fontWeight: 600, margin: '0.5rem 0' }}>
                No Events Assigned Yet
              </div>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                You have not created or been assigned any fest events. Click below to create your first event.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                + Create Event
              </button>
            </div>
          ) : (
            <div className="table-responsive" style={{ background: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Name & Category</th>
                    <th>Team Size</th>
                    <th>Fee</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th>Coordinator Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.event_id}>
                      <td><code>#{ev.event_id}</code></td>
                      <td>
                        <strong>{ev.event_name}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          {ev.event_type}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {ev.min_team_size} – {ev.max_team_size}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {parseFloat(ev.registration_fee) === 0 ? 'Free' : `₹${parseFloat(ev.registration_fee).toFixed(2)}`}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(ev.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`status-badge ${ev.status.toLowerCase()}`}>
                          {ev.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => setSelectedEventForEdit(ev)}
                            title="Update event title, dates, or capacity"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => setSelectedEventForSchedule(ev.event_id)}
                            title="Add/update schedules for this event"
                          >
                            📅 Schedule
                          </button>
                          {onSelectEvent && (
                            <button
                              className="btn btn-primary btn-xs"
                              onClick={() => onSelectEvent(ev.event_id)}
                              title="View event details page"
                            >
                              View &rarr;
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Registrations & Passholders */}
      {activeTab === 'registrations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Server-gated to registrations for events coordinated by your account.
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Filter:</label>
              <select
                className="form-input"
                value={regFilter}
                onChange={(e) => setRegFilter(e.target.value)}
                style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}
              >
                <option value="">All Statuses</option>
                <option value="CONFIRMED">Confirmed (Eligible for Pass)</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {registrationsError && (
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
              <span>{registrationsError}</span>
              <button className="btn btn-outline btn-xs" onClick={loadRegistrations} style={{ marginLeft: '1rem' }}>
                Retry
              </button>
            </div>
          )}

          {loadingRegistrations ? (
            <div className="loading-spinner" style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p>Loading registrations...</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>🎟️</div>
              <div className="empty-state-title" style={{ fontWeight: 600, margin: '0.5rem 0' }}>
                No Registrations Found
              </div>
              <p style={{ color: 'var(--color-text-muted)' }}>
                {regFilter
                  ? `No registrations found matching '${regFilter}'.`
                  : 'No teams have registered for your coordinated events yet.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive" style={{ background: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Reg ID</th>
                    <th>Event</th>
                    <th>Team</th>
                    <th>Leader</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th>Pass Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.registration_id}>
                      <td><code>#{reg.registration_id}</code></td>
                      <td>
                        <strong>{reg.event_name}</strong>
                      </td>
                      <td>{reg.team_name}</td>
                      <td>
                        {reg.leader_name}
                      </td>
                      <td>
                        {parseFloat(reg.registration_fee) === 0 ? 'Free' : `₹${parseFloat(reg.registration_fee).toFixed(2)}`}
                      </td>
                      <td>
                        <span className={`status-badge ${reg.status.toLowerCase()}`}>
                          {reg.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {reg.status === 'CONFIRMED' ? (
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => setSelectedPassReg(reg)}
                          >
                            🎟️ Inspect Pass
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            No Pass (Unpaid)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Gate Pass Verifier Tool */}
      {activeTab === 'verifier' && (
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div
            className="card"
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--color-border)',
              padding: '2rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Gate Pass Verification Scanner
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Enter an official Pass Number (e.g. <code>FEST-2026-CC1-001</code>) or paste an encoded QR Code token.
              The backend will verify cryptographic signatures and assert coordinator event permissions.
            </p>

            <form onSubmit={handleVerifyPass}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="pass-query-input"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}
                >
                  Pass Number or QR Code String <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  id="pass-query-input"
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '0.7rem 0.9rem', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  placeholder="e.g. FEST-2026-CC1-001 or FESTCONNECT::PASS::..."
                  value={passQuery}
                  onChange={(e) => setPassQuery(e.target.value)}
                  disabled={verifying}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.7rem', fontWeight: 600 }}
                  disabled={verifying}
                >
                  {verifying ? 'Verifying with Server...' : '🔍 Verify Pass Status'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setPassQuery('FEST-2026-CC1-001');
                  }}
                  disabled={verifying}
                  title="Paste demo seeded pass number"
                >
                  Paste Demo Pass
                </button>
              </div>
            </form>

            {/* Verification Result Display */}
            {verifyResult && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1.25rem',
                  background: 'var(--color-success-light, #dcfce7)',
                  border: '1px solid #86efac',
                  borderRadius: 'var(--radius-md, 8px)',
                  color: 'var(--color-text-main)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>✅</span>
                  <div>
                    <strong style={{ color: 'var(--color-success, #16a34a)', fontSize: '1.05rem' }}>
                      VALID PASS &mdash; ENTRY APPROVED
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Verified at: {new Date(verifyResult.verified_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Pass Number: </span>
                    <code>{verifyResult.pass?.pass_number}</code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Event: </span>
                    <strong>{verifyResult.event?.event_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Team: </span>
                    <strong>{verifyResult.team ? verifyResult.team.team_name : 'Individual'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Payment: </span>
                    <strong style={{ color: 'var(--color-success)' }}>VERIFIED ({verifyResult.payment ? verifyResult.payment.payment_status : 'SUCCESS'})</strong>
                  </div>
                </div>

                {verifyResult.members && verifyResult.members.length > 0 && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid #86efac', paddingTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>
                      Team Roster ({verifyResult.members.length} Members):
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem' }}>
                      {verifyResult.members.map((m) => (
                        <li key={m.participant_id}>
                          {m.first_name} {m.last_name} ({m.email}) &mdash; <strong>{m.role}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {verifyError && (
              <div
                className="alert alert-error"
                style={{
                  marginTop: '1.5rem',
                  padding: '1.25rem',
                  background: 'var(--color-danger-light, #fee2e2)',
                  border: '1px solid #fca5a5',
                  borderRadius: 'var(--radius-md, 8px)',
                  color: 'var(--color-danger, #dc2626)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>❌</span>
                  <strong style={{ fontSize: '1.05rem' }}>PASS VERIFICATION REJECTED</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>{verifyError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <EventFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadEvents();
          }}
        />
      )}

      {selectedEventForEdit && (
        <EventFormModal
          eventToEdit={selectedEventForEdit}
          onClose={() => setSelectedEventForEdit(null)}
          onSuccess={() => {
            setSelectedEventForEdit(null);
            loadEvents();
          }}
        />
      )}

      {selectedEventForSchedule && (
        <ScheduleFormModal
          eventId={selectedEventForSchedule}
          onClose={() => setSelectedEventForSchedule(null)}
          onSuccess={() => {
            setSelectedEventForSchedule(null);
            loadEvents();
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
