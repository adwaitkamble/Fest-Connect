import React from 'react';
import { EventDetail, ScheduleItem, AuthUser } from '../types/event.types.js';

interface EventDetailModalProps {
  event: EventDetail;
  currentUser: AuthUser | null;
  onClose: () => void;
  onEditEvent: (event: EventDetail) => void;
  onAddSchedule: (eventId: number) => void;
  onEditSchedule: (eventId: number, schedule: ScheduleItem) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  currentUser,
  onClose,
  onEditEvent,
  onAddSchedule,
  onEditSchedule,
}) => {
  const canManageEvent =
    currentUser &&
    (currentUser.role === 'ADMIN' ||
      (currentUser.role === 'COORDINATOR' &&
        event.coordinator_id !== null &&
        currentUser.coordinator_id === event.coordinator_id));

  const formatFee = (fee: string) => {
    const num = parseFloat(fee);
    return num === 0 ? 'Free Entry' : `₹${num.toFixed(2)}`;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'badge-status-upcoming';
      case 'ACTIVE':
        return 'badge-status-active';
      case 'COMPLETED':
        return 'badge-status-completed';
      case 'CANCELLED':
        return 'badge-status-cancelled';
      default:
        return '';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="event-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-category">{event.event_type}</div>
            <h2 id="event-title" className="modal-title">{event.event_name}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Status and Fee Badges */}
          <div className="modal-badges">
            <span className={`status-badge ${getStatusClass(event.status)}`}>
              {event.status}
            </span>
            <span className="badge-fee">{formatFee(event.registration_fee)}</span>
            <span className="badge-teams">
              {event.min_team_size === event.max_team_size
                ? event.min_team_size === 1
                  ? 'Solo Event'
                  : `Team: ${event.min_team_size} members`
                : `Team: ${event.min_team_size}-${event.max_team_size} members`}
            </span>
          </div>

          {/* Description */}
          <div className="modal-section">
            <h3 className="section-title">About the Event</h3>
            <p className="event-description">
              {event.description || 'No detailed description provided for this event.'}
            </p>
          </div>

          {/* Coordinator Details */}
          <div className="modal-section">
            <h3 className="section-title">Event Coordinator</h3>
            <div className="coordinator-card">
              <div className="coordinator-avatar">
                {event.coordinator_name ? event.coordinator_name.charAt(0) : 'C'}
              </div>
              <div className="coordinator-info">
                <div className="coordinator-name">
                  {event.coordinator_name || 'Coordinator Assigned'}
                </div>
                {event.coordinator_email && (
                  <div className="coordinator-contact">
                    <span>Email: </span>
                    <a href={`mailto:${event.coordinator_email}`}>{event.coordinator_email}</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="modal-section">
            <div className="schedule-header">
              <h3 className="section-title">Event Schedule & Venues</h3>
              {canManageEvent && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onAddSchedule(event.event_id)}
                >
                  + Add Slot
                </button>
              )}
            </div>

            {event.schedules && event.schedules.length > 0 ? (
              <div className="schedule-list">
                {event.schedules.map((sc) => (
                  <div key={sc.schedule_id} className="schedule-item">
                    <div className="schedule-date-badge">
                      <span className="schedule-date">{sc.event_date}</span>
                    </div>
                    <div className="schedule-details">
                      <div className="schedule-time">
                        {sc.start_time} &ndash; {sc.end_time}
                      </div>
                      <div className="schedule-venue">
                        <strong>Venue:</strong> {sc.venue}
                      </div>
                    </div>
                    {canManageEvent && (
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => onEditSchedule(event.event_id, sc)}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="schedule-empty">
                No schedule entries have been announced for this event yet.
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {canManageEvent && (
            <button
              className="btn btn-secondary"
              onClick={() => onEditEvent(event)}
            >
              Edit Event
            </button>
          )}
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
