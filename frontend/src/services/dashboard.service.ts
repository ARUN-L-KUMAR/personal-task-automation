import api from './api';

// --- Types ---

export interface AgentStatus {
    calendar: 'success' | 'warning' | 'error' | 'grey';
    tasks: 'success' | 'warning' | 'error' | 'grey';
    email: 'success' | 'warning' | 'error' | 'grey';
    conflict: 'success' | 'warning' | 'error' | 'grey';
    travel: 'success' | 'warning' | 'error' | 'grey';
    planning: 'success' | 'warning' | 'error' | 'grey';
}

export interface DashboardStats {
    meetings: number;
    active_tasks: number;
    overdue_tasks: number;
    urgent_tasks: number;
    conflicts: number;
    conflict_severity: 'none' | 'low' | 'medium' | 'high';
    emails: number;
    productivity_score: number;
    travel_minutes: number;
    travel_events: number;
}

export interface TimelineEntry {
    time: string;
    end_time: string;
    title: string;
    type: 'meeting' | 'task' | 'travel' | 'conflict';
    location: string;
}

export interface Conflict {
    event_a: string;
    event_b: string;
    overlap_minutes: number;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
}

export interface TravelSummary {
    total_minutes: number;
    travel_event_count: number;
    longest_route_minutes: number;
    optimization_tip: string;
}

export interface Workload {
    level: 'light' | 'moderate' | 'heavy';
    percentage: number;
    total_items: number;
}

export interface TaskDistribution {
    urgent: number;
    today: number;
    upcoming: number;
}

export interface Insight {
    label: string;
    value: string;
    tone: 'success' | 'warning' | 'danger' | 'info';
}

// --- Layer 1: Database Stats ---

export interface PriorityDistribution {
    high: number;
    medium: number;
    low: number;
}

export interface ProjectTaskCount {
    project: string;
    tasks: number;
}

export interface DbStats {
    total_projects: number;
    active_projects: number;
    total_tasks: number;
    completed_tasks: number;
    completed_this_week: number;
    overdue_db_tasks: number;
    in_progress_tasks: number;
    completion_rate: number;
    priority_distribution: PriorityDistribution;
    tasks_per_project: ProjectTaskCount[];
}

export interface DashboardSummary {
    authenticated: boolean;
    agent_status: AgentStatus;
    db_stats: DbStats;
    stats: DashboardStats;
    timeline: TimelineEntry[];
    conflicts: Conflict[];
    travel: TravelSummary;
    workload: Workload;
    task_distribution: TaskDistribution;
    insights: Insight[];
    events: any[];
    tasks: any[];
    emails: any[];
}

// --- API ---

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
    const response = await api.get('/api/dashboard/summary');
    return response.data;
};

export const seedDashboardData = async (): Promise<{ message: string }> => {
    const response = await api.post('/api/dashboard/seed');
    return response.data;
};
