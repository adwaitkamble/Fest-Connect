import React, { useState } from 'react';
import { RegistrationDetail } from '../types/team.types.js';
import { PaymentRecord } from '../types/payment.types.js';
import { initiatePayment } from '../api/payments.api.js';

interface PaymentModalProps {
  registration: RegistrationDetail;
  onClose: () => void;
  onPaymentSuccess: (payment: PaymentRecord) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  registration,
  onClose,
  onPaymentSuccess,
}) => {
  const [simulatedOutcome, setSimulatedOutcome] = useState<'SUCCESS' | 'FAILED' | 'PENDING'>('SUCCESS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPayment, setLastPayment] = useState<PaymentRecord | null>(null);

  const parsedFee = parseFloat(registration.registration_fee);
  const formattedFee = isNaN(parsedFee) ? '0.00' : parsedFee.toFixed(2);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payment = await initiatePayment(
        registration.registration_id,
        simulatedOutcome,
        'MOCK'
      );

      setLastPayment(payment);

      if (payment.payment_status === 'SUCCESS') {
        onPaymentSuccess(payment);
      }
    } catch (err: any) {
      setError(err?.message || 'Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Event Fee Payment</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Registration #{registration.registration_id}
            </span>
          </div>
          <button className="btn btn-secondary btn-xs" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Demo Mode Notice Banner */}
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              color: 'var(--color-primary)',
              fontSize: '0.9rem',
              marginBottom: '0.2rem',
            }}
          >
            <span>🛡️</span>
            <span>Demo Payment — No Real Money Charged</span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.4,
            }}
          >
            This system runs the <strong>MockPaymentGatewayAdapter</strong> (Factory & Adapter patterns).
            Card numbers, CVVs, or financial credentials are never requested or stored.
          </p>
        </div>

        {/* Event & Team Info Summary */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            marginBottom: '1.2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Event:</span>
            <strong style={{ fontSize: '0.85rem' }}>{registration.event_name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Team:</span>
            <strong style={{ fontSize: '0.85rem' }}>{registration.team_name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Team Leader:</span>
            <span style={{ fontSize: '0.85rem' }}>{registration.leader_name}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.4rem',
              borderTop: '1px dashed var(--color-border)',
              marginTop: '0.4rem',
            }}
          >
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Amount Due:</span>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-success)',
              }}
            >
              ₹{formattedFee}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-card" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
            <strong>Payment Error:</strong> {error}
          </div>
        )}

        {/* Outcome State Display */}
        {lastPayment && (
          <div
            style={{
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              border: '1px solid',
              background:
                lastPayment.payment_status === 'SUCCESS'
                  ? 'rgba(34, 197, 94, 0.12)'
                  : lastPayment.payment_status === 'FAILED'
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(234, 179, 8, 0.12)',
              borderColor:
                lastPayment.payment_status === 'SUCCESS'
                  ? 'rgba(34, 197, 94, 0.4)'
                  : lastPayment.payment_status === 'FAILED'
                  ? 'rgba(239, 68, 68, 0.4)'
                  : 'rgba(234, 179, 8, 0.4)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
              {lastPayment.payment_status === 'SUCCESS' && '✅ Payment Succeeded!'}
              {lastPayment.payment_status === 'FAILED' && '❌ Payment Failed (Simulated Decline)'}
              {lastPayment.payment_status === 'PENDING' && '⏳ Payment Pending Settlement'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              <div>Transaction ID: <code>{lastPayment.transaction_id}</code></div>
              <div>Attempt #{lastPayment.attempt_number} • Method: {lastPayment.payment_method}</div>
              {lastPayment.payment_status === 'SUCCESS' && (
                <div style={{ color: 'var(--color-success)', marginTop: '0.3rem', fontWeight: 500 }}>
                  Registration is now CONFIRMED.
                </div>
              )}
              {lastPayment.payment_status === 'FAILED' && (
                <div style={{ color: 'var(--color-danger)', marginTop: '0.3rem' }}>
                  The registration remains PENDING PAYMENT. You can retry the transaction below.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form controls (only if not already successfully paid) */}
        {(!lastPayment || lastPayment.payment_status !== 'SUCCESS') ? (
          <form onSubmit={handlePay}>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                Select Simulated Gateway Outcome (Demo & Testing):
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: simulatedOutcome === 'SUCCESS' ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="simulated_outcome"
                    value="SUCCESS"
                    checked={simulatedOutcome === 'SUCCESS'}
                    onChange={() => setSimulatedOutcome('SUCCESS')}
                  />
                  <span>
                    <strong>SUCCESS</strong> — Simulates successful settlement & confirms registration
                  </span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: simulatedOutcome === 'FAILED' ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="simulated_outcome"
                    value="FAILED"
                    checked={simulatedOutcome === 'FAILED'}
                    onChange={() => setSimulatedOutcome('FAILED')}
                  />
                  <span>
                    <strong>FAILED</strong> — Simulates gateway error / decline (enables retry flow)
                  </span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: simulatedOutcome === 'PENDING' ? 'rgba(234, 179, 8, 0.08)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="simulated_outcome"
                    value="PENDING"
                    checked={simulatedOutcome === 'PENDING'}
                    onChange={() => setSimulatedOutcome('PENDING')}
                  />
                  <span>
                    <strong>PENDING</strong> — Simulates delayed webhook / async settlement
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ minWidth: '130px' }}
              >
                {loading ? 'Processing...' : lastPayment?.payment_status === 'FAILED' ? 'Retry Payment' : `Pay ₹${formattedFee}`}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
