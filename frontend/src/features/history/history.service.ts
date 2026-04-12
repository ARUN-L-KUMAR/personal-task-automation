import api from '../../services/api';
import { PlanHistoryItem } from '../../types/planner.types';

export interface AgentLogHistoryItem {
    id: string;
    plan_id: string;
    agent_name: string;
    status: string;
    execution_time_ms?: number;
    output?: Record<string, unknown>;
    log_level?: string;
    created_at?: string;
}

export interface ChatSessionHistoryItem {
    id: string;
    title: string;
    message_count: number;
    created_at: string;
    updated_at: string;
}

export const historyService = {
    getLastOutput: async (): Promise<PlanHistoryItem> => {
        const response = await api.get('/api/last-output');
        return response.data;
    },

    getHistory: async (): Promise<PlanHistoryItem[]> => {
        const response = await api.get('/api/ai-plans');
        return response.data;
    },

    getAgentLogs: async (): Promise<AgentLogHistoryItem[]> => {
        const response = await api.get('/api/agent-logs');
        return response.data;
    },

    getChatSessions: async (): Promise<ChatSessionHistoryItem[]> => {
        const response = await api.get('/api/chat-history/sessions');
        return response.data;
    },

    deleteHistory: async (id: string): Promise<void> => {
        await api.delete(`/api/ai-plans/${id}`);
    },
};
