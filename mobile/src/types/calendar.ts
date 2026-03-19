export interface CalendarEvent {
  id?: string;
  title?: string;
  summary?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
}

export interface CalendarEventsResponse {
  status: string;
  events: CalendarEvent[];
  count: number;
}
