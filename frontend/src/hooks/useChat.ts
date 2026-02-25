/**
 * Shared chat logic — used by both ChatbotPage and FloatingChatWidget.
 */
import { useState, useRef, useCallback } from 'react';
import api from '../services/api';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    usedContext?: boolean;
    error?: boolean;
    /** Extended metadata for assistant messages */
    meta?: {
        model?: string;
        modelSource?: string;
        latency?: number;
        contextSources?: string[];
        agentsUsed?: string[];
        memoryMessages?: number;
    };
}

export interface ContextSnapshot {
    next_meeting: { title: string; start: string; end: string; location: string } | null;
    unread_emails: number;
    urgent_emails: number;
    pending_tasks: number;
    conflicts_today: number;
    connected_services: string[];
    authenticated: boolean;
}

export interface AvailableModel {
    key: string;
    label: string;
    provider?: string;
    description: string;
    available: boolean;
}

export function useChat() {
    const WELCOME: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: "👋 Hi! I'm **G-One**, your AI personal assistant.\n\nI can help with your **calendar**, **tasks**, **emails**, **maps**, and more. What would you like to know?",
        timestamp: new Date(),
    };

    const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentModel, setCurrentModel] = useState<string>('Llama 3.3');
    const [currentModelSource, setCurrentModelSource] = useState<string>('Groq');
    const [selectedModel, setSelectedModel] = useState<string>('auto');
    const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
    const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(null);
    const [contextLoading, setContextLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () =>
        endRef.current?.scrollIntoView({ behavior: 'smooth' });

    /** Fetch live context snapshot for the panel */
    const fetchContextSnapshot = useCallback(async () => {
        setContextLoading(true);
        try {
            const res = await api.get('/api/chatbot/context-snapshot');
            if (res.data?.snapshot) {
                setContextSnapshot(res.data.snapshot);
            }
        } catch {
            // Silently fail — panel will show placeholder
        } finally {
            setContextLoading(false);
        }
    }, []);

    /** Fetch available AI models from backend */
    const fetchAvailableModels = useCallback(async () => {
        try {
            const res = await api.get('/api/chatbot/available-models');
            if (res.data?.models) {
                setAvailableModels(res.data.models);
            }
        } catch {
            // Fallback defaults
            setAvailableModels([
                { key: 'auto', label: 'Auto (Smart Fallback)', description: 'Automatically picks the best available model', available: true },
                { key: 'groq', label: 'Llama 3.3 70B', provider: 'Groq', description: 'Fast & free', available: true },
                { key: 'gemini', label: 'Gemini 2.0 Flash', provider: 'Google', description: 'Google multimodal', available: true },
                { key: 'openrouter', label: 'Llama 3.3 70B', provider: 'OpenRouter', description: 'Free via OpenRouter', available: true },
            ]);
        }
    }, []);

    const sendMessage = useCallback(async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || isLoading) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: msg,
            timestamp: new Date(),
        };

        setInput('');
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        // Build history (exclude welcome, last 10)
        const history = messages
            .filter(m => m.id !== 'welcome')
            .slice(-10)
            .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

        try {
            const res = await api.post('/api/chatbot/ask', {
                message: msg,
                history,
                preferred_model: selectedModel !== 'auto' ? selectedModel : null,
            });

            let displayModel = 'AI';
            let displaySource = '';
            if (res.data.model) {
                const rawModel = res.data.model.toLowerCase();
                if (rawModel.includes('llama-3.3') && rawModel.includes('versatile')) displayModel = 'Llama 3.3';
                else if (rawModel.includes('llama-3.3')) displayModel = 'Llama 3.3';
                else if (rawModel.includes('gemini-2.0-flash')) displayModel = 'Gemini 2.0 Flash';
                else if (rawModel.includes('gemini')) displayModel = 'Gemini';
                else if (rawModel.includes('llama')) displayModel = 'Llama';
                else if (rawModel.includes('mixtral')) displayModel = 'Mixtral';
                setCurrentModel(displayModel);
            }
            if (res.data.model_source) {
                displaySource = res.data.model_source;
                setCurrentModelSource(displaySource);
            }

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: res.data.reply || "I'm sorry, I couldn't generate a response.",
                timestamp: new Date(),
                usedContext: res.data.used_context,
                meta: {
                    model: displayModel,
                    modelSource: displaySource || res.data.model_source,
                    latency: res.data.latency,
                    contextSources: res.data.context_sources || [],
                    agentsUsed: res.data.agents_used || [],
                    memoryMessages: res.data.memory_messages || 0,
                },
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (e: any) {
            const detail = e?.details?.detail || e?.message || 'Connection error. Check that the backend is running and OPENROUTER_API_KEY is set in .env.';
            const errMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `⚠️ **Error:** ${detail}`,
                timestamp: new Date(),
                error: true,
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsLoading(false);
            setTimeout(scrollToBottom, 50);
        }
    }, [input, isLoading, messages, selectedModel]);

    const clearChat = () => setMessages([WELCOME]);

    return {
        messages, input, setInput, isLoading,
        currentModel, currentModelSource,
        selectedModel, setSelectedModel,
        availableModels, fetchAvailableModels,
        contextSnapshot, contextLoading, fetchContextSnapshot,
        sendMessage, clearChat, endRef, scrollToBottom,
    };
}
