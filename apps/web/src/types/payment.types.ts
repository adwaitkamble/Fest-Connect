export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentRecord {
  payment_id: number;
  registration_id: number;
  attempt_number: number;
  amount: string;
  currency: string;
  payment_status: PaymentStatus;
  payment_method: string;
  transaction_id: string | null;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
  team_id: number;
  team_name: string;
  leader_id: number;
  leader_name: string;
  event_id: number;
  event_name: string;
  registration_status: string;
}

export interface InitiatePaymentRequest {
  registration_id?: number;
  payment_method?: string;
  simulated_outcome?: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface RazorpayOrderResponse {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
  registrationId: number;
  teamName: string;
  eventName: string;
}

export interface RazorpayVerifyRequest {
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

