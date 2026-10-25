import React, { useState, useEffect } from 'react';
import { EventItem, EventDetail, CreateEventInput, UpdateEventInput, EventStatus } from '../types/event.types.js';
import { createEvent, updateEvent, createSchedule, updateSchedule, fetchEventSchedules } from '../api/events.api.js';

interface EventFormModalProps {
  eventToEdit?: EventDetail | EventItem | null;
  onClose: () => void;
  onSuccess: (savedEvent: EventItem) => void;
}

const CATEGORIES = [
  'Coding / Software',
  'Robotics',
  'Competitive Programming',
  'Web Development',
  'Cybersecurity',
  'AI / Data Science',
  'Workshop',
  'Keynote & Panel',
];

const STATUSES: EventStatus[] = ['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  eventToEdit,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(eventToEdit);

  const [eventName, setEventName] = useState(eventToEdit?.event_name || '');
  const [eventType, setEventType] = useState(eventToEdit?.event_type || CATEGORIES[0]);
  const [description, setDescription] = useState(eventToEdit?.description || '');
  const [minTeamSize, setMinTeamSize] = useState(eventToEdit?.min_team_size || 1);
  const [maxTeamSize, setMaxTeamSize] = useState(eventToEdit?.max_team_size || 1);
  const [registrationFee, setRegistrationFee] = useState(
    eventToEdit ? parseFloat(eventToEdit.registration_fee) : 0
  );
  const [status, setStatus] = useState<EventStatus>(eventToEdit?.status || 'UPCOMING');

  // Schedule & Date Selection
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [venue, setVenue] = useState('');
  const [existingScheduleId, setExistingScheduleId] = useState<number | null>(null);

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (eventToEdit) {
      setEventName(eventToEdit.event_name);
      setEventType(eventToEdit.event_type);
      setDescription(eventToEdit.description || '');
      setMinTeamSize(eventToEdit.min_team_size);
      setMaxTeamSize(eventToEdit.max_team_size);
      setRegistrationFee(parseFloat(eventToEdit.registration_fee) || 0);
      setStatus(eventToEdit.status);

      // Fetch existing schedules if available
      fetchEventSchedules(eventToEdit.event_id)
        .then((schedules) => {
          if (schedules && schedules.length > 0) {
            const first = schedules[0];
            setExistingScheduleId(first.schedule_id);
            setEventDate(first.event_date);
            setStartTime(first.start_time ? first.start_time.slice(0, 5) : '09:00');
            setEndTime(first.end_time ? first.end_time.slice(0, 5) : '17:00');
            setVenue(first.venue || '');
          }
        })
        .catch(() => {
          // If schedule lookup fails or none exists, leave date fields empty
        });
    } else {
      setEventName('');
      setEventType(CATEGORIES[0]);
      setDescription('');
      setMinTeamSize(1);
      setMaxTeamSize(1);
      setRegistrationFee(0);
      setStatus('UPCOMING');
      setEventDate('');
      setStartTime('09:00');
      setEndTime('17:00');
      setVenue('');
      setExistingScheduleId(null);
    }
  }, [eventToEdit]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!eventName.trim() || eventName.trim().length < 2) {
      errs.event_name = 'Event name must be at least 2 characters.';
    }
    if (!eventType.trim()) {
      errs.event_type = 'Event type / category is required.';
    }
    if (minTeamSize < 1) {
      errs.min_team_size = 'Minimum team size must be at least 1.';
    }
    if (maxTeamSize < 1) {
      errs.max_team_size = 'Maximum team size must be at least 1.';
    }
    if (minTeamSize > maxTeamSize) {
      errs.min_team_size = 'Minimum team size cannot exceed maximum team size.';
    }
    if (registrationFee < 0) {
      errs.registration_fee = 'Registration fee cannot be negative.';
    }

    // Schedule validations if date is provided
    if (eventDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || isNaN(new Date(eventDate).getTime())) {
        errs.event_date = 'Please select a valid calendar date.';
      }
      if (startTime && endTime && timeToSeconds(startTime) >= timeToSeconds(endTime)) {
        errs.start_time = 'Start time must be earlier than end time.';
      }
    }

    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const formattedStart = startTime.length === 5 ? `${startTime}:00` : startTime || '09:00:00';
      const formattedEnd = endTime.length === 5 ? `${endTime}:00` : endTime || '17:00:00';
      const finalVenue = venue.trim() || 'Campus Main Block / Online';

      if (isEditing && eventToEdit) {
        const updateInput: UpdateEventInput = {
          event_name: eventName.trim(),
          event_type: eventType.trim(),
          description: description.trim() || null,
          min_team_size: Number(minTeamSize),
          max_team_size: Number(maxTeamSize),
          registration_fee: Number(registrationFee),
          status,
        };
        const updated = await updateEvent(eventToEdit.event_id, updateInput);

        // Update or create schedule if date was selected
        if (eventDate) {
          if (existingScheduleId) {
            await updateSchedule(eventToEdit.event_id, existingScheduleId, {
              event_date: eventDate,
              start_time: formattedStart,
              end_time: formattedEnd,
              venue: finalVenue,
            });
          } else {
            await createSchedule(eventToEdit.event_id, {
              event_date: eventDate,
              start_time: formattedStart,
              end_time: formattedEnd,
              venue: finalVenue,
            });
          }
        }

        onSuccess(updated);
      } else {
        const createInput: CreateEventInput = {
          event_name: eventName.trim(),
          event_type: eventType.trim(),
          description: description.trim() || null,
          min_team_size: Number(minTeamSize),
          max_team_size: Number(maxTeamSize),
          registration_fee: Number(registrationFee),
          status,
        };
        const created = await createEvent(createInput);

        // Create schedule if date was selected
        if (eventDate) {
          await createSchedule(created.event_id, {
            event_date: eventDate,
            start_time: formattedStart,
            end_time: formattedEnd,
            venue: finalVenue,
          });
        }

        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save event. Please check inputs.');
      if (err?.details && Array.isArray(err.details)) {
        const fieldErrors: Record<string, string> = {};
        for (const d of err.details) {
          if (d.field) fieldErrors[d.field] = d.message;
        }
        setClientErrors(fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="form-modal-title" className="modal-title">
            {isEditing ? 'Edit Fest Event' : 'Create New Technical Event'}
          </h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body form-body">
            {serverError && <div className="alert-error" role="alert">{serverError}</div>}

            <div className="form-group">
              <label htmlFor="event-name-input">Event Name *</label>
              <input
                id="event-name-input"
                type="text"
                className={`form-input ${clientErrors.event_name ? 'input-error' : ''}`}
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. AlgoSprint Rapid Problem Solving"
                required
              />
              {clientErrors.event_name && (
                <span className="field-error">{clientErrors.event_name}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="event-type-input">Category / Type *</label>
                <select
                  id="event-type-input"
                  className="form-input"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="event-status-input">Status</label>
                <select
                  id="event-status-input"
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EventStatus)}
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="event-desc-input">Description</label>
              <textarea
                id="event-desc-input"
                className="form-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the challenge, format, and rules..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="min-team-input">Min Team Size *</label>
                <input
                  id="min-team-input"
                  type="number"
                  min="1"
                  max="100"
                  className={`form-input ${clientErrors.min_team_size ? 'input-error' : ''}`}
                  value={minTeamSize}
                  onChange={(e) => setMinTeamSize(parseInt(e.target.value, 10) || 1)}
                  required
                />
                {clientErrors.min_team_size && (
                  <span className="field-error">{clientErrors.min_team_size}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="max-team-input">Max Team Size *</label>
                <input
                  id="max-team-input"
                  type="number"
                  min="1"
                  max="100"
                  className={`form-input ${clientErrors.max_team_size ? 'input-error' : ''}`}
                  value={maxTeamSize}
                  onChange={(e) => setMaxTeamSize(parseInt(e.target.value, 10) || 1)}
                  required
                />
                {clientErrors.max_team_size && (
                  <span className="field-error">{clientErrors.max_team_size}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="fee-input">Fee (INR ₹) *</label>
                <input
                  id="fee-input"
                  type="number"
                  min="0"
                  step="10"
                  className={`form-input ${clientErrors.registration_fee ? 'input-error' : ''}`}
                  value={registrationFee}
                  onChange={(e) => setRegistrationFee(parseFloat(e.target.value) || 0)}
                  required
                />
                {clientErrors.registration_fee && (
                  <span className="field-error">{clientErrors.registration_fee}</span>
                )}
              </div>
            </div>

            {/* Date & Schedule Timing Section */}
            <div
              style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📅 Event Date & Schedule</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  (Set date, timings and venue for participants)
                </span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="event-date-input">Event / Workshop Date</label>
                  <input
                    id="event-date-input"
                    type="date"
                    className={`form-input ${clientErrors.event_date ? 'input-error' : ''}`}
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                  {clientErrors.event_date && (
                    <span className="field-error">{clientErrors.event_date}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="event-venue-input">Venue / Location</label>
                  <input
                    id="event-venue-input"
                    type="text"
                    className={`form-input ${clientErrors.venue ? 'input-error' : ''}`}
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Auditorium Hall B / Lab 301"
                  />
                  {clientErrors.venue && (
                    <span className="field-error">{clientErrors.venue}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="event-start-time-input">Start Time</label>
                  <input
                    id="event-start-time-input"
                    type="time"
                    className={`form-input ${clientErrors.start_time ? 'input-error' : ''}`}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                  {clientErrors.start_time && (
                    <span className="field-error">{clientErrors.start_time}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="event-end-time-input">End Time</label>
                  <input
                    id="event-end-time-input"
                    type="time"
                    className={`form-input ${clientErrors.end_time ? 'input-error' : ''}`}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                  {clientErrors.end_time && (
                    <span className="field-error">{clientErrors.end_time}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
