export interface DashboardStats {
  meetings: number;
  active_tasks: number;
  overdue_tasks: number;
  urgent_tasks: number;
  conflicts: number;
  conflict_severity: string;
  emails: number;
  productivity_score: number;
  travel_minutes: number;
  travel_events: number;
}

export interface DashboardInsight {
  label: string;
  value: string;
  tone: 'danger' | 'warning' | 'success' | 'info' | string;
}

export interface DashboardSummaryResponse {
  authenticated: boolean;
  stats: DashboardStats;
  insights: DashboardInsight[];
  events: Array<{ title?: string; summary?: string; start?: string; end?: string; location?: string }>;
  tasks: Array<{ title?: string; due?: string }>;
}
