/**
 * Shared chat logic — used by both ChatbotPage and FloatingChatWidget.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
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

/* ── Chat Session (for history) ── */
export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    messageCount?: number;   // Used in list view (avoids loading full messages)
    createdAt: string;       // ISO string
    updatedAt: string;       // ISO string
}

const HISTORY_STORAGE_KEY = 'g1_chat_history';
const MAX_SESSIONS = 50;

/** Check if user is logged in (JWT token exists) */
function isLoggedIn(): boolean {
    return !!localStorage.getItem('g-one_token');
}

/* ── Local storage helpers (fallback for unauthenticated users) ── */
function loadLocalSessions(): ChatSession[] {
    try {
        const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as ChatSession[];
        return parsed.map(s => ({
            ...s,
            messages: s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
    } catch { return []; }
}

function saveLocalSessions(sessions: ChatSession[]) {
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
    } catch { /* quota exceeded — silently ignore */ }
}

function deriveTitle(messages: ChatMessage[]): string {
    const first = messages.find(m => m.role === 'user');
    if (!first) return 'New Chat';
    const text = first.content.replace(/^(regarding my \w+:\s*)/i, '').trim();
    return text.length > 50 ? text.slice(0, 47) + '…' : text;
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
    const contextFetchInFlightRef = useRef(false);
    const contextCooldownUntilRef = useRef(0);
    const endRef = useRef<HTMLDivElement>(null);

    /* ── Session / History state ── */
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const activeSessionIdRef = useRef<string | null>(null);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    // Debounce ref to avoid saving on every keystroke
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep ref in sync with state
    useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

    const scrollToBottom = () =>
        endRef.current?.scrollIntoView({ behavior: 'smooth' });

    /* ── Fetch sessions from DB (if logged in) or localStorage ── */
    const fetchChatSessions = useCallback(async () => {
        if (!isLoggedIn()) {
            setChatSessions(loadLocalSessions());
            return;
        }
        setHistoryLoading(true);
        try {
            const res = await api.get('/api/chat-history/sessions');
            const sessions: ChatSession[] = (res.data || []).map((s: any) => ({
                id: s.id,
                title: s.title,
                messages: [],  // List endpoint only returns count
                messageCount: s.message_count,
                createdAt: s.created_at,
                updatedAt: s.updated_at,
            }));
            setChatSessions(sessions);
        } catch (err) {
            console.warn('[useChat] Failed to fetch sessions from API, falling back to localStorage', err);
            setChatSessions(loadLocalSessions());
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    /* ── Save to both DB and localStorage ── */
    const persistCurrentChat = useCallback((msgs: ChatMessage[]) => {
        const realMsgs = msgs.filter(m => m.id !== 'welcome');
        if (realMsgs.length === 0) return;

        const sessionId = activeSessionIdRef.current;
        const title = deriveTitle(msgs);
        const messagesPayload = msgs.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
            usedContext: m.usedContext,
            error: m.error,
            meta: m.meta,
        }));

        // Always save to localStorage as backup
        const now = new Date().toISOString();
        setChatSessions(prev => {
            let updated: ChatSession[];
            if (sessionId) {
                const exists = prev.some(s => s.id === sessionId);
                if (exists) {
                    updated = prev.map(s => s.id === sessionId
                        ? { ...s, title, messages: msgs, messageCount: realMsgs.length, updatedAt: now }
                        : s
                    );
                } else {
                    updated = [{ id: sessionId, title, messages: msgs, messageCount: realMsgs.length, createdAt: now, updatedAt: now }, ...prev];
                }
            } else {
                updated = prev; // Will be updated once we have the DB id
            }
            saveLocalSessions(updated);
            return updated;
        });

        // Debounced save to API
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            if (!isLoggedIn()) return;
            try {
                const res = await api.post('/api/chat-history/sessions', {
                    session_id: sessionId,
                    title,
                    messages: messagesPayload,
                });
                const dbId = res.data?.id;
                if (dbId && dbId !== sessionId) {
                    // New session was created — update our IDs
                    setActiveSessionId(dbId);
                    setChatSessions(prev => {
                        // Remove the temp local entry and add DB one
                        const filtered = prev.filter(s => s.id !== sessionId && s.id !== dbId);
                        const newEntry: ChatSession = {
                            id: dbId,
                            title,
                            messages: msgs,
                            messageCount: realMsgs.length,
                            createdAt: res.data.created_at,
                            updatedAt: res.data.updated_at,
                        };
                        const updated = [newEntry, ...filtered].slice(0, MAX_SESSIONS);
                        saveLocalSessions(updated);
                        return updated;
                    });
                }
            } catch (err) {
                console.warn('[useChat] Failed to save session to API:', err);
            }
        }, 800); // 800ms debounce
    }, []);

    /* ── Load a past session (full messages from DB) ── */
    const loadSession = useCallback(async (sessionId: string) => {
        setActiveSessionId(sessionId);

        // Try local cache first
        const local = chatSessions.find(s => s.id === sessionId && s.messages.length > 0);
        if (local) {
            setMessages(local.messages.map(m => ({
                ...m,
                timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp),
            })));
            return;
        }

        // Fetch full session from API
        if (isLoggedIn()) {
            try {
                const res = await api.get(`/api/chat-history/sessions/${sessionId}`);
                const msgs: ChatMessage[] = (res.data.messages || []).map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp),
                }));
                setMessages(msgs.length > 0 ? msgs : [WELCOME]);
                // Cache locally
                setChatSessions(prev =>
                    prev.map(s => s.id === sessionId ? { ...s, messages: msgs } : s)
                );
            } catch {
                console.warn('[useChat] Failed to load session from API');
            }
        }
    }, [chatSessions]);

    /* ── Start a brand new chat ── */
    const startNewChat = useCallback(() => {
        setActiveSessionId(null);
        setMessages([WELCOME]);
        setInput('');
    }, []);

    /* ── Delete a session (DB + local) ── */
    const deleteSession = useCallback(async (sessionId: string) => {
        setChatSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId);
            saveLocalSessions(updated);
            return updated;
        });
        if (activeSessionId === sessionId) {
            setActiveSessionId(null);
            setMessages([WELCOME]);
        }
        // Delete from DB
        if (isLoggedIn()) {
            try { await api.delete(`/api/chat-history/sessions/${sessionId}`); }
            catch { /* ignore */ }
        }
    }, [activeSessionId]);

    /** Fetch live context snapshot for the panel */
    const fetchContextSnapshot = useCallback(async () => {
        const now = Date.now();
        if (contextFetchInFlightRef.current || now < contextCooldownUntilRef.current) {
            return;
        }

        contextFetchInFlightRef.current = true;
        setContextLoading(true);
        try {
            const res = await api.get('/api/chatbot/context-snapshot', { timeout: 25000 });
            if (res.data?.snapshot) {
                setContextSnapshot(res.data.snapshot);
            }
        } catch (err: any) {
            // Avoid rapid-fire retries when backend is degraded/unavailable.
            contextCooldownUntilRef.current = Date.now() + 20000;
            console.error('[useChat] Context snapshot fetch failed:', err?.message || err);
        } finally {
            setContextLoading(false);
            contextFetchInFlightRef.current = false;
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

        if (text === undefined) {
            setInput('');
        }
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
            setMessages(prev => {
                const updated = [...prev, botMsg];
                persistCurrentChat(updated);
                return updated;
            });
        } catch (e: any) {
            const detail = e?.details?.detail || e?.message || 'Connection error. Check that the backend is running and OPENROUTER_API_KEY is set in .env.';
            const errMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `⚠️ **Error:** ${detail}`,
                timestamp: new Date(),
                error: true,
            };
            setMessages(prev => {
                const updated = [...prev, errMsg];
                persistCurrentChat(updated);
                return updated;
            });
        } finally {
            setIsLoading(false);
            setTimeout(scrollToBottom, 50);
        }
    }, [input, isLoading, messages, selectedModel, persistCurrentChat]);

    const clearChat = () => {
        setActiveSessionId(null);
        setMessages([WELCOME]);
    };

    return {
        messages, input, setInput, isLoading,
        currentModel, currentModelSource,
        selectedModel, setSelectedModel,
        availableModels, fetchAvailableModels,
        contextSnapshot, contextLoading, fetchContextSnapshot,
        sendMessage, clearChat, endRef, scrollToBottom,
        // Session / History
        chatSessions, activeSessionId, historyLoading,
        loadSession, startNewChat, deleteSession, fetchChatSessions,
    };
}
