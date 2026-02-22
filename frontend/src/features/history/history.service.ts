import api from '../../services/api';
import { PlanHistoryItem } from '../../types/planner.types';

export const historyService = {
    getLastOutput: async (): Promise<PlanHistoryItem> => {
        const response = await api.get('/last-output');
        return response.data;
    },

    // Future: fetch all history
    getHistory: async (): Promise<PlanHistoryItem[]> => {
        // This endpoint might not exist yet, placeholder
        const response = await api.get('/last-output'); // reusing for now
        return [response.data];
    }
};
