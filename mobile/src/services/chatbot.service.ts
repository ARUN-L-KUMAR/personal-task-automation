import api from '@/services/api';
import { ChatAskPayload, ChatAskResponse } from '@/types/chatbot';

export const chatbotService = {
  async ask(payload: ChatAskPayload): Promise<ChatAskResponse> {
    const response = await api.post('/api/chatbot/ask', payload);
    const data = response.data || {};
    return {
      ...data,
      response: data.response || data.reply || '',
    };
  },
};
