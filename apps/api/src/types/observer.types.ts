export interface ScheduleChangeEvent {
  eventId: number;
  eventName: string;
  scheduleId: number;
  previousSchedule: {
    venue: string;
    event_date: string;
    start_time: string;
    end_time: string;
  };
  updatedSchedule: {
    venue: string;
    event_date: string;
    start_time: string;
    end_time: string;
  };
  updatedBy: {
    userId: number;
    email: string;
    role: string;
  };
  timestamp: Date;
}

export interface ScheduleObserver {
  readonly name: string;
  onScheduleChanged(event: ScheduleChangeEvent): Promise<void>;
}

export interface ScheduleSubject {
  addObserver(observer: ScheduleObserver): void;
  removeObserver(observerName: string): void;
  notifyObservers(event: ScheduleChangeEvent): Promise<void>;
}
