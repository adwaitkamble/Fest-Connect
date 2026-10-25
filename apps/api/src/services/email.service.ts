import { EmailFactory } from '../factories/email.factory.js';
import { EmailPayload, EmailSendResult } from '../types/email.types.js';

export interface PassDeliveryEmailParams {
  recipientEmail: string;
  recipientName: string;
  teamName: string;
  eventName: string;
  passNumber: string;
  issueDate: string;
  amountPaid: string | number;
  currency?: string;
}

export interface ScheduleChangeEmailParams {
  recipients: string[];
  eventName: string;
  eventDate: string;
  venue: string;
  startTime: string;
  endTime: string;
  previousVenue?: string;
  previousTime?: string;
  updatedByName?: string;
}

export class EmailService {
  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    try {
      const adapter = EmailFactory.getAdapter();
      return await adapter.sendEmail(payload);
    } catch (err: unknown) {
      console.error('[EmailService] Unexpected error sending email:', (err as Error).message);
      return {
        success: false,
        provider: 'unknown',
        recipientCount: 0,
        error: (err as Error).message,
      };
    }
  }

  async sendPassDeliveryEmail(params: PassDeliveryEmailParams): Promise<EmailSendResult> {
    const currency = params.currency || 'INR';
    const subject = `FestConnect — Official Digital Pass: ${params.passNumber} (${params.eventName})`;

    const text = `
Dear ${params.recipientName},

Congratulations! Your registration for "${params.eventName}" has been confirmed and your official Digital Pass is ready.

Pass Details:
-------------
Pass Number   : ${params.passNumber}
Event Name    : ${params.eventName}
Team Name     : ${params.teamName}
Fee Paid      : ${currency} ${params.amountPaid}
Issued On     : ${params.issueDate}

Please present this Digital Pass (QR code) at the event entrance along with your valid Student ID.

You can also view and download your Digital Pass anytime from your FestConnect dashboard:
http://localhost:5173

Warm regards,
FestConnect Organizing Committee
Object Oriented Modelling and System Design (BCER27PC02)
`.trim();

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2 style="color: #0f172a; border-bottom: 2px solid #22c55e; padding-bottom: 8px;">FestConnect — Official Digital Pass</h2>
  <p>Dear <strong>${params.recipientName}</strong>,</p>
  <p>Your event registration has been successfully confirmed!</p>
  <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #cbd5e1;">
    <p style="margin: 4px 0;"><strong>Pass Number:</strong> <code style="font-size: 1.1em; color: #0284c7;">${params.passNumber}</code></p>
    <p style="margin: 4px 0;"><strong>Event:</strong> ${params.eventName}</p>
    <p style="margin: 4px 0;"><strong>Team:</strong> ${params.teamName}</p>
    <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ${currency} ${params.amountPaid}</p>
    <p style="margin: 4px 0;"><strong>Issue Date:</strong> ${params.issueDate}</p>
  </div>
  <p style="color: #475569; font-size: 0.9em;">
    Important: Present this digital pass and QR code at the event gate along with your Student ID card.
  </p>
  <p style="margin-top: 24px; color: #64748b; font-size: 0.85em;">
    FestConnect Event Registration System • OOMSD (BCER27PC02)
  </p>
</div>
`.trim();

    return this.sendEmail({
      to: params.recipientEmail,
      subject,
      text,
      html,
    });
  }

  async sendScheduleChangeEmail(params: ScheduleChangeEmailParams): Promise<EmailSendResult> {
    if (!params.recipients || params.recipients.length === 0) {
      return {
        success: true,
        provider: 'none',
        recipientCount: 0,
      };
    }

    const subject = `FestConnect Alert — Schedule Update for "${params.eventName}"`;

    const text = `
Notice to Participants of "${params.eventName}":

The event schedule has been officially updated by the event coordinator.

Updated Schedule:
-----------------
Date  : ${params.eventDate}
Time  : ${params.startTime} – ${params.endTime}
Venue : ${params.venue}

${params.previousVenue || params.previousTime ? `Previous Schedule:
Venue : ${params.previousVenue ?? 'Unchanged'}
Time  : ${params.previousTime ?? 'Unchanged'}
` : ''}
Please report to ${params.venue} at least 15 minutes before the start time.

FestConnect Organizing Committee
`.trim();

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2 style="color: #0f172a; border-bottom: 2px solid #eab308; padding-bottom: 8px;">FestConnect — Schedule Update Notice</h2>
  <p>Attention participants of <strong>${params.eventName}</strong>,</p>
  <p>The schedule for this event has been updated:</p>
  <div style="background-color: #fefce8; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #fde047;">
    <p style="margin: 4px 0;"><strong>Date:</strong> ${params.eventDate}</p>
    <p style="margin: 4px 0;"><strong>Timing:</strong> ${params.startTime} – ${params.endTime}</p>
    <p style="margin: 4px 0;"><strong>Venue:</strong> <span style="font-size: 1.1em; color: #854d0e;">${params.venue}</span></p>
  </div>
  <p style="color: #475569; font-size: 0.9em;">
    Please update your calendar accordingly and report on time with your digital pass.
  </p>
  <p style="margin-top: 24px; color: #64748b; font-size: 0.85em;">
    FestConnect Event Registration System • OOMSD (BCER27PC02)
  </p>
</div>
`.trim();

    return this.sendEmail({
      to: params.recipients,
      subject,
      text,
      html,
    });
  }
}

export const emailService = new EmailService();
