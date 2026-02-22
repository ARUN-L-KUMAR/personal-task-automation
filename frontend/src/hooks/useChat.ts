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
}

export function useChat() {
    const WELCOME: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: "👋 Hi! I'm **Antigravity**, your AI personal assistant.\n\nI can help with your **calendar**, **tasks**, **emails**, **maps**, and more. What would you like to know?",
        timestamp: new Date(),
    };

    const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentModel, setCurrentModel] = useState<string>('Llama 3.3');
    const endRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () =>
        endRef.current?.scrollIntoView({ behavior: 'smooth' });

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
            const res = await api.post('/api/chatbot/ask', { message: msg, history });

            if (res.data.model) {
                const rawModel = res.data.model.toLowerCase();
                let display = 'AI';
                if (rawModel.includes('llama-3.3') && rawModel.includes('versatile')) display = 'Llama 3.3 (Groq)';
                else if (rawModel.includes('llama-3.3')) display = 'Llama 3.3 (Pro)';
                else if (rawModel.includes('gemini-2.0-flash')) display = 'Gemini 2.0 Flash';
                else if (rawModel.includes('gemini')) display = 'Gemini';
                else if (rawModel.includes('llama')) display = 'Llama';
                else if (rawModel.includes('mixtral')) display = 'Mixtral (Groq)';
                setCurrentModel(display);
            }

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: res.data.reply || "I'm sorry, I couldn't generate a response.",
                timestamp: new Date(),
                usedContext: res.data.used_context,
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
    }, [input, isLoading, messages]);

    const clearChat = () => setMessages([WELCOME]);

    return { messages, input, setInput, isLoading, currentModel, sendMessage, clearChat, endRef, scrollToBottom };
}
