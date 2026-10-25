import { ScheduleObserver, ScheduleChangeEvent } from '../types/observer.types.js';
import { emailService } from '../services/email.service.js';
import { getDbPool } from '../db/connection.js';
import mysql from 'mysql2/promise';

export class EmailNotificationObserver implements ScheduleObserver {
  readonly name = 'EmailNotificationObserver';

  async onScheduleChanged(event: ScheduleChangeEvent): Promise<void> {
    try {
      const pool = getDbPool();

      // Find all participants (members and leaders) of teams registered with CONFIRMED status for this event
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT DISTINCT p.email, p.first_name, p.last_name
         FROM registration r
         JOIN team_member tm ON r.team_id = tm.team_id
         JOIN participant p ON tm.participant_id = p.participant_id
         WHERE r.event_id = ? AND r.status = 'CONFIRMED'`,
        [event.eventId]
      );

      const recipientEmails = rows.map((r: mysql.RowDataPacket) => r.email as string).filter(Boolean);

      if (recipientEmails.length === 0) {
        console.log(
          `[EmailNotificationObserver] No confirmed participant emails found for Event ${event.eventId} ('${event.eventName}'). Skipping dispatch.`
        );
        return;
      }

      console.log(
        `[EmailNotificationObserver] Dispatching schedule change notification to ${recipientEmails.length} participants for Event ${event.eventId}...`
      );

      const prevTime = `${event.previousSchedule.start_time} - ${event.previousSchedule.end_time}`;

      await emailService.sendScheduleChangeEmail({
        recipients: recipientEmails,
        eventName: event.eventName,
        eventDate: event.updatedSchedule.event_date,
        venue: event.updatedSchedule.venue,
        startTime: event.updatedSchedule.start_time,
        endTime: event.updatedSchedule.end_time,
        previousVenue: event.previousSchedule.venue,
        previousTime: prevTime,
        updatedByName: event.updatedBy.email,
      });
    } catch (err: unknown) {
      // Defensive: Observer execution failure must never roll back schedule changes
      console.error(
        `[EmailNotificationObserver] Error while sending schedule change notifications for Event ${event.eventId}:`,
        (err as Error).message
      );
    }
  }
}

export const emailNotificationObserver = new EmailNotificationObserver();
