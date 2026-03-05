/**
 * Shared chat logic — used by both ChatbotPage and FloatingChatWidget.
 */
import { useState, useRef, useCallback } from 'react';
import api from '../services/api';

export interface FallbackNotice {
    preferred_model: string;
    actual_model: string;
    reason: 'rate_limit' | 'unavailable';
}

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
        fallbackNotice?: FallbackNotice;
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
            console.log('[useChat] Fetching context snapshot...');
            const res = await api.get('/api/chatbot/context-snapshot', { timeout: 25000 });
            console.log('[useChat] Context snapshot response:', res.data?.status, res.data?.snapshot ? 'has data' : 'no data');
            if (res.data?.snapshot) {
                setContextSnapshot(res.data.snapshot);
            } else {
                console.warn('[useChat] Snapshot returned null — status:', res.data?.status);
            }
        } catch (err: any) {
            console.error('[useChat] Context snapshot fetch failed:', err?.message || err);
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
                { key: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'Google', description: 'Best quality · 5 RPM / 20 RPD', available: true },
                { key: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', provider: 'Google', description: 'Fastest · 30 RPM / 1500 RPD', available: true },
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
                else if (rawModel.includes('gemini-2.5-flash-lite')) displayModel = 'Gemini 2.5 Flash Lite';
                else if (rawModel.includes('gemini-2.5-flash')) displayModel = 'Gemini 2.5 Flash';
                else if (rawModel.includes('gemini')) displayModel = 'Gemini';
                else if (rawModel.includes('llama')) displayModel = 'Llama';
                else if (rawModel.includes('mixtral')) displayModel = 'Mixtral';
                setCurrentModel(displayModel);
            }
            if (res.data.model_source) {
                displaySource = res.data.model_source;
                setCurrentModelSource(displaySource);
            }

            // If fallback happened on a user-selected model, auto-switch to the working model
            if (res.data.fallback_notice) {
                const actualKey = res.data.fallback_notice.actual_model_key || res.data.fallback_notice.actual_model?.toLowerCase();
                if (actualKey && actualKey !== 'unknown') {
                    setSelectedModel(actualKey);
                }
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
                    fallbackNotice: res.data.fallback_notice || undefined,
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
