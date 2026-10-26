import React, { useState, useEffect, useCallback } from 'react';
import {
  EventItem,
  EventDetail,
  PaginationMeta,
  AuthUser,
  ScheduleItem,
} from '../types/event.types.js';
import { fetchEvents, fetchEventById } from '../api/events.api.js';
import { EventDetailModal } from './EventDetailModal.js';
import { EventFormModal } from './EventFormModal.js';
import { ScheduleFormModal } from './ScheduleFormModal.js';
import { RegisterEventModal } from './RegisterEventModal.js';

interface EventListProps {
  currentUser: AuthUser | null;
  onSelectEvent?: (eventId: number) => void;
}

const CATEGORIES = [
  'All',
  'Coding / Software',
  'Robotics',
  'Competitive Programming',
  'Web Development',
  'Cybersecurity',
  'AI / Data Science',
  'Workshop',
  'Keynote & Panel',
];

const STATUS_FILTERS = ['All', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export const EventList: React.FC<EventListProps> = ({ currentUser, onSelectEvent }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 1,
  });

  const [category, setCategory] = useState<string>('All');
  const [status, setStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState<boolean>(false);
  const [eventToEdit, setEventToEdit] = useState<EventDetail | EventItem | null>(null);

  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState<boolean>(false);
  const [scheduleEventId, setScheduleEventId] = useState<number | null>(null);
  const [scheduleToEdit, setScheduleToEdit] = useState<ScheduleItem | null>(null);
  const [eventToRegister, setEventToRegister] = useState<EventItem | null>(null);

  const loadEvents = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchEvents({
          page,
          limit: 6,
          event_type: category !== 'All' ? category : undefined,
          status: status !== 'All' ? status : undefined,
          search: activeSearch.trim() || undefined,
        });
        setEvents(res.events);
        setPagination(res.pagination);
      } catch (err: any) {
        setError(err?.message || 'Unable to load events from the server.');
      } finally {
        setLoading(false);
      }
    },
    [category, status, activeSearch]
  );

  useEffect(() => {
    loadEvents(1);
  }, [loadEvents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchTerm);
  };

  const handleOpenDetails = async (eventId: number) => {
    if (onSelectEvent) {
      onSelectEvent(eventId);
      return;
    }
    try {
      const detail = await fetchEventById(eventId);
      setSelectedEvent(detail);
    } catch (err: any) {
      alert(err?.message || 'Unable to load event details.');
    }
  };

  const handleOpenCreateEvent = () => {
    setEventToEdit(null);
    setIsEventFormOpen(true);
  };

  const handleOpenEditEvent = (event: EventDetail | EventItem) => {
    setEventToEdit(event);
    setIsEventFormOpen(true);
  };

  const handleEventSaved = async (saved: EventItem) => {
    await loadEvents(pagination.page);
    if (selectedEvent && selectedEvent.event_id === saved.event_id) {
      const refreshed = await fetchEventById(saved.event_id);
      setSelectedEvent(refreshed);
    }
  };

  const handleOpenAddSchedule = (eventId: number) => {
    setScheduleEventId(eventId);
    setScheduleToEdit(null);
    setIsScheduleFormOpen(true);
  };

  const handleOpenEditSchedule = (eventId: number, schedule: ScheduleItem) => {
    setScheduleEventId(eventId);
    setScheduleToEdit(schedule);
    setIsScheduleFormOpen(true);
  };

  const handleScheduleSaved = async () => {
    if (scheduleEventId) {
      const refreshed = await fetchEventById(scheduleEventId);
      setSelectedEvent(refreshed);
    }
    await loadEvents(pagination.page);
  };

  const canCreateEvents =
    currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'COORDINATOR');

  const canEditEvent = (ev: EventItem) =>
    currentUser &&
    (currentUser.role === 'ADMIN' ||
      (currentUser.role === 'COORDINATOR' &&
        ev.coordinator_id !== null &&
        currentUser.coordinator_id === ev.coordinator_id));

  const formatFee = (fee: string) => {
    const num = parseFloat(fee);
    return num === 0 ? 'Free Entry' : `₹${num.toFixed(2)}`;
  };

  const getStatusClass = (st: string) => {
    switch (st) {
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
    <div className="event-discovery-container">
      {/* Header and Action Bar */}
      <div className="discovery-header">
        <div>
          <span className="discovery-tag">⚡ University TechFest 2026</span>
          <h2 className="discovery-title">Fest Technical Events & Competitions</h2>
          <p className="discovery-subtitle">
            Explore university hackathons, robotics challenges, and coding contests.
          </p>
        </div>
        {canCreateEvents && (
          <button className="btn btn-primary" onClick={handleOpenCreateEvent}>
            + Create New Event
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="discovery-filters-bar">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrapper">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by event name or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search events"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                title="Clear input"
                onClick={() => {
                  setSearchTerm('');
                  setActiveSearch('');
                }}
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-sm search-submit-btn">
            Search
          </button>
          {activeSearch && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSearchTerm('');
                setActiveSearch('');
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="filter-selects">
          <div className="filter-group">
            <label htmlFor="category-select">Category:</label>
            <select
              id="category-select"
              className="filter-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="status-select">Status:</label>
            <select
              id="status-select"
              className="filter-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_FILTERS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Live Active Filter Bar & Results Count */}
      <div className="discovery-status-bar">
        <span className="results-count">
          Showing <strong>{events.length}</strong> of <strong>{pagination.total}</strong> events
          {category !== 'All' && ` • Category: ${category}`}
          {status !== 'All' && ` • Status: ${status}`}
          {activeSearch && ` • Search: "${activeSearch}"`}
        </span>
        {(category !== 'All' || status !== 'All' || activeSearch) && (
          <button
            type="button"
            className="btn btn-outline btn-xs"
            onClick={() => {
              setCategory('All');
              setStatus('All');
              setSearchTerm('');
              setActiveSearch('');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Events View */}
      {loading ? (
        <div className="loading-state" aria-busy="true">
          <div className="spinner"></div>
          <p>Loading university events...</p>
        </div>
      ) : error ? (
        <div className="error-card" role="alert">
          <div className="error-icon">!</div>
          <div className="error-message-text">{error}</div>
          <button className="btn btn-secondary btn-sm" onClick={() => loadEvents(pagination.page)}>
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No Events Found</h3>
          <p>There are no events matching your selected category, status, or search keywords.</p>
          {(category !== 'All' || status !== 'All' || activeSearch) && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                setCategory('All');
                setStatus('All');
                setSearchTerm('');
                setActiveSearch('');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="events-grid">
            {events.map((ev) => (
              <div key={ev.event_id} className="event-card" onClick={() => handleOpenDetails(ev.event_id)}>
                <div className="event-card-header">
                  <span className="card-category">{ev.event_type}</span>
                  <span className={`status-badge ${getStatusClass(ev.status)}`}>{ev.status}</span>
                </div>

                <h3 className="event-card-title">{ev.event_name}</h3>
                <p className="event-card-desc">
                  {ev.description || 'Join students across colleges in this competitive fest challenge.'}
                </p>

                <div className="event-card-meta">
                  <div className="meta-item">
                    <span className="meta-label">Team:</span>
                    <span className="meta-value">
                      {ev.min_team_size === ev.max_team_size
                        ? ev.min_team_size === 1
                          ? 'Solo'
                          : `${ev.min_team_size} members`
                        : `${ev.min_team_size}-${ev.max_team_size} members`}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Fee:</span>
                    <span className="meta-value fee-highlight">{formatFee(ev.registration_fee)}</span>
                  </div>
                </div>

                {ev.coordinator_name && (
                  <div className="event-card-coordinator">
                    <span className="coord-icon">👤</span>
                    <span className="coord-text">{ev.coordinator_name}</span>
                  </div>
                )}

                <div className="event-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleOpenDetails(ev.event_id)}
                  >
                    View Details & Schedule
                  </button>
                  {currentUser && (ev.status === 'UPCOMING' || ev.status === 'ACTIVE') && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setEventToRegister(ev)}
                    >
                      Register Team
                    </button>
                  )}
                  {canEditEvent(ev) && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEditEvent(ev)}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                className="btn btn-outline btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => loadEvents(pagination.page - 1)}
              >
                &larr; Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} events)
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadEvents(pagination.page + 1)}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          currentUser={currentUser}
          onClose={() => setSelectedEvent(null)}
          onEditEvent={(ev) => handleOpenEditEvent(ev)}
          onAddSchedule={(evId) => handleOpenAddSchedule(evId)}
          onEditSchedule={(evId, sc) => handleOpenEditSchedule(evId, sc)}
        />
      )}

      {isEventFormOpen && (
        <EventFormModal
          eventToEdit={eventToEdit}
          onClose={() => {
            setIsEventFormOpen(false);
            setEventToEdit(null);
          }}
          onSuccess={handleEventSaved}
        />
      )}

      {isScheduleFormOpen && scheduleEventId && (
        <ScheduleFormModal
          eventId={scheduleEventId}
          scheduleToEdit={scheduleToEdit}
          onClose={() => {
            setIsScheduleFormOpen(false);
            setScheduleEventId(null);
            setScheduleToEdit(null);
          }}
          onSuccess={handleScheduleSaved}
        />
      )}

      {eventToRegister && (
        <RegisterEventModal
          event={eventToRegister}
          currentUser={currentUser}
          onClose={() => setEventToRegister(null)}
          onRegistered={() => {
            loadEvents(pagination.page);
          }}
        />
      )}
    </div>
  );
};
