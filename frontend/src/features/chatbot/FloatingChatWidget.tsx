import React, { useEffect } from 'react';
import { Bot, Send, X, Trash2, Sparkles, Minimize2, Maximize2, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useChat } from '../../hooks/useChat';
import { ChatMessageBubble } from './ChatMessageBubble';
import { useState } from 'react';

const QUICK_PROMPTS = [
    "What's on my schedule today?",
    "Any urgent emails?",
    "Summarize my pending tasks",
    "Any conflicts to resolve?",
];

export function FloatingChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const { messages, input, setInput, isLoading, sendMessage, clearChat, endRef } = useChat();

    // Mark unread when bot replies and widget is closed
    useEffect(() => {
        const last = messages[messages.length - 1];
        if (!isOpen && last?.role === 'assistant' && last?.id !== 'welcome') {
            setHasUnread(true);
        }
    }, [messages, isOpen]);

    const handleOpen = () => {
        setIsOpen(true);
        setHasUnread(false);
    };

    const handleSend = async (text?: string) => {
        await sendMessage(text);
    };

    return (
        <>
            {/* ── Floating Button ── */}
            {!isOpen && (
                <button
                    onClick={handleOpen}
                    className={cn(
                        'fixed bottom-6 right-6 z-[200] flex items-center justify-center rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95',
                        'bg-gradient-to-br from-indigo-600 to-violet-600 text-white',
                        'h-14 w-14'
                    )}
                    title="Open AI Assistant"
                >
                    <Bot className="h-6 w-6" />
                    {hasUnread && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                    )}
                </button>
            )}

            {/* ── Chat Panel ── */}
            {isOpen && (
                <div className={cn(
                    'fixed bottom-6 right-6 z-[200] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-300',
                    isExpanded ? 'w-[520px] h-[640px]' : 'w-[360px] h-[520px]'
                )}>
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex-shrink-0">
                        <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-none">Antigravity AI</p>
                            <p className="text-[10px] text-indigo-200 mt-0.5 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                                Online · Google-connected
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title={isExpanded ? 'Shrink' : 'Expand'}>
                                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={clearChat}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Clear chat">
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Close">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
                        {messages.map(msg => (
                            <ChatMessageBubble key={msg.id} message={msg} compact />
                        ))}
                        {isLoading && (
                            <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                    <Loader2 className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2.5">
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                                                style={{ animationDelay: `${i * 0.15}s` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* Quick prompts — show only when no real messages yet */}
                    {messages.length <= 1 && !isLoading && (
                        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                            {QUICK_PROMPTS.map(q => (
                                <button key={q} onClick={() => handleSend(q)}
                                    className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/40 transition-all text-left leading-tight">
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="px-3 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                placeholder="Ask anything…"
                                disabled={isLoading}
                                className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-60"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={isLoading || !input.trim()}
                                className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="text-[9px] text-slate-400 text-center mt-1.5">
                            Powered by Llama 3.3 · Antigravity AI
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
