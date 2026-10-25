export interface PassReceiptRecord {
  pass_id: number;
  registration_id: number;
  payment_id: number;
  pass_number: string;
  qr_code: string;
  issue_date: Date | string;
}

export interface CreatePassData {
  registration_id: number;
  payment_id: number;
  pass_number: string;
  qr_code: string;
}

export interface PassMemberInfo {
  participant_id: number;
  name: string;
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
  pass: PassReceiptRecord;
  qr_data_url: string;
  registration: {
    registration_id: number;
    team_id: number;
    team_name: string;
    leader_id: number;
    leader_name: string;
    event_id: number;
    event_name: string;
    event_type: string;
    registration_fee: string;
    status: string;
    registration_date: string;
  };
  payment: {
    payment_id: number;
    amount: number;
    payment_status: string;
    transaction_id: string | null;
    payment_date: string | null;
  };
  members: PassMemberInfo[];
  schedules: PassScheduleInfo[];
}

export interface VerifyPassRequest {
  pass_number?: string;
  qr_code?: string;
  pass_token?: string;
  token?: string;
}

export interface VerifyPassResponse {
  valid: boolean;
  message: string;
  pass: PassReceiptRecord | null;
  event?: {
    event_id: number;
    event_name: string;
    event_type: string;
  };
  team?: {
    team_id: number;
    team_name: string;
    leader_name: string;
  };
  payment?: {
    payment_id: number;
    transaction_id: string | null;
    amount: number;
  };
  members?: {
    name: string;
    email: string;
    role: string;
  }[];
  verified_at: string;
}
