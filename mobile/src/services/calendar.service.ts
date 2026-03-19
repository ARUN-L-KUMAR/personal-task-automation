import api from '@/services/api';
import { CalendarEventsResponse } from '@/types/calendar';

export const calendarService = {
  async getTodayEvents(): Promise<CalendarEventsResponse> {
    const response = await api.get('/api/calendar/events');
    return response.data;
  },

  async getRangeEvents(start?: string, end?: string, max_results = 20): Promise<CalendarEventsResponse> {
    const response = await api.get('/api/calendar/events/range', {
      params: { start, end, max_results },
    });
    return response.data;
  },
};
