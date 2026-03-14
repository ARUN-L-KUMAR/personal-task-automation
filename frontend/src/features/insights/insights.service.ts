import api from '../../services/api';

export interface Metric {
    id: string;
    date: string;
    tasks_completed: number;
    meetings_count: number;
    travel_minutes: number;
    productivity_score: number | null;
}

export const insightsService = {
    async list(days = 30): Promise<Metric[]> {
        const { data } = await api.get(`/api/metrics?days=${days}`);
        return data;
    },
    async latest(): Promise<Metric | null> {
        const { data } = await api.get('/api/metrics/latest');
        return data.id ? data : null;
    },
};
