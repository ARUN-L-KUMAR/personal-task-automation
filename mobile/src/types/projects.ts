export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | string;

export interface ProjectItem {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  user_id: string;
  created_at: string;
}

export interface ProjectCreatePayload {
  title: string;
  description?: string | null;
  status?: ProjectStatus;
}

export interface ProjectUpdatePayload {
  title?: string;
  description?: string | null;
  status?: ProjectStatus;
}
