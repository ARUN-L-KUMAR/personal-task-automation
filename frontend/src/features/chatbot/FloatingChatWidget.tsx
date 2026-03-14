import React, { useEffect, useState, useRef } from 'react';
import {
    Bot, Send, X, Trash2, Minimize2, Maximize2, Loader2,
    Calendar, Mail, CheckSquare, Zap, Map, Sparkles, Brain, AlertTriangle,
    Eye, EyeOff, ChevronDown, Layers, Clock, MessageSquare, Plus,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useChat } from '../../hooks/useChat';
import { useGoogleStatus } from '../../hooks/useGoogleStatus';
import { ChatMessageBubble } from './ChatMessageBubble';

/* ── Model colour helpers (matching ChatbotPage) ── */
function modelBg(key: string) {
    if (key === 'auto') return 'bg-indigo-500';
    if (key === 'groq') return 'bg-orange-500';
    if (key.startsWith('gemini')) return 'bg-blue-500';
    return 'bg-emerald-500';
}
function modelInitial(key: string) {
    if (key === 'auto') return '⚡';
    if (key === 'groq') return 'L';
    if (key.startsWith('gemini')) return 'G';
    return 'O';
}

/* ── Quick action cards ── */
const QUICK_ACTIONS = [
    { label: "What's on my schedule today?", icon: <Calendar className="h-3.5 w-3.5" />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { label: "Any urgent emails?", icon: <Mail className="h-3.5 w-3.5" />, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40' },
    { label: "Summarize my pending tasks", icon: <CheckSquare className="h-3.5 w-3.5" />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { label: "Any conflicts to resolve?", icon: <Zap className="h-3.5 w-3.5" />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
];

/* ── Slash commands ── */
const SLASH_COMMANDS = [
    { cmd: '/plan', desc: 'Plan your day', icon: <Sparkles className="h-3 w-3" /> },
    { cmd: '/summarize', desc: 'Summarize today', icon: <Brain className="h-3 w-3" /> },
    { cmd: '/email', desc: 'Email overview', icon: <Mail className="h-3 w-3" /> },
    { cmd: '/conflicts', desc: 'Find conflicts', icon: <Zap className="h-3 w-3" /> },
    { cmd: '/tasks', desc: 'Task overview', icon: <CheckSquare className="h-3 w-3" /> },
    { cmd: '/travel', desc: 'Travel info', icon: <Map className="h-3 w-3" /> },
];
const SLASH_EXPAND: Record<string, string> = {
    '/plan': 'Plan my day — what should I prioritize, any scheduling conflicts, and optimal task order?',
    '/summarize': 'Give me a complete summary of today — meetings, tasks, emails, and any issues.',
    '/email': 'Give me an overview of my recent emails — unread count, urgent items, and key senders.',
    '/conflicts': 'Check my calendar for scheduling conflicts today and suggest resolutions.',
    '/tasks': 'Review all my pending tasks — overdue items, priorities, and what I should do next.',
    '/travel': 'Check my travel and commute situation — next trip, routes, and estimated times.',
};

/* ── Input scope filters (expanded mode) ── */
const INPUT_SCOPES = [
    { key: 'all', label: 'All', icon: <Layers className="h-3 w-3" /> },
    { key: 'calendar', label: 'Calendar', icon: <Calendar className="h-3 w-3" /> },
    { key: 'email', label: 'Email', icon: <Mail className="h-3 w-3" /> },
    { key: 'tasks', label: 'Tasks', icon: <CheckSquare className="h-3 w-3" /> },
    { key: 'travel', label: 'Travel', icon: <Map className="h-3 w-3" /> },
];

export function FloatingChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [dismissedFallback, setDismissedFallback] = useState<string | null>(null);
    /* Enhancement states */
    const [showReasoning, setShowReasoning] = useState(false);       // ③ reasoning toggle
    const [showModelMenu, setShowModelMenu] = useState(false);        // ① model selector
    const [inputScope, setInputScope] = useState('all');              // ② scope filter
    const [showHistory, setShowHistory] = useState(false);           // ④ session history

    const modelMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        messages, input, setInput, isLoading, sendMessage, clearChat, endRef, currentModel,
        availableModels, fetchAvailableModels, selectedModel, setSelectedModel,
        chatSessions, loadSession, startNewChat, fetchChatSessions, historyLoading,
    } = useChat();
    const { isGoogleConnected, isChecking } = useGoogleStatus();

    /* ⑥ Keyboard shortcuts: Ctrl+K → open/focus · Escape → dismiss layers → close */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (!isOpen) { setIsOpen(true); setHasUnread(false); }
                else setTimeout(() => inputRef.current?.focus(), 50);
            }
            if (e.key === 'Escape' && isOpen) {
                if (showSlashMenu) setShowSlashMenu(false);
                else if (showModelMenu) setShowModelMenu(false);
                else if (showHistory) setShowHistory(false);
                else setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, showSlashMenu, showModelMenu, showHistory]);

    /* Close model menu on outside click */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
                setShowModelMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* Fetch models + sessions when widget opens */
    useEffect(() => {
        if (isOpen) { fetchAvailableModels(); fetchChatSessions(); }
    }, [isOpen, fetchAvailableModels, fetchChatSessions]);

    /* ── Track unread when widget is closed ── */
    useEffect(() => {
        const last = messages[messages.length - 1];
        if (!isOpen && last?.role === 'assistant' && last?.id !== 'welcome') setHasUnread(true);
    }, [messages, isOpen]);

    /* ── Slash command detection ── */
    useEffect(() => {
        setShowSlashMenu(input.startsWith('/') && !input.includes(' '));
    }, [input]);

    const handleOpen = () => { setIsOpen(true); setHasUnread(false); };

    const handleSend = (text?: string) => {
        let msg = text ?? input;
        const slashMatch = SLASH_COMMANDS.find(c => msg.trim().toLowerCase() === c.cmd);
        if (slashMatch) msg = SLASH_EXPAND[slashMatch.cmd] || msg;
        /* ② Apply scope prefix */
        if (inputScope !== 'all' && !text) {
            const prefix: Record<string, string> = {
                calendar: 'Regarding my calendar: ', email: 'Regarding my emails: ',
                tasks: 'Regarding my tasks: ', travel: 'Regarding travel: ',
            };
            msg = (prefix[inputScope] || '') + msg;
        }
        sendMessage(msg);
        setShowSlashMenu(false);
    };

    /* Latest assistant message index (for suggestion chips) */
    const lastAssistantIdx = (() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'assistant' && messages[i].id !== 'welcome') return i;
        }
        return -1;
    })();

    const hasRealMessages = messages.filter(m => m.id !== 'welcome').length > 0;

    /* Active model display label */
    const activeModelLabel = selectedModel === 'auto'
        ? currentModel
        : availableModels.find(m => m.key === selectedModel)?.label ?? currentModel;

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
                    title="Open AI Assistant (Ctrl+K)"
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

                    {/* ── Header ── */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex-shrink-0">
                        <div className="relative">
                            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                                <Bot className="h-4 w-4" />
                            </div>
                            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white/50" />
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-none">G-One AI</p>
                            <p className="text-[10px] text-indigo-200 mt-0.5 flex items-center gap-1">
                                {isChecking ? (
                                    <><span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />Checking...</>
                                ) : isGoogleConnected ? (
                                    <><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />Google Connected</>
                                ) : (
                                    <><span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />Google Disconnected</>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* ③ Reasoning toggle — expanded only */}
                            {isExpanded && (
                                <button onClick={() => setShowReasoning(!showReasoning)}
                                    className={cn('p-1.5 rounded-lg transition-colors', showReasoning ? 'bg-white/30' : 'hover:bg-white/20')}
                                    title={showReasoning ? 'Hide reasoning' : 'Show AI reasoning'}>
                                    {showReasoning ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                </button>
                            )}
                            {/* ④ History toggle — expanded only */}
                            {isExpanded && (
                                <button onClick={() => setShowHistory(!showHistory)}
                                    className={cn('p-1.5 rounded-lg transition-colors', showHistory ? 'bg-white/30' : 'hover:bg-white/20')}
                                    title="Chat history">
                                    <Clock className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title={isExpanded ? 'Shrink' : 'Expand'}>
                                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={clearChat}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Clear chat">
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Close (Esc)">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* ── Fallback model notice ── */}
                    {(() => {
                        const lastFallback = [...messages].reverse().find(m => m.meta?.fallbackNotice);
                        if (!lastFallback?.meta?.fallbackNotice || dismissedFallback === lastFallback.id) return null;
                        const notice = lastFallback.meta.fallbackNotice;
                        return (
                            <div className="flex-shrink-0 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                <p className="text-[10px] text-amber-700 dark:text-amber-300 flex-1">
                                    <span className="font-semibold">{notice.preferred_model}</span>
                                    {notice.reason === 'rate_limit' ? ' hit rate limit' : ' is unavailable'}.
                                    {' '}Switched to <span className="font-semibold">{notice.actual_model}</span>.
                                </p>
                                <button onClick={() => setDismissedFallback(lastFallback.id)} className="text-amber-400 hover:text-amber-600 transition-colors">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        );
                    })()}

                    {/* ④ History panel — replaces message area in expanded mode */}
                    {isExpanded && showHistory && (
                        <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" /> Chat History
                                </h3>
                                <button onClick={() => { startNewChat(); setShowHistory(false); }}
                                    className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                                    <Plus className="h-3 w-3" /> New Chat
                                </button>
                            </div>
                            {historyLoading ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="h-5 w-5 text-slate-300 animate-spin" />
                                </div>
                            ) : chatSessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <MessageSquare className="h-8 w-8 text-slate-200 dark:text-slate-700 mb-2" />
                                    <p className="text-[11px] font-medium text-slate-400">No history yet</p>
                                    <p className="text-[10px] text-slate-400/70 mt-0.5">Conversations will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {chatSessions.slice(0, 20).map(session => (
                                        <button key={session.id}
                                            onClick={() => { loadSession(session.id); setShowHistory(false); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all text-left group">
                                            <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                <MessageSquare className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 truncate leading-tight">
                                                    {session.title}
                                                </p>
                                                <p className="text-[9px] text-slate-400 mt-0.5">
                                                    {session.messageCount ?? session.messages.filter(m => m.id !== 'welcome').length} messages
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Messages (hidden when history panel is open) ── */}
                    {!(isExpanded && showHistory) && (
                        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
                            {/* Empty state */}
                            {!hasRealMessages && (
                                <div className="flex flex-col items-center justify-center h-full text-center py-4">
                                    <div className="relative mb-3">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
                                            <Bot className="h-6 w-6 text-white" />
                                        </div>
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900" />
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Hi! I'm G-One</p>
                                    <p className="text-[11px] text-slate-500 mb-4 max-w-[240px] leading-snug">
                                        Your AI assistant with real-time access to your Google data.
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5 w-full">
                                        {QUICK_ACTIONS.map(a => (
                                            <button key={a.label} onClick={() => handleSend(a.label)}
                                                className="flex items-center gap-2 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all text-left group">
                                                <span className={cn('flex-shrink-0', a.color)}>{a.icon}</span>
                                                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white leading-tight">{a.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                                        Type <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] border border-slate-200 dark:border-slate-700">/</kbd> for commands
                                    </p>
                                </div>
                            )}

                            {/* Message list — pass showReasoning for ③ */}
                            {(hasRealMessages || messages.length > 1) && messages.map((msg, idx) => (
                                <ChatMessageBubble
                                    key={msg.id}
                                    message={msg}
                                    compact
                                    showReasoning={showReasoning}
                                    isLatest={idx === lastAssistantIdx}
                                    onSuggestionClick={(s) => sendMessage(s)}
                                />
                            ))}

                            {/* Loading — "Thinking…" style */}
                            {isLoading && (
                                <div className="flex items-end gap-2.5">
                                    <div className="h-7 w-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center flex-shrink-0">
                                        <Loader2 className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                {[0, 1, 2].map(i => (
                                                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                                                        style={{ animationDelay: `${i * 0.15}s` }} />
                                                ))}
                                            </div>
                                            <span className="text-[11px] text-slate-400 font-medium">Thinking…</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={endRef} />
                        </div>
                    )}

                    {/* ── Input area (hidden while history is open) ── */}
                    {!(isExpanded && showHistory) && (
                        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
                            {/* ② Scope filters — expanded mode only */}
                            {isExpanded && (
                                <div className="pt-2 pb-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
                                    {INPUT_SCOPES.map(s => (
                                        <button key={s.key} onClick={() => setInputScope(s.key)}
                                            className={cn(
                                                'flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all flex-shrink-0',
                                                inputScope === s.key
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                                            )}>
                                            {s.icon} {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className={cn('relative', isExpanded ? 'pt-1' : 'pt-2')}>
                                {/* Slash command menu */}
                                {showSlashMenu && (
                                    <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-30">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2.5 pb-1.5">Commands</p>
                                        {SLASH_COMMANDS.filter(c => c.cmd.startsWith(input.toLowerCase())).map(c => (
                                            <button key={c.cmd} onClick={() => { setInput(c.cmd); setShowSlashMenu(false); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
                                                <span className="text-indigo-500">{c.icon}</span>
                                                <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{c.cmd}</span>
                                                <span className="text-[10px] text-slate-400 ml-auto">{c.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                        placeholder={inputScope === 'all' ? 'Ask anything or type /…' : `Ask about ${inputScope}…`}
                                        disabled={isLoading}
                                        className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-60"
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={isLoading || !input.trim()}
                                        className={cn(
                                            'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-md',
                                            input.trim() && !isLoading
                                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                                        )}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* ① Model selector footer */}
                            <div className="relative mt-1.5" ref={modelMenuRef}>
                                <button
                                    onClick={() => setShowModelMenu(!showModelMenu)}
                                    className="w-full flex items-center justify-center gap-1 text-[9px] text-slate-400 hover:text-indigo-500 transition-colors group"
                                >
                                    <div className={cn('h-3 w-3 rounded flex items-center justify-center text-white text-[7px] font-bold', modelBg(selectedModel))}>
                                        {modelInitial(selectedModel)}
                                    </div>
                                    <span>{activeModelLabel}{selectedModel === 'auto' ? ' · Auto' : ''} · G-One AI</span>
                                    <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', showModelMenu && 'rotate-180')} />
                                </button>
                                {showModelMenu && availableModels.length > 0 && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-40">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2.5 pb-1.5">Select AI Model</p>
                                        <div className="pb-1.5 max-h-52 overflow-y-auto">
                                            {availableModels.map(m => (
                                                <button key={m.key}
                                                    onClick={() => { setSelectedModel(m.key); setShowModelMenu(false); }}
                                                    disabled={!m.available}
                                                    className={cn(
                                                        'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                                                        selectedModel === m.key ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/80',
                                                        !m.available && 'opacity-40 cursor-not-allowed'
                                                    )}>
                                                    <div className={cn('h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[9px] font-bold', modelBg(m.key))}>
                                                        {modelInitial(m.key)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{m.label}</p>
                                                        <p className="text-[10px] text-slate-400 truncate">{m.description}</p>
                                                    </div>
                                                    {selectedModel === m.key && <div className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                                                    {!m.available && <span className="text-[9px] text-red-400 font-medium flex-shrink-0">No key</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
