import api from '@/services/api';
import { DashboardSummaryResponse } from '@/types/dashboard';

export const dashboardService = {
  async getSummary(): Promise<DashboardSummaryResponse> {
    const response = await api.get('/api/dashboard/summary');
    return response.data;
  },
};
