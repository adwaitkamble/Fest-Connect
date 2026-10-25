import crypto from 'crypto';
import {
  PaymentGatewayAdapter,
  PaymentGatewayRequest,
  PaymentGatewayResponse,
  PaymentStatus,
} from '../../types/payment.types.js';
import { ForbiddenError } from '../../errors/app-error.js';

export class MockPaymentGatewayAdapter implements PaymentGatewayAdapter {
  public readonly providerName = 'MOCK';

  async processPayment(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    // Invariant: Mock payment processing is disabled in production
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenError('Mock payment gateway is strictly prohibited in production environment.');
    }

    const outcome: PaymentStatus = request.simulatedOutcome || 'SUCCESS';
    const timestamp = new Date();
    const entropy = crypto.randomBytes(4).toString('hex').toUpperCase();

    let transactionId: string;
    let gatewayReference: string;

    switch (outcome) {
      case 'FAILED':
        transactionId = `MOCK-FAIL-${Date.now()}-${entropy}`;
        gatewayReference = 'MOCK_GW_SIMULATED_DECLINE';
        break;
      case 'PENDING':
        transactionId = `MOCK-PEND-${Date.now()}-${entropy}`;
        gatewayReference = 'MOCK_GW_SIMULATED_PENDING_WEBHOOK';
        break;
      case 'SUCCESS':
      default:
        transactionId = `MOCK-SUCC-${Date.now()}-${entropy}`;
        gatewayReference = 'MOCK_GW_SIMULATED_SETTLED';
        break;
    }

    // Never log credit cards or secrets. Server-side demo audit only:
    console.log(
      `[MockPaymentGatewayAdapter] Simulated ${outcome} for Registration ${request.registrationId} ` +
      `(Attempt ${request.attemptNumber}, Amount: ${request.currency} ${request.amount.toFixed(2)}, Txn: ${transactionId})`
    );

    return {
      transactionId,
      paymentStatus: outcome,
      paymentMethod: this.providerName,
      gatewayReference,
      timestamp,
      rawResponse: {
        simulated: true,
        notice: 'Demo payment — no real money is charged',
        teamName: request.teamName,
        eventName: request.eventName,
      },
    };
  }
}
