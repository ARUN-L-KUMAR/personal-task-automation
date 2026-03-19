export interface ChatbotMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  usedContext?: boolean;
  error?: boolean;
  meta?: Record<string, unknown>;
}

export interface ChatAskPayload {
  message: string;
  history: ChatbotMessage[];
}

export interface ChatAskResponse {
  status?: string;
  response?: string;
  reply?: string;
  model?: string;
  model_source?: string;
  used_context?: boolean;
  context_sources?: string[];
  agents_used?: string[];
}

export interface ChatThreadSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatbotMessage[];
  createdAt: string;
  updatedAt: string;
}
