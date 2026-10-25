export interface EmailPayload {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSendResult {
  success: boolean;
  provider: string;
  messageId?: string;
  previewUrl?: string;
  recipientCount: number;
  error?: string;
}

export interface EmailAdapter {
  readonly name: string;
  sendEmail(payload: EmailPayload): Promise<EmailSendResult>;
}
