import api from './api';

export const calendarService = {
    /** Fetch today's events */
    getTodayEvents: () =>
        api.get('/api/calendar/events'),

    /** Fetch events in a date range */
    getEventsRange: (start: string, end: string, maxResults = 50) =>
        api.get('/api/calendar/events/range', { params: { start, end, max_results: maxResults } }),

    /** Create a new Google Calendar event */
    createEvent: (eventData: {
        summary: string;
        start_time: string;
        end_time: string;
        location?: string;
        description?: string;
    }) => api.post('/api/calendar/events', eventData),
};

export default calendarService;
