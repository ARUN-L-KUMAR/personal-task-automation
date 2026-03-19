export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | string;
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project_id: string;
  assigned_to: string;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
}

export interface TaskCreatePayload {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  project_id: string;
  due_date?: string | null;
}

export interface TaskQueryParams {
  project_id?: string;
  status?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}
