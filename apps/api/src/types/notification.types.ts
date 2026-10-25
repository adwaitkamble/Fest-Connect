export type NotificationStatus = 'DELIVERED' | 'FAILED' | 'NOT_SENT';

export interface EmailNotificationStatus {
  registration_id: number;
  status: NotificationStatus;
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

export interface SendEmailNotificationRequest {
  force?: boolean;
}

export interface SendEmailNotificationResponse {
  success: boolean;
  message: string;
  data: EmailNotificationStatus;
}
