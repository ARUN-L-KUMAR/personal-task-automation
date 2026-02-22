import api from '../../services/api';
import { PlannerInput, PlannerResult } from '../../types/planner.types';

export const plannerService = {
    planDay: async (input: PlannerInput): Promise<PlannerResult> => {
        const response = await api.post('/plan-day', input);
        return response.data;
    },

    planDayFromDb: async (input: PlannerInput): Promise<PlannerResult> => {
        const response = await api.post('/plan-day-from-db', input);
        return response.data;
    },

    getLastInput: async () => {
        const response = await api.get('/last-input');
        return response.data;
    }
};
