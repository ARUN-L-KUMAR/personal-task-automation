import { create } from 'zustand';
import {
    PlanMode,
    PlannerSettings,
    MeetingInput,
    TaskInput,
    PlannerResult,
    AgentStep,
    PlanHistoryItem,
} from '../types/planner.types';

const AGENT_PIPELINE: { key: string; label: string }[] = [
    { key: 'calendar', label: 'Calendar Agent' },
    { key: 'tasks', label: 'Task Agent' },
    { key: 'email', label: 'Email Agent' },
    { key: 'conflict', label: 'Conflict Agent' },
    { key: 'travel', label: 'Travel Agent' },
    { key: 'planning', label: 'Planning Agent' },
    { key: 'explanation', label: 'Explanation Agent' },
];

type ExecutionPhase = 'idle' | 'running' | 'optimizing' | 'completed' | 'error';

interface PlannerState {
    // Mode
    mode: PlanMode;
    setMode: (mode: PlanMode) => void;

    // Settings
    settings: PlannerSettings;
    updateSettings: (patch: Partial<PlannerSettings>) => void;

    // Input data
    meetings: MeetingInput[];
    tasks: TaskInput[];
    addMeeting: (m: MeetingInput) => void;
    removeMeeting: (id: string) => void;
    updateMeeting: (id: string, patch: Partial<MeetingInput>) => void;
    setMeetings: (meetings: MeetingInput[]) => void;
    addTask: (t: TaskInput) => void;
    removeTask: (id: string) => void;
    updateTask: (id: string, patch: Partial<TaskInput>) => void;
    setTasks: (tasks: TaskInput[]) => void;

    // Execution
    executionPhase: ExecutionPhase;
    agentSteps: AgentStep[];
    setAgentStepStatus: (key: string, status: AgentStep['status'], summary?: string) => void;

    // Result
    currentResult: PlannerResult | null;
    error: string | null;

    // History
    history: PlanHistoryItem[];
    setHistory: (h: PlanHistoryItem[]) => void;

    // Actions
    startExecution: () => void;
    setExecutionPhase: (phase: ExecutionPhase) => void;
    completeExecution: (result: PlannerResult) => void;
    failExecution: (error: string) => void;
    reset: () => void;
}

const today = new Date().toISOString().split('T')[0];

const initialSettings: PlannerSettings = {
    date: today,
    workStart: '09:00',
    workEnd: '18:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    preference: 'balanced',
};

const buildInitialSteps = (): AgentStep[] =>
    AGENT_PIPELINE.map((a) => ({ key: a.key, label: a.label, status: 'idle' as const }));

export const usePlannerStore = create<PlannerState>((set) => ({
    mode: 'manual',
    setMode: (mode) => set({ mode }),

    settings: { ...initialSettings },
    updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

    meetings: [],
    tasks: [],

    addMeeting: (m) => set((s) => ({ meetings: [...s.meetings, m] })),
    removeMeeting: (id) => set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) })),
    updateMeeting: (id, patch) =>
        set((s) => ({
            meetings: s.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
    setMeetings: (meetings) => set({ meetings }),

    addTask: (t) => set((s) => ({ tasks: [...s.tasks, t] })),
    removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
    updateTask: (id, patch) =>
        set((s) => ({
            tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
    setTasks: (tasks) => set({ tasks }),

    executionPhase: 'idle',
    agentSteps: buildInitialSteps(),
    setAgentStepStatus: (key, status, summary) =>
        set((s) => ({
            agentSteps: s.agentSteps.map((a) =>
                a.key === key ? { ...a, status, summary } : a
            ),
        })),

    currentResult: null,
    error: null,
    history: [],
    setHistory: (history) => set({ history }),

    startExecution: () =>
        set({
            executionPhase: 'running',
            agentSteps: buildInitialSteps(),
            currentResult: null,
            error: null,
        }),

    setExecutionPhase: (phase: ExecutionPhase) => set({ executionPhase: phase }),

    completeExecution: (result) =>
        set({ executionPhase: 'completed', currentResult: result }),

    failExecution: (error) => set({ executionPhase: 'error', error }),

    reset: () =>
        set({
            executionPhase: 'idle',
            agentSteps: buildInitialSteps(),
            currentResult: null,
            error: null,
        }),
}));
