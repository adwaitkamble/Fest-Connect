import nodemailer, { type Transporter } from 'nodemailer';
import { EmailAdapter, EmailPayload, EmailSendResult } from '../../types/email.types.js';

export interface GmailAdapterOptions {
  user?: string;
  appPassword?: string;
}

export class GmailSmtpAdapter implements EmailAdapter {
  readonly name = 'gmail';
  private user?: string;
  private appPassword?: string;
  private transporter?: Transporter;

  constructor(options?: GmailAdapterOptions) {
    this.user = options?.user;
    this.appPassword = options?.appPassword;

    if (this.user && this.appPassword) {
      try {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: this.user,
            pass: this.appPassword,
          },
        });
      } catch (err) {
        console.warn('[GmailSmtpAdapter] Failed to initialize nodemailer transporter:', (err as Error).message);
      }
    }
  }

  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    if (!this.user || !this.appPassword || !this.transporter) {
      console.warn(
        `[GmailSmtpAdapter] Gmail credentials are not configured or incomplete. Suppressing live SMTP send for ${recipients.length} recipients.`
      );
      return {
        success: false,
        provider: 'gmail',
        recipientCount: 0,
        error: 'Gmail SMTP credentials missing or incomplete. Switched to safe fallback.',
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"FestConnect System" <${this.user}>`,
        to: recipients.join(', '),
        subject: payload.subject,
        text: payload.text,
        html: payload.html || `<p>${payload.text.replace(/\n/g, '<br/>')}</p>`,
      });

      return {
        success: true,
        provider: 'gmail',
        messageId: info.messageId,
        recipientCount: recipients.length,
      };
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Unknown SMTP transport error';
      // Safety: Never log credentials or tokens
      console.error(`[GmailSmtpAdapter] Live email delivery failed safely: ${errorMessage}`);
      return {
        success: false,
        provider: 'gmail',
        recipientCount: 0,
        error: errorMessage,
      };
    }
  }
}
