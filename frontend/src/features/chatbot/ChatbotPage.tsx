import React, { useEffect } from 'react';
import {
    Send, Sparkles, Trash2, Bot, Loader2,
    Calendar, Mail, CheckSquare, Map, Zap, Command,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { useChat } from '../../hooks/useChat';
import { ChatMessageBubble } from './ChatMessageBubble';

const QUICK_ACTIONS = [
    { label: "What's my next meeting?", icon: <Calendar className="h-3.5 w-3.5" />, color: 'text-blue-500' },
    { label: "Any urgent emails?", icon: <Mail className="h-3.5 w-3.5" />, color: 'text-red-500' },
    { label: "Summarize my pending tasks", icon: <CheckSquare className="h-3.5 w-3.5" />, color: 'text-emerald-500' },
    { label: "Any conflicts today?", icon: <Zap className="h-3.5 w-3.5" />, color: 'text-amber-500' },
    { label: "Plan my day", icon: <Sparkles className="h-3.5 w-3.5" />, color: 'text-violet-500' },
    { label: "How's my travel looking?", icon: <Map className="h-3.5 w-3.5" />, color: 'text-indigo-500' },
];

const SUGGESTIONS = [
    "What should I prioritize this morning?",
    "Do I have any back-to-back meetings?",
    "Which tasks are overdue?",
    "Summarize my last 5 emails",
    "Is there time for a break today?",
    "What's the best route to my next meeting?",
];

export function ChatbotPage() {
    const { messages, input, setInput, isLoading, currentModel, sendMessage, clearChat, endRef, scrollToBottom } = useChat();

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const hasRealMessages = messages.filter(m => m.id !== 'welcome').length > 0;

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-5">
            {/* ── Header ── */}
            <header className="flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        AI Assistant
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
                        Real-time contextual support via your Google data.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={clearChat}
                    className="text-slate-500 dark:border-slate-700 h-8 text-xs">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear Chat
                </Button>
            </header>

            {/* ── Main layout ── */}
            <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">

                {/* ── Chat Area ── */}
                <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 dark:border-slate-800 min-h-0">
                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 custom-scrollbar">
                        {messages.map(msg => (
                            <ChatMessageBubble key={msg.id} message={msg} />
                        ))}

                        {isLoading && (
                            <div className="flex items-end gap-2">
                                <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center flex-shrink-0">
                                    <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                                    <div className="flex gap-1.5 items-center">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                                                style={{ animationDelay: `${i * 0.15}s` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {hasRealMessages && !isLoading && (
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Try asking…</p>
                                <div className="flex flex-wrap gap-2">
                                    {SUGGESTIONS.slice(0, 3).map(s => (
                                        <button key={s} onClick={() => sendMessage(s)}
                                            className="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={endRef} />
                    </div>

                    <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                        <div className="relative">
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder="Ask about your calendar, tasks, emails…"
                                rows={1}
                                disabled={isLoading}
                                className="w-full resize-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-5 pr-14 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-60"
                                style={{ minHeight: '50px', maxHeight: '120px' }}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={isLoading || !input.trim()}
                                className={cn(
                                    'absolute right-3 bottom-3 h-9 w-9 rounded-xl flex items-center justify-center transition-all',
                                    input.trim() && !isLoading
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                )}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">
                            Powered by {currentModel} · Uses your live Google data
                        </p>
                    </div>
                </Card>

                {/* ── Sidebar ── */}
                <aside className="w-full lg:w-72 flex flex-col gap-4 flex-shrink-0">
                    <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Command className="h-3 w-3" /> Quick Actions
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                            {QUICK_ACTIONS.map(a => (
                                <button key={a.label} onClick={() => sendMessage(a.label)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all text-left group">
                                    <span className={cn('flex-shrink-0', a.color)}>{a.icon}</span>
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                        {a.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card className="border-none bg-gradient-to-br from-indigo-600 to-violet-600 text-white overflow-hidden relative">
                        <div className="p-5 relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-8 w-8 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Antigravity AI</p>
                                    <p className="text-[10px] text-indigo-200">Proactive Assistant</p>
                                </div>
                            </div>
                            <p className="text-xs text-indigo-100 leading-relaxed mb-4">
                                I can read your live Google data to give you contextually aware answers.
                            </p>
                        </div>
                        <div className="absolute -right-4 -top-4 h-24 w-24 bg-white/10 rounded-full blur-2xl" />
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-800 p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Session</p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Messages</span>
                                <span className="font-bold text-slate-900 dark:text-white">{messages.length - 1}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Model</span>
                                <span className="font-bold text-slate-900 dark:text-white text-xs">{currentModel}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Context</span>
                                <span className="font-bold text-emerald-600 text-xs">Live</span>
                            </div>
                        </div>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
