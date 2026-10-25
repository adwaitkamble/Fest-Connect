export interface PassReceipt {
  pass_id: number;
  registration_id: number;
  payment_id: number;
  pass_number: string;
  qr_code: string;
  issued_at: string;
}

export interface PassRegistrationInfo {
  registration_id: number;
  team_id: number;
  team_name: string;
  leader_id: number;
  event_id: number;
  event_name: string;
  event_type: string;
  registration_fee: string;
  registration_date: string;
  status: string;
}

export interface PassPaymentInfo {
  payment_id: number;
  amount: string;
  payment_status: string;
  payment_method: string;
  transaction_id: string;
  payment_date: string;
}

export interface PassMemberInfo {
  participant_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface PassScheduleInfo {
  schedule_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
}

export interface PassDetailResponse {
  pass: PassReceipt;
  registration: PassRegistrationInfo;
  payment: PassPaymentInfo;
  members: PassMemberInfo[];
  schedules: PassScheduleInfo[];
  qr_data_url: string;
}

export interface VerifyPassRequest {
  pass_number?: string;
  qr_code?: string;
}

export interface VerifyPassResponse {
  valid: boolean;
  pass?: PassReceipt;
  registration?: PassRegistrationInfo;
  event?: {
    event_id: number;
    event_name: string;
    event_type: string;
    registration_fee: string;
  };
  team?: {
    team_id: number;
    team_name: string;
    leader_id: number;
  };
  payment?: PassPaymentInfo;
  members?: PassMemberInfo[];
  verified_at: string;
  message?: string;
}

export interface EmailNotificationStatus {
  registration_id: number;
  status: 'DELIVERED' | 'FAILED' | 'NOT_SENT';
  recipient: string;
  recipient_name?: string;
  attempts: number;
  last_sent_at: string | null;
  last_attempted_at: string | null;
  provider: string;
  preview_available: boolean;
  message_id?: string;
  error?: string;
  message: string;
}
