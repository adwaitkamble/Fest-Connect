import React, { useEffect, useState } from 'react';
import { PassDetailResponse, EmailNotificationStatus } from '../types/pass.types.js';
import { fetchPassById, fetchRegistrationPass, fetchEmailNotificationStatus, sendOrRetryEmailNotification } from '../api/passes.api.js';

export interface PassScreenProps {
  passId?: number;
  registrationId?: number;
  onBack?: () => void;
}

export const PassScreen: React.FC<PassScreenProps> = ({
  passId,
  registrationId,
  onBack,
}) => {
  const [passData, setPassData] = useState<PassDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Email state
  const [emailStatus, setEmailStatus] = useState<EmailNotificationStatus | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const loadPass = async () => {
    try {
      setLoading(true);
      setError(null);
      let data: PassDetailResponse;
      if (passId) {
        data = await fetchPassById(passId);
      } else if (registrationId) {
        data = await fetchRegistrationPass(registrationId);
      } else {
        throw new Error('No pass or registration ID specified.');
      }
      setPassData(data);

      // Load email status
      const regId = data.registration?.registration_id || registrationId;
      if (regId) {
        try {
          const emailData = await fetchEmailNotificationStatus(regId);
          setEmailStatus(emailData);
        } catch {
          // Non-blocking
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load pass details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPass();
  }, [passId, registrationId]);

  const handleSendEmail = async (force = false) => {
    const regId = passData?.registration?.registration_id || registrationId;
    if (!regId) return;

    setSendingEmail(true);
    setEmailNotice(null);
    try {
      const res = await sendOrRetryEmailNotification(regId, force);
      setEmailStatus(res);
      setEmailNotice(
        res.status === 'DELIVERED'
          ? 'Confirmation email delivered! (Check server console preview log)'
          : 'Email delivery attempted. Recorded failure.'
      );
    } catch (err: any) {
      setEmailNotice(`Failed to send email: ${err?.message || 'Unknown error'}`);
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Retrieving verified digital entry pass...</p>
      </div>
    );
  }

  if (error || !passData) {
    return (
      <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="empty-state-icon" style={{ fontSize: '3rem' }}>🎟️</div>
        <div className="empty-state-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.5rem 0' }}>
          Pass Unavailable
        </div>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
          {error || 'This pass does not exist or has not been unlocked with verified payment.'}
        </p>
        {onBack && (
          <button className="btn btn-primary btn-sm" onClick={onBack}>
            &larr; Back to Registrations
          </button>
        )}
      </div>
    );
  }

  const { pass, registration, payment, members, schedules, qr_data_url } = passData;
  const primarySchedule = schedules && schedules.length > 0 ? schedules[0] : null;

  return (
    <div className="pass-screen" style={{ maxWidth: '640px', margin: '1rem auto', padding: '0 1rem' }}>
      {onBack && (
        <div style={{ marginBottom: '1rem' }}>
          <button className="btn btn-outline btn-sm" onClick={onBack}>
            &larr; Back
          </button>
        </div>
      )}

      {/* Ticket Card */}
      <div
        className="card"
        style={{
          background: 'var(--color-bg-card, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)',
          padding: '2rem',
        }}
      >
        {/* Pass Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Official Entry Pass
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.2rem 0' }}>
              <code>{pass.pass_number}</code>
            </h2>
          </div>
          <span
            className="status-badge confirmed"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', textTransform: 'uppercase' }}
          >
            CONFIRMED ENTRY
          </span>
        </div>

        {/* QR Code Presentation */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1.5rem',
            background: 'var(--color-bg-main, #f8fafc)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border)',
            marginBottom: '1.5rem',
          }}
        >
          {qr_data_url ? (
            <img
              src={qr_data_url}
              alt={`Pass QR Code ${pass.pass_number}`}
              style={{ width: '180px', height: '180px', display: 'block', borderRadius: '4px' }}
            />
          ) : (
            <div style={{ width: '180px', height: '180px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              QR Code
            </div>
          )}
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
            Present this QR code or pass reference at venue entry gates for instant verification.
          </div>
        </div>

        {/* Event Details */}
        <div
          style={{
            background: 'var(--color-bg-main, #f8fafc)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 600 }}>
            {registration.event_name}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Type: </span>
              <strong>{registration.event_type}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Venue: </span>
              <strong>{primarySchedule?.venue || 'Campus Auditorium'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Date: </span>
              <strong>
                {primarySchedule?.event_date
                  ? new Date(primarySchedule.event_date).toLocaleDateString()
                  : new Date(registration.registration_date).toLocaleDateString()}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Time: </span>
              <strong>
                {primarySchedule
                  ? `${primarySchedule.start_time.slice(0, 5)} - ${primarySchedule.end_time.slice(0, 5)}`
                  : '09:00 - 18:00'}
              </strong>
            </div>
          </div>
        </div>

        {/* Team Roster */}
        {registration.team_name && (
          <div
            style={{
              background: 'var(--color-bg-main, #f8fafc)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Team Roster:</span>
              <strong style={{ fontSize: '0.9rem' }}>{registration.team_name}</strong>
            </div>
            {members && members.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                {members.map((m) => (
                  <li key={m.participant_id} style={{ marginBottom: '0.2rem' }}>
                    {m.first_name} {m.last_name}{' '}
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: m.role === 'LEADER' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: m.role === 'LEADER' ? 600 : 400,
                      }}
                    >
                      ({m.role})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Email Notification Status */}
        <div
          style={{
            background: 'var(--color-bg-main, #f8fafc)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📧</span>
              <strong style={{ fontSize: '0.9rem' }}>Email Delivery Status</strong>
            </div>
            {emailStatus && (
              <span
                className={`status-badge ${
                  emailStatus.status === 'DELIVERED'
                    ? 'confirmed'
                    : emailStatus.status === 'FAILED'
                    ? 'cancelled'
                    : 'pending'
                }`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
              >
                {emailStatus.status === 'DELIVERED'
                  ? 'DELIVERED'
                  : emailStatus.status === 'FAILED'
                  ? 'DELIVERY FAILED'
                  : 'NOT SENT'}
              </span>
            )}
          </div>

          {emailStatus ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div>
                Recipient: <strong style={{ color: 'var(--color-text-main)' }}>{emailStatus.recipient}</strong>
              </div>
              <div>
                Provider: <code>{emailStatus.provider}</code> {emailStatus.preview_available && '(Local console preview)'}
              </div>
              {emailStatus.last_sent_at && (
                <div>
                  Last Sent: {new Date(emailStatus.last_sent_at).toLocaleString()} (Attempt #{emailStatus.attempts})
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Checking email status...
            </div>
          )}

          {emailNotice && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-primary)' }}>
              {emailNotice}
            </div>
          )}

          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-outline btn-xs"
              disabled={sendingEmail}
              onClick={() => handleSendEmail(false)}
            >
              {sendingEmail
                ? 'Sending...'
                : emailStatus?.status === 'DELIVERED'
                ? 'Resend Email'
                : 'Send Pass Email'}
            </button>
          </div>
        </div>

        {/* Audit Details */}
        {payment && (
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.4rem',
              marginBottom: '1rem',
            }}
          >
            <span>Txn ID: {payment.transaction_id}</span>
            <span>Paid: ₹{parseFloat(payment.amount).toFixed(2)}</span>
            <span>Issued: {new Date(pass.issued_at).toLocaleString()}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={() => window.print()}>
            🖨️ Print Pass
          </button>
          {onBack && (
            <button className="btn btn-primary" onClick={onBack}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
