import api from '../../services/api';
import { PlanHistoryItem } from '../../types/planner.types';

export const historyService = {
    getLastOutput: async (): Promise<PlanHistoryItem> => {
        const response = await api.get('/api/last-output');
        return response.data;
    },

    getHistory: async (): Promise<PlanHistoryItem[]> => {
        const response = await api.get('/api/ai-plans');
        return response.data;
    },

    deleteHistory: async (id: string): Promise<void> => {
        await api.delete(`/api/ai-plans/${id}`);
    },
};
