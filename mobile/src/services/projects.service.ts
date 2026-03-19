import api from '@/services/api';
import { ProjectCreatePayload, ProjectItem, ProjectUpdatePayload } from '@/types/projects';

export const projectsService = {
  async list(limit = 50, offset = 0): Promise<ProjectItem[]> {
    const response = await api.get('/api/projects', { params: { limit, offset } });
    return response.data;
  },

  async create(payload: ProjectCreatePayload): Promise<ProjectItem> {
    const response = await api.post('/api/projects', payload);
    return response.data;
  },

  async update(projectId: string, payload: ProjectUpdatePayload): Promise<ProjectItem> {
    const response = await api.put(`/api/projects/${projectId}`, payload);
    return response.data;
  },

  async remove(projectId: string): Promise<void> {
    await api.delete(`/api/projects/${projectId}`);
  },
};
