import React, { useState } from 'react';
import { ScheduleItem, CreateScheduleInput, UpdateScheduleInput } from '../types/event.types.js';
import { createSchedule, updateSchedule } from '../api/events.api.js';

interface ScheduleFormModalProps {
  eventId: number;
  scheduleToEdit?: ScheduleItem | null;
  onClose: () => void;
  onSuccess: (savedSchedule: ScheduleItem) => void;
}

function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

export const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({
  eventId,
  scheduleToEdit,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(scheduleToEdit);

  const [eventDate, setEventDate] = useState(scheduleToEdit?.event_date || '2026-11-15');
  const [startTime, setStartTime] = useState(
    scheduleToEdit?.start_time ? scheduleToEdit.start_time.slice(0, 5) : '10:00'
  );
  const [endTime, setEndTime] = useState(
    scheduleToEdit?.end_time ? scheduleToEdit.end_time.slice(0, 5) : '13:00'
  );
  const [venue, setVenue] = useState(scheduleToEdit?.venue || '');

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      errs.event_date = 'Valid date in YYYY-MM-DD format is required.';
    }
    if (!startTime) {
      errs.start_time = 'Start time is required.';
    }
    if (!endTime) {
      errs.end_time = 'End time is required.';
    }
    if (startTime && endTime && timeToSeconds(startTime) >= timeToSeconds(endTime)) {
      errs.start_time = 'Start time must be earlier than end time.';
    }
    if (!venue.trim()) {
      errs.venue = 'Venue or location is required.';
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
      const formattedStart = startTime.length === 5 ? `${startTime}:00` : startTime;
      const formattedEnd = endTime.length === 5 ? `${endTime}:00` : endTime;

      if (isEditing && scheduleToEdit) {
        const updateInput: UpdateScheduleInput = {
          event_date: eventDate,
          start_time: formattedStart,
          end_time: formattedEnd,
          venue: venue.trim(),
        };
        const updated = await updateSchedule(eventId, scheduleToEdit.schedule_id, updateInput);
        onSuccess(updated);
      } else {
        const createInput: CreateScheduleInput = {
          event_date: eventDate,
          start_time: formattedStart,
          end_time: formattedEnd,
          venue: venue.trim(),
        };
        const created = await createSchedule(eventId, createInput);
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title">
      <div className="modal-content modal-content-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="schedule-modal-title" className="modal-title">
            {isEditing ? 'Edit Schedule Slot' : 'Add Event Schedule Slot'}
          </h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body form-body">
            {serverError && <div className="alert-error" role="alert">{serverError}</div>}

            <div className="form-group">
              <label htmlFor="schedule-date-input">Event Date (YYYY-MM-DD) *</label>
              <input
                id="schedule-date-input"
                type="date"
                className={`form-input ${clientErrors.event_date ? 'input-error' : ''}`}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
              {clientErrors.event_date && (
                <span className="field-error">{clientErrors.event_date}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="schedule-start-input">Start Time *</label>
                <input
                  id="schedule-start-input"
                  type="time"
                  className={`form-input ${clientErrors.start_time ? 'input-error' : ''}`}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
                {clientErrors.start_time && (
                  <span className="field-error">{clientErrors.start_time}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="schedule-end-input">End Time *</label>
                <input
                  id="schedule-end-input"
                  type="time"
                  className={`form-input ${clientErrors.end_time ? 'input-error' : ''}`}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
                {clientErrors.end_time && (
                  <span className="field-error">{clientErrors.end_time}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="schedule-venue-input">Venue / Room / Arena *</label>
              <input
                id="schedule-venue-input"
                type="text"
                className={`form-input ${clientErrors.venue ? 'input-error' : ''}`}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Auditorium Hall B, Stage 1"
                required
              />
              {clientErrors.venue && (
                <span className="field-error">{clientErrors.venue}</span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Update Slot' : 'Save Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
