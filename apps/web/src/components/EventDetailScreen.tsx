import React, { useEffect, useState } from 'react';
import { EventDetail, ScheduleItem, AuthUser } from '../types/event.types.js';
import { fetchEventById, fetchEventSchedules } from '../api/events.api.js';
import { RegisterEventModal } from './RegisterEventModal.js';
import { EventFormModal } from './EventFormModal.js';
import { ScheduleFormModal } from './ScheduleFormModal.js';

export interface EventDetailScreenProps {
  eventId: number;
  currentUser: AuthUser | null;
  onBack?: () => void;
  onNavigateLogin?: () => void;
}

export const EventDetailScreen: React.FC<EventDetailScreenProps> = ({
  eventId,
  currentUser,
  onBack,
  onNavigateLogin,
}) => {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [evData, schedData] = await Promise.all([
        fetchEventById(eventId),
        fetchEventSchedules(eventId).catch(() => []),
      ]);
      setEvent(evData);
      setSchedules(schedData || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  if (loading) {
    return (
      <div className="loading-spinner" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="empty-state-icon" style={{ fontSize: '3rem' }}>🔍</div>
        <div className="empty-state-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.5rem 0' }}>
          Event Not Found
        </div>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          {error || `Event #${eventId} could not be located.`}
        </p>
        {onBack && (
          <button className="btn btn-primary btn-sm" onClick={onBack}>
            &larr; Back to Events
          </button>
        )}
      </div>
    );
  }

  const isCoordinator =
    currentUser &&
    (currentUser.role === 'ADMIN' ||
      (currentUser.role === 'COORDINATOR' && event.coordinator_email === currentUser.email));

  const isRegistrationOpen = event.status === 'UPCOMING' || event.status === 'ACTIVE';
  const fee = parseFloat(event.registration_fee || '0');

  return (
    <div className="event-detail-screen" style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 0' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        {onBack && (
          <button className="btn btn-outline btn-sm" onClick={onBack}>
            &larr; Back to Events
          </button>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isCoordinator && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => setShowEditModal(true)}>
                ✏️ Edit Event
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowScheduleModal(true)}>
                📅 Add Schedule
              </button>
            </>
          )}
        </div>
      </div>

      {registrationNotice && (
        <div
          className="alert alert-success"
          style={{
            backgroundColor: 'var(--color-success-light, #dcfce7)',
            color: 'var(--color-success, #16a34a)',
            padding: '1rem',
            borderRadius: 'var(--radius-md, 8px)',
            marginBottom: '1.5rem',
            border: '1px solid #86efac',
          }}
        >
          {registrationNotice}
        </div>
      )}

      {/* Main Event Card */}
      <div
        className="card"
        style={{
          background: 'var(--color-bg-card, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '2rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span className={`event-category-badge ${event.event_type.toLowerCase()}`}>
                {event.event_type}
              </span>
              <span className={`status-badge ${event.status.toLowerCase()}`}>
                {event.status.replace('_', ' ')}
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '0.25rem 0' }}>
              {event.event_name}
            </h1>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {fee === 0 ? 'Free Entry' : `₹${fee.toFixed(2)}`}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Registration Fee
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            background: 'var(--color-bg-main, #f8fafc)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md, 8px)',
            margin: '1.5rem 0',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Team Size
            </div>
            <strong style={{ fontSize: '0.95rem' }}>
              {event.min_team_size === event.max_team_size
                ? `${event.min_team_size} Members`
                : `${event.min_team_size} – ${event.max_team_size} Members`}
            </strong>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Registration Fee
            </div>
            <strong style={{ fontSize: '0.95rem' }}>
              {fee === 0 ? 'Free Entry' : `₹${fee.toFixed(2)}`}
            </strong>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Schedule Sessions
            </div>
            <strong style={{ fontSize: '0.95rem' }}>
              {schedules.length} Published
            </strong>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Event Status
            </div>
            <strong style={{ fontSize: '0.95rem', color: isRegistrationOpen ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              {isRegistrationOpen ? 'Registrations Open' : 'Registration Closed'}
            </strong>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Event Description & Guidelines
          </h3>
          <p style={{ color: 'var(--color-text-main)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {event.description || 'No detailed description provided for this event.'}
          </p>
        </div>

        {/* Registration Action */}
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            {currentUser ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Logged in as <strong>{currentUser.first_name} {currentUser.last_name}</strong> ({currentUser.role})
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Please sign in to register your team.
              </div>
            )}
          </div>

          <div>
            {currentUser ? (
              <button
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.4rem', fontWeight: 600 }}
                disabled={!isRegistrationOpen}
                onClick={() => setShowRegisterModal(true)}
              >
                {isRegistrationOpen ? '🎟️ Register Team for Event' : 'Registrations Closed'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.4rem', fontWeight: 600 }}
                onClick={onNavigateLogin}
              >
                Sign In to Register
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Schedule Timeline & Coordinator Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Schedule Timeline */}
        <div
          className="card"
          style={{
            background: 'var(--color-bg-card, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--color-border)',
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
              📅 Event Schedule & Venues
            </h3>
            {isCoordinator && (
              <button className="btn btn-outline btn-xs" onClick={() => setShowScheduleModal(true)}>
                + Add Slot
              </button>
            )}
          </div>

          {schedules.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
              No schedule entries published yet for this event.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {schedules.map((s, idx) => (
                <div
                  key={s.schedule_id || idx}
                  style={{
                    background: 'var(--color-bg-main, #f8fafc)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md, 8px)',
                    padding: '0.75rem 1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem' }}>
                      {new Date(s.event_date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                      {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                    📍 Venue: <strong>{s.venue}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coordinator Info */}
        <div
          className="card"
          style={{
            background: 'var(--color-bg-card, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--color-border)',
            padding: '1.5rem',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            👤 Event Coordinator
          </h3>

          {event.coordinator_name ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Name</div>
                <strong>{event.coordinator_name}</strong>
              </div>
              {event.coordinator_email && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Email</div>
                  <a href={`mailto:${event.coordinator_email}`} style={{ color: 'var(--color-primary)' }}>
                    {event.coordinator_email}
                  </a>
                </div>
              )}
              {event.coordinator_phone && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Phone</div>
                  <span>{event.coordinator_phone}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Coordinator details pending announcement.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showRegisterModal && (
        <RegisterEventModal
          event={event}
          currentUser={currentUser}
          onClose={() => setShowRegisterModal(false)}
          onRegistered={() => {
            setShowRegisterModal(false);
            setRegistrationNotice(
              `Registration initiated successfully for '${event.event_name}'. Proceed to Registrations tab to complete payment.`
            );
          }}
        />
      )}

      {showEditModal && (
        <EventFormModal
          eventToEdit={event}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadData();
          }}
        />
      )}

      {showScheduleModal && (
        <ScheduleFormModal
          eventId={event.event_id}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};
