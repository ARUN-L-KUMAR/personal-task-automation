/* ─── Planner Types v2.0 — AI Orchestration Engine ─── */

// ── Input Types ──

export type Priority = 'low' | 'medium' | 'high';
export type PlanMode = 'manual' | 'live';
export type ProductivityPreference = 'balanced' | 'aggressive' | 'relaxed';
export type TaskCategory = 'work' | 'personal' | 'study';

export interface MeetingInput {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location: string;
    priority: Priority;
    isFlexible: boolean;
}

export interface TaskInput {
    id: string;
    title: string;
    deadline: string;
    estimatedDuration: number; // minutes
    priority: Priority;
    requiresTravel: boolean;
    flexibleDeadline: boolean;
    category: TaskCategory;
}

export interface PlannerSettings {
    date: string;
    workStart: string;
    workEnd: string;
    timezone: string;
    preference: ProductivityPreference;
}

export interface PlannerInput {
    settings: PlannerSettings;
    meetings: MeetingInput[];
    tasks: TaskInput[];
    mode: PlanMode;
}

// ── Agent Execution ──

export type AgentExecutionStatus = 'idle' | 'running' | 'success' | 'warning' | 'error';

export interface AgentStep {
    key: string;
    label: string;
    status: AgentExecutionStatus;
    summary?: string;
    durationMs?: number;
}

// ── Output Types ──

export interface ScheduleEntry {
    time: string;
    endTime: string;
    title: string;
    type: 'meeting' | 'task' | 'travel' | 'break' | 'free';
    priority?: Priority;
    location?: string;
    isConflictAdjusted?: boolean;
}

export interface ConflictItem {
    type: string;
    severity: 'low' | 'medium' | 'high';
    eventA: string;
    eventB: string;
    overlapMinutes: number;
    suggestion: string;
}

export interface TravelPlan {
    totalMinutes: number;
    travelEventCount: number;
    longestRouteMinutes: number;
    optimizationTip: string;
    routes: { from: string; to: string; minutes: number; departure: string }[];
}

export interface AIExplanation {
    summary: string;
    issues: string[];
    recommendations: string[];
    timeManagement: string;
}

export interface IntelligenceInsights {
    overloadDetected: boolean;
    overloadMessage?: string;
    burnoutRisk: boolean;
    burnoutMessage?: string;
    focusWindow?: string;
    productivityScore: number;
    utilizationPercent?: number;
    freeTimeMinutes?: number;
}

export interface PlannerResult {
    status: string;
    generated_at: string;
    schedule: ScheduleEntry[];
    conflicts: ConflictItem[];
    travel: TravelPlan;
    explanation: AIExplanation;
    insights: IntelligenceInsights;
    agentRawData: Record<string, any>;
    // Legacy compat
    conflict_analysis?: string;
    travel_reminders?: string;
    rule_based_plan?: string;
    ai_explanation?: string;
    calendar_analysis?: string;
    task_analysis?: string;
}

export interface PlanHistoryItem {
    id: string;
    input: PlannerInput;
    output: PlannerResult;
    timestamp: string;
}
