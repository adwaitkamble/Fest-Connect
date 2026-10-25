import { EmailAdapter, EmailPayload, EmailSendResult } from '../../types/email.types.js';

export interface SentEmailRecord {
  payload: EmailPayload;
  timestamp: Date;
  messageId: string;
}

export class ConsoleEmailAdapter implements EmailAdapter {
  readonly name = 'console';
  private sentEmails: SentEmailRecord[] = [];

  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const messageId = `console-msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const border = '='.repeat(70);
    const divider = '-'.repeat(70);
    const formattedRecipients = recipients.join(', ');

    console.log(`\n${border}`);
    console.log(`[FestConnect ConsoleEmailAdapter] Email Preview Notice:`);
    console.log(`Message-ID : ${messageId}`);
    console.log(`To         : ${formattedRecipients}`);
    console.log(`Subject    : ${payload.subject}`);
    console.log(divider);
    console.log(payload.text);
    console.log(`${border}\n`);

    this.sentEmails.push({
      payload,
      timestamp: new Date(),
      messageId,
    });

    return {
      success: true,
      provider: 'console',
      messageId,
      recipientCount: recipients.length,
    };
  }

  getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }
}

export const consoleEmailAdapter = new ConsoleEmailAdapter();
