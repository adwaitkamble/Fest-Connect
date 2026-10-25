import React, { useEffect, useState } from 'react';
import { RegistrationDetail } from '../types/team.types.js';
import { PassDetailResponse, EmailNotificationStatus } from '../types/pass.types.js';
import {
  fetchRegistrationPass,
  generateRegistrationPass,
  fetchEmailNotificationStatus,
  sendOrRetryEmailNotification,
} from '../api/passes.api.js';

interface PassModalProps {
  registration: RegistrationDetail;
  onClose: () => void;
}

export const PassModal: React.FC<PassModalProps> = ({ registration, onClose }) => {
  const [passData, setPassData] = useState<PassDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailNotificationStatus | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPass() {
      try {
        setLoading(true);
        setError(null);
        // First try to fetch existing pass
        let loadedPass: PassDetailResponse | null = null;
        try {
          loadedPass = await fetchRegistrationPass(registration.registration_id);
        } catch (fetchErr: any) {
          // If 404 and registration is CONFIRMED, try generating it on-demand
          if (registration.status === 'CONFIRMED') {
            loadedPass = await generateRegistrationPass(registration.registration_id);
          } else {
            throw fetchErr;
          }
        }

        if (isMounted && loadedPass) {
          setPassData(loadedPass);
          setLoading(false);

          // Fetch email notification status
          try {
            const notif = await fetchEmailNotificationStatus(registration.registration_id);
            if (isMounted) {
              setEmailStatus(notif);
            }
          } catch {
            // Email status fetch is non-fatal
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err?.message ||
              'Unable to load digital pass. Digital passes are only issued for confirmed registrations with verified payment.'
          );
          setLoading(false);
        }
      }
    }

    loadPass();

    return () => {
      isMounted = false;
    };
  }, [registration.registration_id, registration.status]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async (force = false) => {
    try {
      setSendingEmail(true);
      setEmailNotice(null);
      const updated = await sendOrRetryEmailNotification(registration.registration_id, force);
      setEmailStatus(updated);
      setEmailNotice(updated.message || 'Notification processed.');
    } catch (err: any) {
      setEmailNotice(err?.message || 'Failed to dispatch email.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🎟️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Official Digital Pass</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                FestConnect • University TechFest 2026
              </span>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-xs"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner" style={{ padding: '3rem 0' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>
              Retrieving cryptographic digital pass...
            </p>
          </div>
        ) : error ? (
          <div style={{ padding: '1.5rem 0' }}>
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
              <strong>Pass Unavailable:</strong> {error}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Passes are strictly generated only after event registration is confirmed and a verified
              successful payment record is recorded in the system.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : passData ? (
          <div className="pass-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Status & Pass Reference Bar */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '0.8rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 8px #10b981',
                  }}
                />
                <strong style={{ color: '#10b981', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                  ACTIVE ENTRY PASS
                </strong>
              </div>
              <code
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#6ee7b7',
                }}
              >
                {passData.pass.pass_number}
              </code>
            </div>

            {/* QR Code Presentation */}
            <div
              style={{
                background: 'var(--color-bg-alt, #0f172a)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.75rem',
              }}
            >
              {passData.qr_data_url ? (
                <div
                  style={{
                    background: '#ffffff',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                  }}
                >
                  <img
                    src={passData.qr_data_url}
                    alt={`Pass QR Code ${passData.pass.pass_number}`}
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }}>
                  QR Code not rendered
                </div>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Present this QR code or pass reference at the venue gate for verification.
              </div>
            </div>

            {/* Event & Schedule Details */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
                {passData.registration.event_name}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Type: </span>
                  <strong>{passData.registration.event_type}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Venue: </span>
                  <strong>{passData.schedules?.[0]?.venue || 'University Main Campus'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Date: </span>
                  <strong>{passData.schedules?.[0]?.event_date || 'TBA'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Time: </span>
                  <strong>
                    {passData.schedules?.[0]?.start_time
                      ? `${passData.schedules[0].start_time} - ${passData.schedules[0].end_time}`
                      : 'Refer to Schedule'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Team & Members */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Team Roster:</span>
                <strong style={{ fontSize: '0.9rem' }}>{passData.registration.team_name}</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                {passData.members?.map((m) => (
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
            </div>

            {/* Email Notification Status */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1rem' }}>📧</span>
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
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                  }}
                >
                  <div>
                    Recipient: <strong style={{ color: 'var(--color-text)' }}>{emailStatus.recipient}</strong>
                  </div>
                  <div>
                    Provider: <code>{emailStatus.provider}</code>{' '}
                    {emailStatus.preview_available && '(Local console preview)'}
                  </div>
                  {emailStatus.last_sent_at && (
                    <div>
                      Last Sent: {new Date(emailStatus.last_sent_at).toLocaleString()} (Attempt #{emailStatus.attempts})
                    </div>
                  )}
                  {emailNotice && (
                    <div
                      style={{
                        marginTop: '0.4rem',
                        fontSize: '0.8rem',
                        color:
                          emailStatus.status === 'DELIVERED'
                            ? 'var(--color-success, #10b981)'
                            : 'var(--color-danger, #ef4444)',
                      }}
                    >
                      {emailNotice}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Checking email status...
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

            {/* Payment & Audit Info */}
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
              }}
            >
              <span>Transaction ID: {passData.payment.transaction_id || 'N/A'}</span>
              <span>Amount Paid: ₹{parseFloat(passData.payment.amount).toFixed(2)}</span>
              <span>Issued At: {new Date(passData.pass.issued_at).toLocaleString()}</span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn btn-outline" onClick={handlePrint}>
                🖨️ Print Pass
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
