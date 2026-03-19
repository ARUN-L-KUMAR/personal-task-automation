import api from '@/services/api';
import { TaskCreatePayload, TaskItem, TaskQueryParams, TaskUpdatePayload } from '@/types/tasks';

export const dbTasksService = {
  async list(params?: TaskQueryParams): Promise<TaskItem[]> {
    const response = await api.get('/api/db-tasks', { params });
    return response.data;
  },

  async create(payload: TaskCreatePayload): Promise<TaskItem> {
    const response = await api.post('/api/db-tasks', payload);
    return response.data;
  },

  async get(taskId: string): Promise<TaskItem> {
    const response = await api.get(`/api/db-tasks/${taskId}`);
    return response.data;
  },

  async update(taskId: string, payload: TaskUpdatePayload): Promise<TaskItem> {
    const response = await api.put(`/api/db-tasks/${taskId}`, payload);
    return response.data;
  },

  async remove(taskId: string): Promise<void> {
    await api.delete(`/api/db-tasks/${taskId}`);
  },
};
