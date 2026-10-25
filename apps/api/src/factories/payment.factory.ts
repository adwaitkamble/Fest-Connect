import { getEnv } from '../config/env.js';
import { PaymentGatewayAdapter } from '../types/payment.types.js';
import { MockPaymentGatewayAdapter } from '../adapters/payment/mock-payment-gateway.adapter.js';
import { ValidationError, ForbiddenError } from '../errors/app-error.js';

export class PaymentFactory {
  /**
   * Instantiates the configured or requested payment gateway adapter.
   *
   * @param requestedProvider Optional provider name override (defaults to PAYMENT_PROVIDER config).
   * @returns PaymentGatewayAdapter instance.
   * @throws ForbiddenError if mock provider is attempted in production.
   * @throws ValidationError if an unsupported provider is requested.
   */
  static getAdapter(requestedProvider?: string): PaymentGatewayAdapter {
    const env = getEnv();
    const providerKey = (requestedProvider || env.PAYMENT_PROVIDER || 'mock').trim().toLowerCase();

    if (providerKey === 'mock') {
      if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') {
        throw new ForbiddenError(
          'Production configuration forbids the mock payment provider. Real provider integration required.'
        );
      }
      return new MockPaymentGatewayAdapter();
    }

    // Supported real providers placeholder (Phase 06 strictly uses Mock, refusing real money)
    if (providerKey === 'razorpay' || providerKey === 'stripe') {
      throw new ValidationError(
        `Payment provider '${providerKey}' is configured but real money gateways are not enabled in this build.`
      );
    }

    throw new ValidationError(
      `Unsupported payment provider: '${providerKey}'. Valid options in development are: 'mock'.`
    );
  }
}
