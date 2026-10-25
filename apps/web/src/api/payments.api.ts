import { apiClient } from './client.js';
import { PaymentRecord, InitiatePaymentRequest } from '../types/payment.types.js';

export async function initiatePayment(
  registrationId: number,
  simulatedOutcome: 'SUCCESS' | 'FAILED' | 'PENDING' = 'SUCCESS',
  paymentMethod: string = 'MOCK'
): Promise<PaymentRecord> {
  const payload: InitiatePaymentRequest = {
    payment_method: paymentMethod,
    simulated_outcome: simulatedOutcome,
  };

  return apiClient<PaymentRecord>(`/api/v1/registrations/${registrationId}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchRegistrationPayments(
  registrationId: number
): Promise<PaymentRecord[]> {
  return apiClient<PaymentRecord[]>(`/api/v1/registrations/${registrationId}/payments`);
}

export async function fetchPaymentById(paymentId: number): Promise<PaymentRecord> {
  return apiClient<PaymentRecord>(`/api/v1/payments/${paymentId}`);
}
