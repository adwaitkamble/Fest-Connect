import React from 'react';
import { AuthUser } from '../types/event.types.js';
import { RegistrationList } from './RegistrationList.js';

export interface ParticipantDashboardProps {
  currentUser: AuthUser | null;
  onNavigateTab?: (tab: 'Events' | 'Teams' | 'Overview') => void;
  onNavigateLogin?: () => void;
}

export const ParticipantDashboard: React.FC<ParticipantDashboardProps> = ({
  currentUser,
  onNavigateTab,
  onNavigateLogin,
}) => {
  if (!currentUser) {
    return (
      <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="empty-state-icon" style={{ fontSize: '3rem' }}>🎟️</div>
        <div className="empty-state-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.5rem 0' }}>
          Sign In to Access Your Dashboard
        </div>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
          View your team registrations, track mock payment statuses, download digital event passes, and inspect email delivery notifications.
        </p>
        {onNavigateLogin && (
          <button className="btn btn-primary btn-sm" onClick={onNavigateLogin}>
            Sign In / Register &rarr;
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="participant-dashboard" style={{ padding: '0.5rem 0' }}>
      {/* Participant Profile Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '1.75rem',
          marginBottom: '1.75rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
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
                {currentUser.role} DASHBOARD
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.2rem 0', color: '#ffffff' }}>
              {currentUser.first_name} {currentUser.last_name}
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              {currentUser.email}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {onNavigateTab && (
              <>
                <button
                  className="btn btn-sm"
                  style={{ background: '#ffffff', color: '#0369a1', fontWeight: 600 }}
                  onClick={() => onNavigateTab('Events')}
                >
                  Explore Events &rarr;
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 600, border: '1px solid rgba(255,255,255,0.4)' }}
                  onClick={() => onNavigateTab('Teams')}
                >
                  My Teams &rarr;
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info Highlights */}
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            flexWrap: 'wrap',
            fontSize: '0.85rem',
          }}
        >
          <div>
            <span style={{ opacity: 0.8 }}>Participant ID: </span>
            <strong>#{currentUser.participant_id}</strong>
          </div>
          <div>
            <span style={{ opacity: 0.8 }}>Account Role: </span>
            <strong>{currentUser.role}</strong>
          </div>
          <div>
            <span style={{ opacity: 0.8 }}>Access Scope: </span>
            <strong>Team Leader & Member Entries</strong>
          </div>
        </div>
      </div>

      {/* Registrations List Section */}
      <section aria-label="My Registrations & Passes">
        <RegistrationList currentUser={currentUser} />
      </section>
    </div>
  );
};
