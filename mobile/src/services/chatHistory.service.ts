import api from '@/services/api';
import { ChatbotMessage, ChatThread, ChatThreadSummary } from '@/types/chatbot';

function normalizeMessage(msg: any): ChatbotMessage {
  return {
    id: msg.id || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content || '',
    timestamp: msg.timestamp || new Date().toISOString(),
    usedContext: msg.usedContext,
    error: msg.error,
    meta: msg.meta,
  };
}

export const chatHistoryService = {
  async listThreads(): Promise<ChatThreadSummary[]> {
    const response = await api.get('/api/chat-history/sessions');
    return response.data.map((item: any) => ({
      id: item.id,
      title: item.title,
      messageCount: item.message_count || 0,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  async getThread(sessionId: string): Promise<ChatThread> {
    const response = await api.get(`/api/chat-history/sessions/${sessionId}`);
    return {
      id: response.data.id,
      title: response.data.title,
      messages: (response.data.messages || []).map(normalizeMessage),
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
    };
  },

  async saveThread(payload: {
    sessionId?: string;
    title: string;
    messages: ChatbotMessage[];
  }): Promise<ChatThread> {
    const response = await api.post('/api/chat-history/sessions', {
      session_id: payload.sessionId,
      title: payload.title,
      messages: payload.messages,
    });

    return {
      id: response.data.id,
      title: response.data.title,
      messages: (response.data.messages || []).map(normalizeMessage),
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
    };
  },

  async deleteThread(sessionId: string): Promise<void> {
    await api.delete(`/api/chat-history/sessions/${sessionId}`);
  },
};
