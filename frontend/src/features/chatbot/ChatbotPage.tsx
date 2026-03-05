import React, { useEffect, useState, useRef } from 'react';
import {
    Send, Sparkles, Trash2, Bot, Loader2,
    Calendar, Mail, CheckSquare, Map, Zap, Command,
    Eye, EyeOff, AlertTriangle, Terminal,
    Wifi, WifiOff, Brain, Activity, Database,
    RefreshCw, ChevronDown, ChevronRight, X,
    Layers, Radio, ArrowUpRight,
    BarChart3, Cpu, Settings, Power, Plus, Minus,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useChat } from '../../hooks/useChat';
import { ChatMessageBubble } from './ChatMessageBubble';
import api from '../../services/api';

/* ── Quick Actions ── */
const QUICK_ACTIONS = [
    { label: "What's my next meeting?", icon: <Calendar className="h-3.5 w-3.5" />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { label: "Any urgent emails?", icon: <Mail className="h-3.5 w-3.5" />, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40' },
    { label: "Summarize my pending tasks", icon: <CheckSquare className="h-3.5 w-3.5" />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { label: "Any conflicts today?", icon: <Zap className="h-3.5 w-3.5" />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    { label: "Plan my day", icon: <Sparkles className="h-3.5 w-3.5" />, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40' },
    { label: "How's my travel looking?", icon: <Map className="h-3.5 w-3.5" />, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/40' },
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

/* ── Input scope filters ── */
const INPUT_SCOPES = [
    { key: 'all', label: 'All', icon: <Layers className="h-3 w-3" /> },
    { key: 'calendar', label: 'Calendar', icon: <Calendar className="h-3 w-3" /> },
    { key: 'email', label: 'Email', icon: <Mail className="h-3 w-3" /> },
    { key: 'tasks', label: 'Tasks', icon: <CheckSquare className="h-3 w-3" /> },
    { key: 'travel', label: 'Travel', icon: <Map className="h-3 w-3" /> },
];

/* ── Google services config ── */
const GOOGLE_SERVICES = [
    { key: 'Calendar', label: 'Google Calendar', icon: <Calendar className="h-3.5 w-3.5" />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { key: 'Gmail', label: 'Gmail', icon: <Mail className="h-3.5 w-3.5" />, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30' },
    { key: 'Tasks', label: 'Google Tasks', icon: <CheckSquare className="h-3.5 w-3.5" />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { key: 'Contacts', label: 'Google Contacts', icon: <Cpu className="h-3.5 w-3.5" />, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
    { key: 'Keep', label: 'Google Keep', icon: <Activity className="h-3.5 w-3.5" />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { key: 'Sheets', label: 'Google Sheets', icon: <BarChart3 className="h-3.5 w-3.5" />, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30' },
    { key: 'Maps', label: 'Google Maps', icon: <Map className="h-3.5 w-3.5" />, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/30' },
];

/* ── Typing animation ── */
function TypingText({ text, speed = 35 }: { text: string; speed?: number }) {
    const [displayed, setDisplayed] = useState('');
    const idx = useRef(0);
    useEffect(() => {
        idx.current = 0; setDisplayed('');
        const iv = setInterval(() => { idx.current++; setDisplayed(text.slice(0, idx.current)); if (idx.current >= text.length) clearInterval(iv); }, speed);
        return () => clearInterval(iv);
    }, [text, speed]);
    return <>{displayed}<span className="animate-pulse">|</span></>;
}

/* ── Format time ── */
function fmtTime(iso: string) {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
}

/* ── Model helpers ── */
function modelIcon(key: string) {
    if (key === 'auto') return <Zap className="h-3 w-3" />;
    if (key === 'groq') return <span className="text-[9px] font-black">L</span>;
    if (key.startsWith('gemini')) return <span className="text-[9px] font-black">G</span>;
    return <span className="text-[9px] font-black">O</span>;
}
function modelBg(key: string) {
    if (key === 'auto') return 'bg-indigo-500';
    if (key === 'groq') return 'bg-orange-500';
    if (key.startsWith('gemini')) return 'bg-blue-500';
    return 'bg-emerald-500';
}

export function ChatbotPage() {
    const {
        messages, input, setInput, isLoading,
        currentModel, currentModelSource,
        selectedModel, setSelectedModel,
        availableModels, fetchAvailableModels,
        contextSnapshot, contextLoading, fetchContextSnapshot,
        sendMessage, clearChat, endRef, scrollToBottom,
    } = useChat();

    const [showReasoning, setShowReasoning] = useState(false);
    const [inputScope, setInputScope] = useState('all');
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [showSessionModelMenu, setShowSessionModelMenu] = useState(false);
    const [dismissedFallback, setDismissedFallback] = useState<string | null>(null);
    const [sidebarTab, setSidebarTab] = useState<'actions' | 'session'>('actions');
    // Collapsible state for sidebar sections
    const [actionsOpen, setActionsOpen] = useState(true);
    const [toolsOpen, setToolsOpen] = useState(true);
    const [sourcesOpen, setSourcesOpen] = useState(true);
    const modelMenuRef = useRef<HTMLDivElement>(null);
    const sessionModelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchContextSnapshot(); fetchAvailableModels();
        const iv = setInterval(fetchContextSnapshot, 60000);
        return () => clearInterval(iv);
    }, [fetchContextSnapshot, fetchAvailableModels]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) setShowModelMenu(false);
            if (sessionModelRef.current && !sessionModelRef.current.contains(e.target as Node)) setShowSessionModelMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages]);
    useEffect(() => { setShowSlashMenu(input.startsWith('/') && !input.includes(' ')); }, [input]);

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleSend = (text?: string) => {
        let msg = text ?? input;
        const slashMatch = SLASH_COMMANDS.find(c => msg.trim().toLowerCase() === c.cmd);
        if (slashMatch) {
            const expanded: Record<string, string> = {
                '/plan': 'Plan my day — what should I prioritize, any scheduling conflicts, and optimal task order?',
                '/summarize': 'Give me a complete summary of today — meetings, tasks, emails, and any issues.',
                '/email': 'Give me an overview of my recent emails — unread count, urgent items, and key senders.',
                '/conflicts': 'Check my calendar for scheduling conflicts today and suggest resolutions.',
                '/tasks': 'Review all my pending tasks — overdue items, priorities, and what I should do next.',
                '/travel': 'Check my travel and commute situation — next trip, routes, and estimated times.',
            };
            msg = expanded[slashMatch.cmd] || msg;
        }
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

    const hasRealMessages = messages.filter(m => m.id !== 'welcome').length > 0;
    const lastAssistantIdx = (() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'assistant' && messages[i].id !== 'welcome') return i;
        }
        return -1;
    })();

    const cs = contextSnapshot;
    const msgCount = messages.filter(m => m.id !== 'welcome').length;
    const lastBot = messages.filter(m => m.role === 'assistant' && m.meta?.latency).pop();

    /* Email display — separate unread count and urgent */
    const emailValue = (() => {
        if (!cs) return '—';
        const unread = cs.unread_emails ?? 0;
        const urgent = cs.urgent_emails ?? 0;
        if (unread === 0) return 'No unread';
        if (urgent > 0 && urgent < unread) return `${unread} unread · ${urgent} urgent`;
        if (urgent > 0 && urgent === unread) return `${unread} unread`;
        return `${unread} unread`;
    })();

    /* Current model display helper */
    const activeModelLabel = selectedModel === 'auto'
        ? currentModel
        : (() => { const sel = availableModels.find(m => m.key === selectedModel); return sel ? sel.label : currentModel; })();
    const activeModelProvider = selectedModel === 'auto'
        ? (currentModelSource || 'Auto')
        : (() => { const sel = availableModels.find(m => m.key === selectedModel); return sel?.provider || 'Unknown'; })();
    const activeModelKey = selectedModel === 'auto' ? currentModel.toLowerCase() : selectedModel;

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-2">

            {/* ═══ Top Bar ═══ */}
            <div className="flex-shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                            G-One Assistant
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                            </span>
                        </h1>
                        <p className="text-[11px] text-slate-400 leading-tight">Multi-agent AI · Real-time Google data</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => setShowReasoning(!showReasoning)}
                        className={cn(
                            'h-8 px-3 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border transition-colors',
                            showReasoning
                                ? 'border-indigo-200 dark:border-indigo-800 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        )}>
                        {showReasoning ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        Reasoning
                    </button>
                    <button onClick={clearChat}
                        className="h-8 px-3 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" /> Clear
                    </button>
                    <button onClick={fetchContextSnapshot} disabled={contextLoading}
                        className="h-8 px-3 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-500 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors disabled:opacity-50">
                        <RefreshCw className={cn('h-3.5 w-3.5', contextLoading && 'animate-spin')} /> Sync
                    </button>
                </div>
            </div>

            {/* ═══ Context Snapshot Cards ═══ */}
            <div className="flex-shrink-0 grid grid-cols-4 gap-2">
                {[
                    {
                        icon: <Calendar className="h-4 w-4 text-blue-500" />,
                        label: 'NEXT MEETING',
                        value: cs?.next_meeting ? `${fmtTime(cs.next_meeting.start)} · ${cs.next_meeting.title}` : 'No upcoming',
                        bg: 'bg-blue-50 dark:bg-blue-950/30',
                    },
                    {
                        icon: <Mail className="h-4 w-4 text-rose-500" />,
                        label: 'EMAILS',
                        value: emailValue,
                        bg: 'bg-rose-50 dark:bg-rose-950/30',
                    },
                    {
                        icon: <CheckSquare className="h-4 w-4 text-emerald-500" />,
                        label: 'PENDING TASKS',
                        value: cs?.pending_tasks != null ? `${cs.pending_tasks} tasks` : '—',
                        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                    },
                    {
                        icon: <AlertTriangle className={cn('h-4 w-4', (cs?.conflicts_today ?? 0) > 0 ? 'text-amber-500' : 'text-slate-400')} />,
                        label: 'CONFLICTS',
                        value: (cs?.conflicts_today ?? 0) > 0 ? `${cs!.conflicts_today} today` : 'None',
                        bg: (cs?.conflicts_today ?? 0) > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-slate-50 dark:bg-slate-800',
                    },
                ].map(card => (
                    <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 flex items-center gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', card.bg)}>{card.icon}</div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">{card.label}</p>
                            {contextLoading
                                ? <div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-1" />
                                : <p className="text-xs font-semibold text-slate-800 dark:text-white leading-tight mt-0.5 truncate">{card.value}</p>
                            }
                        </div>
                    </div>
                ))}
            </div>

            {/* ═══ Main Content ═══ */}
            <div className="flex-1 flex gap-3 min-h-0">

                {/* ── Chat Panel ── */}
                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">

                    {/* Fallback notice */}
                    {(() => {
                        const lastFallback = [...messages].reverse().find(m => m.meta?.fallbackNotice);
                        if (!lastFallback?.meta?.fallbackNotice || dismissedFallback === lastFallback.id) return null;
                        const notice = lastFallback.meta.fallbackNotice;
                        return (
                            <div className="flex-shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 flex items-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 flex-1">
                                    <span className="font-semibold">{notice.preferred_model}</span>
                                    {notice.reason === 'rate_limit' ? ' hit rate limit' : ' is unavailable'}.
                                    Routed to <span className="font-semibold">{notice.actual_model}</span>.
                                </p>
                                <button onClick={() => setDismissedFallback(lastFallback.id)} className="text-amber-400 hover:text-amber-600 transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })()}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar">

                        {/* Empty state — compact */}
                        {!hasRealMessages && messages.length === 1 && (
                            <div className="flex flex-col items-center justify-center h-full text-center py-6">
                                <div className="relative mb-4">
                                    <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
                                        <Bot className="h-7 w-7 text-white" />
                                    </div>
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900" />
                                    </span>
                                </div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                                    <TypingText text="Hi! I'm G-One, your AI assistant." speed={40} />
                                </h2>
                                <p className="text-xs text-slate-500 max-w-sm mb-5">
                                    Real-time access to your Google data to help manage your day.
                                </p>

                                {/* Connected services */}
                                <div className="flex items-center gap-2 mb-5">
                                    {GOOGLE_SERVICES.map(svc => {
                                        const connected = cs?.connected_services?.includes(svc.key);
                                        return (
                                            <div key={svc.key} className={cn(
                                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium',
                                                connected
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-600'
                                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                            )}>
                                                {svc.icon} {svc.label.replace('Google ', '')}
                                                {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Starter prompts — 2x2 compact */}
                                <div className="grid grid-cols-2 gap-1.5 max-w-sm w-full">
                                    {QUICK_ACTIONS.slice(0, 4).map(a => (
                                        <button key={a.label} onClick={() => handleSend(a.label)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all text-left group">
                                            <span className={cn('flex-shrink-0', a.color)}>{a.icon}</span>
                                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white leading-tight">{a.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 flex items-center gap-3 text-[10px] text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Terminal className="h-3 w-3" /> Type
                                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] border border-slate-200 dark:border-slate-700">/</kbd>
                                        for commands
                                    </span>
                                    <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                                    <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> Filter by scope below</span>
                                </div>
                            </div>
                        )}

                        {/* Message list */}
                        {(hasRealMessages || messages.length > 1) && messages.map((msg, idx) => (
                            <ChatMessageBubble key={msg.id} message={msg} showReasoning={showReasoning}
                                isLatest={idx === lastAssistantIdx} onSuggestionClick={(s) => sendMessage(s)} />
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex items-end gap-2">
                                <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center flex-shrink-0">
                                    <Loader2 className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1 items-center">
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                            ))}
                                        </div>
                                        <span className="text-[11px] text-slate-400 font-medium">Thinking…</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* ── Input Area ── */}
                    <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800">
                        {/* Scope filters */}
                        <div className="px-4 pt-2 pb-1 flex items-center gap-1">
                            {INPUT_SCOPES.map(s => (
                                <button key={s.key} onClick={() => setInputScope(s.key)}
                                    className={cn(
                                        'flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all',
                                        inputScope === s.key
                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                                    )}>
                                    {s.icon} {s.label}
                                </button>
                            ))}
                        </div>

                        <div className="px-4 pb-3 pt-1">
                            <div className="relative">
                                {/* Slash command menu */}
                                {showSlashMenu && (
                                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-30">
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

                                <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                                    placeholder={inputScope === 'all' ? 'Ask anything or type / for commands…' : `Ask about ${inputScope}…`}
                                    rows={1} disabled={isLoading}
                                    className="w-full resize-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-4 pr-14 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all disabled:opacity-60"
                                    style={{ minHeight: '46px', maxHeight: '120px' }}
                                />
                                <button onClick={() => handleSend()} disabled={isLoading || !input.trim()}
                                    className={cn(
                                        'absolute right-2.5 bottom-2.5 h-9 w-9 rounded-lg flex items-center justify-center transition-all',
                                        input.trim() && !isLoading
                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                    )}>
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </button>
                            </div>

                            {/* Bottom bar — model selector + stats */}
                            <div className="flex items-center justify-between mt-2 px-0.5">
                                <div className="relative" ref={modelMenuRef}>
                                    <button onClick={() => setShowModelMenu(!showModelMenu)}
                                        className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                        <div className={cn('h-4 w-4 rounded flex items-center justify-center text-white', modelBg(selectedModel))}>
                                            {modelIcon(selectedModel)}
                                        </div>
                                        <span className="font-medium">{selectedModel === 'auto' ? `${currentModel} · Auto` : activeModelLabel}</span>
                                        <ChevronDown className={cn('h-3 w-3 transition-transform', showModelMenu && 'rotate-180')} />
                                    </button>

                                    {showModelMenu && (
                                        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-40">
                                            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select AI Model</p>
                                            </div>
                                            <div className="py-1 max-h-64 overflow-y-auto">
                                                {availableModels.map(m => (
                                                    <button key={m.key} onClick={() => { setSelectedModel(m.key); setShowModelMenu(false); }}
                                                        disabled={!m.available}
                                                        className={cn(
                                                            'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                                                            selectedModel === m.key ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/80',
                                                            !m.available && 'opacity-40 cursor-not-allowed'
                                                        )}>
                                                        <div className={cn('h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[9px] font-bold', modelBg(m.key))}>
                                                            {modelIcon(m.key)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{m.label}</p>
                                                                {m.provider && <span className="text-[9px] text-slate-400">{m.provider}</span>}
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 truncate">{m.description}</p>
                                                        </div>
                                                        {selectedModel === m.key && <div className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                                                        {!m.available && <span className="text-[9px] text-red-400 font-medium">No key</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                    <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Live Data</span>
                                    <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> {Math.min(msgCount, 10)} msgs</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════ */}
                {/* ── RIGHT SIDEBAR                           ── */}
                {/* ══════════════════════════════════════════════ */}
                <aside className="w-[280px] flex flex-col flex-shrink-0 min-h-0 gap-2">
                    {/* Tab switcher */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
                        <button onClick={() => setSidebarTab('actions')}
                            className={cn('flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1',
                                sidebarTab === 'actions' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                            <Command className="h-3 w-3" /> Actions
                        </button>
                        <button onClick={() => setSidebarTab('session')}
                            className={cn('flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1',
                                sidebarTab === 'session' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                            <Settings className="h-3 w-3" /> Session
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">

                        {/* ───────────── ACTIONS TAB ───────────── */}
                        {sidebarTab === 'actions' && (<>
                            {/* Quick Actions — collapsible */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <button onClick={() => setActionsOpen(!actionsOpen)}
                                    className="w-full px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Zap className="h-3 w-3" /> Quick Actions
                                    </h3>
                                    <ChevronRight className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', actionsOpen && 'rotate-90')} />
                                </button>
                                {actionsOpen && (
                                    <div className="p-1">
                                        {QUICK_ACTIONS.map(a => (
                                            <button key={a.label} onClick={() => handleSend(a.label)}
                                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group">
                                                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0', a.bg)}>
                                                    <span className={a.color}>{a.icon}</span>
                                                </div>
                                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1 leading-tight">{a.label}</span>
                                                <ArrowUpRight className="h-3 w-3 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* AI Tools — collapsible */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <button onClick={() => setToolsOpen(!toolsOpen)}
                                    className="w-full px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Terminal className="h-3 w-3" /> AI Tools
                                    </h3>
                                    <ChevronRight className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', toolsOpen && 'rotate-90')} />
                                </button>
                                {toolsOpen && (
                                    <div className="p-2 flex flex-wrap gap-1.5">
                                        {SLASH_COMMANDS.map(c => (
                                            <button key={c.cmd} onClick={() => handleSend(c.cmd)}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all text-[10px] font-medium text-slate-500 hover:text-indigo-600">
                                                <span className="text-indigo-500">{c.icon}</span>
                                                <span className="font-mono">{c.cmd}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>)}

                        {/* ───────────── SESSION TAB ───────────── */}
                        {sidebarTab === 'session' && (<>

                            {/* Active Model — with selector */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Cpu className="h-3 w-3" /> Active Model
                                    </h3>
                                    <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                                        <Radio className="h-3 w-3" /> Live
                                    </span>
                                </div>
                                <div className="p-3 space-y-3">
                                    {/* Current model display */}
                                    <div className="flex items-center gap-3">
                                        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                                            activeModelKey.includes('gemini') ? 'bg-blue-500' : activeModelKey.includes('openrouter') ? 'bg-emerald-500' : 'bg-orange-500'
                                        )}>
                                            {activeModelKey.includes('gemini') ? 'G' : activeModelKey.includes('openrouter') ? 'O' : 'L'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">{activeModelLabel}</p>
                                            <p className="text-[11px] text-slate-500 leading-tight">
                                                via {activeModelProvider}
                                                {selectedModel === 'auto' && (
                                                    <span className="ml-1.5 text-[9px] font-semibold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-px rounded">AUTO</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Model selector — inline expand */}
                                    <div ref={sessionModelRef}>
                                        <button onClick={() => setShowSessionModelMenu(!showSessionModelMenu)}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50 dark:bg-slate-800/50 transition-colors text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                <Settings className="h-3 w-3" /> Switch Model
                                            </span>
                                            <ChevronDown className={cn('h-3 w-3 transition-transform', showSessionModelMenu && 'rotate-180')} />
                                        </button>

                                        {showSessionModelMenu && (
                                            <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                                                <div className="py-1 max-h-52 overflow-y-auto">
                                                    {availableModels.map(m => (
                                                        <button key={m.key} onClick={() => { setSelectedModel(m.key); setShowSessionModelMenu(false); }}
                                                            disabled={!m.available}
                                                            className={cn(
                                                                'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                                                                selectedModel === m.key ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/80',
                                                                !m.available && 'opacity-40 cursor-not-allowed'
                                                            )}>
                                                            <div className={cn('h-5 w-5 rounded flex items-center justify-center flex-shrink-0 text-white text-[8px] font-bold', modelBg(m.key))}>
                                                                {modelIcon(m.key)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{m.label}</p>
                                                            </div>
                                                            {selectedModel === m.key && <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <BarChart3 className="h-3 w-3" /> Stats
                                    </h3>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">
                                    <div className="px-3 py-2.5 text-center">
                                        <p className="text-base font-bold text-slate-900 dark:text-white leading-none">{msgCount}</p>
                                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">Messages</p>
                                    </div>
                                    <div className="px-3 py-2.5 text-center">
                                        <p className="text-base font-bold text-slate-900 dark:text-white leading-none">{Math.min(msgCount, 10)}</p>
                                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">Memory</p>
                                    </div>
                                    <div className="px-3 py-2.5 text-center">
                                        <p className="text-base font-bold text-slate-900 dark:text-white leading-none">{lastBot?.meta?.latency ? `${lastBot.meta.latency}s` : '—'}</p>
                                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">Latency</p>
                                    </div>
                                </div>
                            </div>

                            {/* Data Sources — collapsible with connect/disconnect */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <button onClick={() => setSourcesOpen(!sourcesOpen)}
                                    className="w-full px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Database className="h-3 w-3" /> Data Sources
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-slate-400 font-medium">
                                            {cs?.connected_services?.length ?? 0}/{GOOGLE_SERVICES.length}
                                        </span>
                                        <ChevronRight className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', sourcesOpen && 'rotate-90')} />
                                    </div>
                                </button>
                                {sourcesOpen && (
                                    <div className="p-2 space-y-1">
                                        {GOOGLE_SERVICES.map(svc => {
                                            const connected = cs?.connected_services?.includes(svc.key);
                                            return (
                                                <div key={svc.key} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0', svc.bg)}>
                                                        <span className={svc.color}>{svc.icon}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-tight truncate">{svc.label}</p>
                                                        <p className={cn('text-[9px] font-medium leading-tight', connected ? 'text-emerald-500' : 'text-slate-400')}>
                                                            {connected ? 'Connected' : 'Not connected'}
                                                        </p>
                                                    </div>
                                                    {/* Status indicator */}
                                                    <div className={cn(
                                                        'h-6 w-6 rounded-lg flex items-center justify-center border flex-shrink-0',
                                                        connected
                                                            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500'
                                                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400'
                                                    )}>
                                                        {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        {/* Connect/Disconnect all services */}
                                        {cs?.authenticated ? (
                                            <button 
                                                onClick={async () => {
                                                    if (window.confirm('Disconnect all Google services? You\'ll need to re-authenticate to reconnect.')) {
                                                        try {
                                                            await api.post('/api/auth/logout');
                                                            fetchContextSnapshot();
                                                        } catch (err) {
                                                            console.error('Logout failed:', err);
                                                        }
                                                    }
                                                }}
                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-[11px] font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors mt-1"
                                            >
                                                <WifiOff className="h-3 w-3" />
                                                Disconnect All Services
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    window.location.href = 'http://localhost:8000/api/auth/google';
                                                }}
                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 text-[11px] font-medium text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors mt-1"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Connect Google Services
                                            </button>
                                        )}
                                        
                                        {/* Sync all button */}
                                        <button onClick={() => { fetchContextSnapshot(); }} disabled={contextLoading}
                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors mt-1 disabled:opacity-50">
                                            <RefreshCw className={cn('h-3 w-3', contextLoading && 'animate-spin')} />
                                            {contextLoading ? 'Syncing...' : 'Sync All Services'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Context Sources (last response) */}
                            {(() => {
                                const lastCtx = messages.filter(m => m.role === 'assistant' && m.meta?.contextSources?.length).pop();
                                if (!lastCtx?.meta?.contextSources?.length) return null;
                                return (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Layers className="h-3 w-3" /> Last Sources
                                            </h3>
                                        </div>
                                        <div className="px-3 py-2 flex flex-wrap gap-1.5">
                                            {lastCtx.meta.contextSources.map(src => (
                                                <span key={src} className="text-[10px] font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md">{src}</span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Agents Used (last response) */}
                            {(() => {
                                const lastAgent = messages.filter(m => m.role === 'assistant' && m.meta?.agentsUsed?.length).pop();
                                if (!lastAgent?.meta?.agentsUsed?.length) return null;
                                return (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Sparkles className="h-3 w-3" /> Agents Used
                                            </h3>
                                        </div>
                                        <div className="px-3 py-2 flex flex-wrap gap-1.5">
                                            {lastAgent.meta.agentsUsed.map(agent => (
                                                <span key={agent} className="text-[10px] font-medium text-violet-600 bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded-md">{agent}</span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </>)}
                    </div>
                </aside>
            </div>
        </div>
    );
}

