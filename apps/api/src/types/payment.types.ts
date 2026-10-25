export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentRow {
  payment_id: number;
  registration_id: number;
  attempt_number: number;
  amount: number | string;
  payment_status: PaymentStatus;
  payment_method: string;
  transaction_id: string | null;
  payment_date: string | null;
  success_registration_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  payment_id: number;
  registration_id: number;
  attempt_number: number;
  amount: string; // Formatted 2 decimal places e.g. "250.00"
  currency: string;
  payment_status: PaymentStatus;
  payment_method: string;
  transaction_id: string | null;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentDetailResponse extends PaymentRecord {
  team_id: number;
  team_name: string;
  leader_id: number;
  leader_name: string;
  event_id: number;
  event_name: string;
  registration_status: string;
}

export interface InitiatePaymentDto {
  registration_id: number;
  payment_method?: string;
  simulated_outcome?: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface PaymentGatewayRequest {
  registrationId: number;
  attemptNumber: number;
  amount: number;
  currency: string;
  teamName: string;
  eventName: string;
  participantEmail: string;
  simulatedOutcome?: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface PaymentGatewayResponse {
  transactionId: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  gatewayReference?: string;
  timestamp: Date;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentGatewayAdapter {
  readonly providerName: string;
  processPayment(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse>;
}

export interface RazorpayOrderRequest {
  registrationId: number;
  amount: number;
  currency: string;
  teamName: string;
  eventName: string;
  participantEmail: string;
  attemptNumber: number;
}

export interface RazorpayOrderResponse {
  orderId: string;
  keyId: string;
  amount: number; // In paise (₹250 = 25000)
  currency: string;
  registrationId: number;
  teamName: string;
  eventName: string;
}

export interface RazorpayVerifyDto {
  registration_id: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentConfigResponse {
  activeProvider: string;
  razorpayEnabled: boolean;
  razorpayKeyId: string | null;
  currency: string;
}

