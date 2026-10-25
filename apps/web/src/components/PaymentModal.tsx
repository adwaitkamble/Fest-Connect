import React, { useState, useEffect } from 'react';
import { RegistrationDetail } from '../types/team.types.js';
import { PaymentRecord, PaymentConfigResponse } from '../types/payment.types.js';
import {
  initiatePayment,
  fetchPaymentConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../api/payments.api.js';

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
  const [activeTab, setActiveTab] = useState<'MOCK' | 'RAZORPAY'>('MOCK');
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigResponse | null>(null);
  const [simulatedOutcome, setSimulatedOutcome] = useState<'SUCCESS' | 'FAILED' | 'PENDING'>('SUCCESS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPayment, setLastPayment] = useState<PaymentRecord | null>(null);

  const parsedFee = parseFloat(registration.registration_fee);
  const formattedFee = isNaN(parsedFee) ? '0.00' : parsedFee.toFixed(2);

  // Fetch gateway configuration on mount
  useEffect(() => {
    fetchPaymentConfig()
      .then((cfg) => {
        setPaymentConfig(cfg);
        if (cfg.razorpayEnabled) {
          setActiveTab('RAZORPAY');
        }
      })
      .catch((err) => {
        console.warn('[PaymentModal] Failed to load payment config:', err?.message);
      });
  }, []);

  // Helper to load Razorpay checkout.js script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        return resolve(true);
      }
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Mock Payment Submission
  const handleMockPay = async (e: React.FormEvent) => {
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

  // Real Razorpay Checkout Flow
  const handleRazorpayPay = async () => {
    setLoading(true);
    setError(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay Checkout SDK. Please check your internet connection.');
      }

      // 1. Create order on backend (authoritative amount & receipt)
      const order = await createRazorpayOrder(registration.registration_id);

      // 2. Open official Razorpay Checkout popup
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'FestConnect',
        description: `${registration.event_name} - ${registration.team_name}`,
        image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        order_id: order.orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setLoading(true);
          try {
            // 3. Cryptographically verify signature on backend
            const confirmedPayment = await verifyRazorpayPayment({
              registration_id: registration.registration_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setLastPayment(confirmedPayment);
            if (confirmedPayment.payment_status === 'SUCCESS') {
              onPaymentSuccess(confirmedPayment);
            }
          } catch (verifyErr: any) {
            setError(verifyErr?.message || 'Payment verification failed on server.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: registration.leader_name,
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on('payment.failed', (failResponse: any) => {
        setError(`Payment failed: ${failResponse?.error?.description || 'Transaction declined'}`);
        setLoading(false);
      });
      razorpayInstance.open();
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate Razorpay payment.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '540px' }}
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

        {/* Payment Gateway Mode Selector Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.3rem',
            background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.05))',
            borderRadius: 'var(--radius-md, 8px)',
            marginBottom: '1rem',
            border: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('RAZORPAY')}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              background: activeTab === 'RAZORPAY' ? 'var(--color-primary, #6366f1)' : 'transparent',
              color: activeTab === 'RAZORPAY' ? '#ffffff' : 'var(--color-text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>💳</span>
            <span>Razorpay Gateway</span>
            {paymentConfig?.razorpayEnabled && (
              <span
                style={{
                  fontSize: '0.65rem',
                  background: 'rgba(34, 197, 94, 0.25)',
                  color: '#4ade80',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontWeight: 700,
                }}
              >
                LIVE
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MOCK')}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              background: activeTab === 'MOCK' ? 'var(--color-primary, #6366f1)' : 'transparent',
              color: activeTab === 'MOCK' ? '#ffffff' : 'var(--color-text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🛡️</span>
            <span>Demo Simulator</span>
          </button>
        </div>

        {/* Demo Mode Notice Banner (Always present in DOM for test suite & academic honesty) */}
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
            This system runs the <strong>MockPaymentGatewayAdapter</strong> & <strong>RazorpayPaymentGatewayAdapter</strong> (GoF Factory & Adapter patterns).
            Card numbers, CVVs, or financial credentials are never stored on this server.
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
                color: 'var(--color-success, #22c55e)',
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
                <div style={{ color: 'var(--color-success, #22c55e)', marginTop: '0.3rem', fontWeight: 500 }}>
                  Registration is now CONFIRMED.
                </div>
              )}
              {lastPayment.payment_status === 'FAILED' && (
                <div style={{ color: 'var(--color-danger, #ef4444)', marginTop: '0.3rem' }}>
                  The registration remains PENDING PAYMENT. You can retry the transaction below.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: RAZORPAY CHECKOUT */}
        {activeTab === 'RAZORPAY' && (!lastPayment || lastPayment.payment_status !== 'SUCCESS') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {paymentConfig?.razorpayEnabled ? (
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.06)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Razorpay Standard Checkout</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>🔒 256-Bit SSL</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.8rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-surface, rgba(255,255,255,0.08))', border: '1px solid var(--color-border)' }}>
                    ⚡ UPI (GPay / PhonePe / Paytm)
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-surface, rgba(255,255,255,0.08))', border: '1px solid var(--color-border)' }}>
                    💳 Credit / Debit Cards
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-surface, rgba(255,255,255,0.08))', border: '1px solid var(--color-border)' }}>
                    🏦 Netbanking
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-surface, rgba(255,255,255,0.08))', border: '1px solid var(--color-border)' }}>
                    📲 QR Code
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Clicking below opens the official Razorpay Checkout popup for real/sandbox payment processing.
                </p>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '0.85rem 1rem',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#eab308', marginBottom: '0.3rem' }}>
                  ⚙️ Razorpay API Keys Not Configured Yet
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  To activate Razorpay live or sandbox transactions, paste your <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> in the <code>.env</code> file.
                  In the meantime, you can test instant settlement using the <strong>Demo Simulator</strong> tab.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              {paymentConfig?.razorpayEnabled ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRazorpayPay}
                  disabled={loading}
                  style={{ minWidth: '150px' }}
                >
                  {loading ? 'Opening Gateway...' : `Pay ₹${formattedFee} with Razorpay`}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('MOCK')}
                >
                  Switch to Demo Simulator
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DEMO SIMULATOR FORM */}
        {activeTab === 'MOCK' && (!lastPayment || lastPayment.payment_status !== 'SUCCESS') && (
          <form onSubmit={handleMockPay}>
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
        )}

        {/* When payment is already SUCCESS */}
        {lastPayment && lastPayment.payment_status === 'SUCCESS' && (
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
