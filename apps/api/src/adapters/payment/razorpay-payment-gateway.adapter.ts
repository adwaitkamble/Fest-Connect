import crypto from 'crypto';
import {
  PaymentGatewayAdapter,
  PaymentGatewayRequest,
  PaymentGatewayResponse,
  RazorpayOrderRequest,
  RazorpayOrderResponse,
} from '../../types/payment.types.js';
import { AppError, ValidationError } from '../../errors/app-error.js';

/**
 * Razorpay Payment Gateway Adapter.
 * Conforms to the GoF Adapter Pattern, translating Razorpay's REST API & HMAC-SHA256
 * cryptographic verification into the unified FestConnect PaymentGatewayAdapter interface.
 */
export class RazorpayPaymentGatewayAdapter implements PaymentGatewayAdapter {
  readonly providerName = 'RAZORPAY';

  constructor(
    private readonly keyId: string,
    private readonly keySecret: string
  ) {
    if (!keyId || !keySecret) {
      throw new ValidationError(
        'Razorpay adapter requires valid keyId and keySecret to be initialized.'
      );
    }
  }

  /**
   * Creates an official order on Razorpay servers via REST API.
   * Amount is sent in the smallest currency unit (e.g., paise for INR).
   */
  async createOrder(request: RazorpayOrderRequest): Promise<RazorpayOrderResponse> {
    const amountInPaise = Math.round(request.amount * 100);
    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

    const payload = {
      amount: amountInPaise,
      currency: request.currency || 'INR',
      receipt: `reg_${request.registrationId}_att${request.attemptNumber}`.slice(0, 40),
      notes: {
        registration_id: String(request.registrationId),
        team_name: String(request.teamName).slice(0, 40),
        event_name: String(request.eventName).slice(0, 40),
        participant_email: String(request.participantEmail).slice(0, 40),
      },
    };

    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[Razorpay Adapter] Order creation failed:', response.status, errorBody);
        throw new AppError(
          502,
          'INTERNAL_SERVER_ERROR',
          `Razorpay order creation failed: HTTP ${response.status}. Please check your API keys.`
        );
      }

      const orderData = (await response.json()) as { id: string };

      return {
        orderId: orderData.id,
        keyId: this.keyId,
        amount: amountInPaise,
        currency: request.currency || 'INR',
        registrationId: request.registrationId,
        teamName: request.teamName,
        eventName: request.eventName,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        502,
        'INTERNAL_SERVER_ERROR',
        `Network failure connecting to Razorpay: ${(err as Error).message}`
      );
    }
  }

  /**
   * Cryptographically verifies the payment signature returned by the client.
   * Uses timingSafeEqual to protect against timing analysis attacks.
   */
  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    try {
      const payload = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(payload)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
      const receivedBuffer = Buffer.from(signature, 'utf-8');

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Fetches payment details from Razorpay to inspect capture status.
   */
  async fetchPaymentDetails(paymentId: string): Promise<Record<string, unknown>> {
    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });

    if (!response.ok) {
      throw new AppError(
        502,
        'INTERNAL_SERVER_ERROR',
        `Failed to fetch payment details from Razorpay: HTTP ${response.status}`
      );
    }

    return (await response.json()) as Record<string, unknown>;
  }

  /**
   * Unified interface implementation for PaymentGatewayAdapter.
   */
  async processPayment(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    // In standard web checkout, payment is performed via client popup then verified on server.
    // If processPayment is invoked directly, verify amount is non-negative and create placeholder reference.
    if (request.amount < 0) {
      throw new ValidationError('Payment amount cannot be negative.');
    }

    return {
      transactionId: `RZP-PENDING-${request.registrationId}-${Date.now()}`,
      paymentStatus: 'PENDING',
      paymentMethod: this.providerName,
      gatewayReference: `RAZORPAY_CHECKOUT_${request.registrationId}`,
      timestamp: new Date(),
    };
  }
}
