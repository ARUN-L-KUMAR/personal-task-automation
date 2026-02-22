export interface Meeting {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    priority: 'low' | 'medium' | 'high';
}

export interface Task {
    id: string;
    title: string;
    duration: number; // in minutes
    deadline?: string;
    priority: 'low' | 'medium' | 'high';
}

export interface PlannerInput {
    date: string;
    meetings: Meeting[];
    tasks: Task[];
    preferences?: {
        workDayStart: string;
        workDayEnd: string;
        breakDuration: number;
    };
}

export interface PlannerResult {
    calendar_analysis: string;
    task_analysis: string;
    conflict_analysis: string;
    travel_reminders: string;
    rule_based_plan: string;
    ai_explanation: string;
    generated_at: string;
}

export interface PlanHistoryItem {
    id: string;
    input: PlannerInput;
    output: PlannerResult;
    timestamp: string;
}
