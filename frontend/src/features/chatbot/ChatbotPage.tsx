import React, { useEffect, useState, useRef } from 'react';
import {
    Send, Sparkles, Trash2, Bot, Loader2,
    Calendar, Mail, CheckSquare, Map, Zap, Command,
    Eye, EyeOff, Clock, AlertTriangle, Terminal,
    Wifi, WifiOff, Brain, Activity, Database,
    MessageSquare, RefreshCw, ChevronRight, ChevronDown,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { useChat } from '../../hooks/useChat';
import { ChatMessageBubble } from './ChatMessageBubble';

/* ── Quick Actions ── */
const QUICK_ACTIONS = [
    { label: "What's my next meeting?", icon: <Calendar className="h-3.5 w-3.5" />, color: 'text-blue-500', scope: 'calendar' },
    { label: "Any urgent emails?", icon: <Mail className="h-3.5 w-3.5" />, color: 'text-red-500', scope: 'email' },
    { label: "Summarize my pending tasks", icon: <CheckSquare className="h-3.5 w-3.5" />, color: 'text-emerald-500', scope: 'tasks' },
    { label: "Any conflicts today?", icon: <Zap className="h-3.5 w-3.5" />, color: 'text-amber-500', scope: 'calendar' },
    { label: "Plan my day", icon: <Sparkles className="h-3.5 w-3.5" />, color: 'text-violet-500', scope: 'plan' },
    { label: "How's my travel looking?", icon: <Map className="h-3.5 w-3.5" />, color: 'text-indigo-500', scope: 'travel' },
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
    { key: 'all', label: 'All', icon: <Command className="h-3 w-3" /> },
    { key: 'calendar', label: 'Calendar', icon: <Calendar className="h-3 w-3" /> },
    { key: 'email', label: 'Email', icon: <Mail className="h-3 w-3" /> },
    { key: 'tasks', label: 'Tasks', icon: <CheckSquare className="h-3 w-3" /> },
    { key: 'travel', label: 'Travel', icon: <Map className="h-3 w-3" /> },
];

/* ── Typing animation ── */
function TypingText({ text, speed = 35 }: { text: string; speed?: number }) {
    const [displayed, setDisplayed] = useState('');
    const idx = useRef(0);
    useEffect(() => {
        idx.current = 0;
        setDisplayed('');
        const iv = setInterval(() => {
            idx.current++;
            setDisplayed(text.slice(0, idx.current));
            if (idx.current >= text.length) clearInterval(iv);
        }, speed);
        return () => clearInterval(iv);
    }, [text, speed]);
    return <>{displayed}<span className="animate-pulse">|</span></>;
}

/* ── Format time helper ── */
function fmtTime(iso: string) {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
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
    const modelMenuRef = useRef<HTMLDivElement>(null);

    // Fetch context snapshot on mount and every 60s
    useEffect(() => {
        fetchContextSnapshot();
        fetchAvailableModels();
        const iv = setInterval(fetchContextSnapshot, 60000);
        return () => clearInterval(iv);
    }, [fetchContextSnapshot, fetchAvailableModels]);

    // Close model menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
                setShowModelMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Slash command detection
    useEffect(() => {
        setShowSlashMenu(input.startsWith('/') && !input.includes(' '));
    }, [input]);

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = (text?: string) => {
        let msg = text ?? input;
        // Slash command expansion
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
        // Scope prefix
        if (inputScope !== 'all' && !text) {
            const prefix: Record<string, string> = {
                calendar: 'Regarding my calendar: ',
                email: 'Regarding my emails: ',
                tasks: 'Regarding my tasks: ',
                travel: 'Regarding travel: ',
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

    const cs = contextSnapshot; // alias

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-2">
            {/* ── Header + Context in one row ── */}
            <div className="flex-shrink-0 flex flex-col gap-2">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            AI Assistant
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span className="text-[9px] font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">Online</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline" size="sm"
                            onClick={() => setShowReasoning(!showReasoning)}
                            className={cn(
                                'h-7 text-[10px] px-2',
                                showReasoning
                                    ? 'border-indigo-300 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'text-slate-500 dark:border-slate-700'
                            )}
                        >
                            {showReasoning ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                            Reasoning
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearChat}
                            className="text-slate-500 dark:border-slate-700 h-7 text-[10px] px-2">
                            <Trash2 className="h-3 w-3 mr-1" /> Clear
                        </Button>
                    </div>
                </header>

                {/* ── Compact Live Context Snapshot ── */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Next Meeting</p>
                            {contextLoading ? (
                                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-0.5" />
                            ) : cs?.next_meeting ? (
                                <p className="text-[11px] font-semibold text-slate-900 dark:text-white truncate leading-tight mt-0.5">{fmtTime(cs.next_meeting.start)} — {cs.next_meeting.title}</p>
                            ) : (
                                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">No upcoming</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                            <Mail className="h-3.5 w-3.5 text-red-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Unread Emails</p>
                            {contextLoading ? (
                                <div className="h-3 w-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-0.5" />
                            ) : (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[11px] font-semibold text-slate-900 dark:text-white">{cs?.unread_emails ?? '—'}</span>
                                    {(cs?.urgent_emails ?? 0) > 0 && (
                                        <span className="text-[9px] text-red-500 font-bold">({cs!.urgent_emails} urgent)</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Pending Tasks</p>
                            {contextLoading ? (
                                <div className="h-3 w-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-0.5" />
                            ) : (
                                <p className="text-[11px] font-semibold text-slate-900 dark:text-white leading-tight mt-0.5">{cs?.pending_tasks ?? '—'}</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 flex items-center gap-2.5">
                        <div className={cn(
                            'h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0',
                            (cs?.conflicts_today ?? 0) > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50 dark:bg-slate-800'
                        )}>
                            <AlertTriangle className={cn('h-3.5 w-3.5', (cs?.conflicts_today ?? 0) > 0 ? 'text-amber-500' : 'text-slate-400')} />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Conflicts</p>
                            {contextLoading ? (
                                <div className="h-3 w-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-0.5" />
                            ) : (
                                <p className={cn('text-[11px] font-semibold leading-tight mt-0.5',
                                    (cs?.conflicts_today ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'
                                )}>
                                    {(cs?.conflicts_today ?? 0) > 0 ? `${cs!.conflicts_today} today` : 'None'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main layout ── */}
            <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">

                {/* ── Chat Area ── */}
                <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 min-h-0">
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
                        {/* ── Enhanced empty state ── */}
                        {!hasRealMessages && messages.length === 1 && (
                            <div className="flex flex-col items-center justify-center h-full text-center py-4">
                                <div className="relative mb-4">
                                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                                        <Bot className="h-7 w-7 text-white" />
                                    </div>
                                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900" />
                                    </span>
                                </div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">
                                    <TypingText text="Hi! I'm G-One, your AI assistant." speed={40} />
                                </h2>
                                <p className="text-xs text-slate-500 max-w-sm mb-4">
                                    Real-time access to your Google data to help manage your day intelligently.
                                </p>

                                {/* Connected services icons */}
                                <div className="flex items-center gap-2 mb-4">
                                    {[
                                        { icon: <Calendar className="h-3.5 w-3.5" />, label: 'Calendar', connected: cs?.connected_services?.includes('Calendar') },
                                        { icon: <Mail className="h-3.5 w-3.5" />, label: 'Gmail', connected: cs?.connected_services?.includes('Gmail') },
                                        { icon: <CheckSquare className="h-3.5 w-3.5" />, label: 'Tasks', connected: cs?.connected_services?.includes('Tasks') },
                                    ].map(svc => (
                                        <div key={svc.label} className={cn(
                                            'flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium',
                                            svc.connected
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                        )}>
                                            {svc.icon}
                                            {svc.label}
                                            {svc.connected ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                                        </div>
                                    ))}
                                </div>

                                {/* Slash commands hint */}
                                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2 max-w-xs">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Terminal className="h-2.5 w-2.5" /> Quick Commands
                                    </p>
                                    <div className="grid grid-cols-2 gap-1">
                                        {SLASH_COMMANDS.slice(0, 4).map(c => (
                                            <button key={c.cmd} onClick={() => { setInput(c.cmd); }}
                                                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 transition-colors text-left">
                                                {c.icon} <span className="font-mono font-medium">{c.cmd}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Messages ── */}
                        {(hasRealMessages || messages.length > 1) && messages.map((msg, idx) => (
                            <ChatMessageBubble
                                key={msg.id}
                                message={msg}
                                showReasoning={showReasoning}
                                isLatest={idx === lastAssistantIdx}
                                onSuggestionClick={(s) => sendMessage(s)}
                            />
                        ))}

                        {/* ── Loading indicator ── */}
                        {isLoading && (
                            <div className="flex items-end gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center flex-shrink-0">
                                    <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1.5 items-center">
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                                                    style={{ animationDelay: `${i * 0.15}s` }} />
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-slate-400">Consulting agents…</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={endRef} />
                    </div>

                    {/* ── Divider ── */}
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

                    {/* ── Input Bar ── */}
                    <div className="flex-shrink-0 px-4 py-2.5 bg-white dark:bg-slate-900/60">
                        {/* Scope filters */}
                        <div className="flex items-center gap-0.5 mb-1.5">
                            {INPUT_SCOPES.map(s => (
                                <button
                                    key={s.key}
                                    onClick={() => setInputScope(s.key)}
                                    className={cn(
                                        'flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded transition-all',
                                        inputScope === s.key
                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    )}
                                >
                                    {s.icon} {s.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            {/* Slash command menu */}
                            {showSlashMenu && (
                                <div className="absolute bottom-full left-0 mb-2 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-30">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">Commands</p>
                                    {SLASH_COMMANDS.filter(c => c.cmd.startsWith(input.toLowerCase())).map(c => (
                                        <button key={c.cmd} onClick={() => { setInput(c.cmd); setShowSlashMenu(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left">
                                            <span className="text-indigo-500">{c.icon}</span>
                                            <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">{c.cmd}</span>
                                            <span className="text-[9px] text-slate-400 ml-auto">{c.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder={inputScope === 'all' ? 'Ask anything or type / for commands…' : `Ask about ${inputScope}…`}
                                rows={1}
                                disabled={isLoading}
                                className="w-full resize-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-4 pr-12 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-60"
                                style={{ minHeight: '42px', maxHeight: '100px' }}
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={isLoading || !input.trim()}
                                className={cn(
                                    'absolute right-2.5 bottom-2 h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200',
                                    input.trim() && !isLoading
                                        ? 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 text-white shadow-lg shadow-indigo-500/25'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                )}
                            >
                                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                        <div className="flex items-center justify-between mt-1 px-0.5">
                            {/* Model Selector */}
                            <div className="relative" ref={modelMenuRef}>
                                <button
                                    onClick={() => setShowModelMenu(!showModelMenu)}
                                    className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-indigo-500 transition-colors group"
                                >
                                    <Activity className="h-2.5 w-2.5" />
                                    <span>
                                        {selectedModel === 'auto'
                                            ? `${currentModel} (${currentModelSource}) · Auto`
                                            : (() => {
                                                const sel = availableModels.find(m => m.key === selectedModel);
                                                return sel ? `${sel.label} (${sel.provider || sel.key})` : `${currentModel} (${currentModelSource})`;
                                            })()
                                        }
                                    </span>
                                    <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', showModelMenu && 'rotate-180')} />
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span>Live Google Data</span>
                                </button>

                                {showModelMenu && (
                                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-40">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">Select AI Model</p>
                                        {availableModels.map(m => (
                                            <button
                                                key={m.key}
                                                onClick={() => { setSelectedModel(m.key); setShowModelMenu(false); }}
                                                disabled={!m.available}
                                                className={cn(
                                                    'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                                                    selectedModel === m.key
                                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 border-l-2 border-transparent',
                                                    !m.available && 'opacity-40 cursor-not-allowed'
                                                )}
                                            >
                                                <div className={cn(
                                                    'h-5 w-5 rounded-md flex items-center justify-center flex-shrink-0 text-[8px] font-bold',
                                                    m.key === 'auto' ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white' :
                                                    m.key === 'groq' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                                                    m.key === 'gemini' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                                                    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                                )}>
                                                    {m.key === 'auto' ? <Zap className="h-2.5 w-2.5" /> : m.key[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                        {m.label}
                                                        {m.provider && <span className="text-[9px] font-normal text-slate-400 ml-1">via {m.provider}</span>}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 truncate">{m.description}</p>
                                                </div>
                                                {selectedModel === m.key && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                                )}
                                                {!m.available && (
                                                    <span className="text-[8px] text-red-400 font-medium">No key</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-[9px] text-slate-400 flex items-center gap-1">
                                <Brain className="h-2.5 w-2.5" />
                                Memory: last {Math.min(messages.filter(m => m.id !== 'welcome').length, 10)} msgs
                            </p>
                        </div>
                    </div>
                </Card>

                {/* ── Sidebar ── */}
                <aside className="w-full lg:w-60 flex flex-col flex-shrink-0 min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-0.5">

                        {/* G-One Branding — compact inline */}
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg px-3 py-2 flex items-center gap-2 shadow-md shadow-indigo-500/15 relative overflow-hidden">
                            <div className="h-7 w-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Bot className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-xs leading-tight">G-One AI</p>
                                <p className="text-[9px] text-indigo-200 leading-tight">Multi-Agent Engine · Live Context</p>
                            </div>
                            <div className="absolute -right-3 -top-3 h-14 w-14 bg-white/10 rounded-full blur-xl" />
                        </div>

                        {/* Quick Actions — compact list */}
                        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Command className="h-2.5 w-2.5" /> Quick Actions
                                </h3>
                            </div>
                            <div>
                                {QUICK_ACTIONS.map(a => (
                                    <button key={a.label} onClick={() => handleSend(a.label)}
                                        className="w-full flex items-center gap-2 px-3 py-[6px] hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all text-left group border-b border-slate-50 dark:border-slate-800/40 last:border-0">
                                        <span className={cn('flex-shrink-0', a.color)}>{a.icon}</span>
                                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1 truncate">
                                            {a.label}
                                        </span>
                                        <ChevronRight className="h-2.5 w-2.5 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </Card>

                        {/* AI Tools — inline row */}
                        <div className="px-1">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 px-1">
                                <Terminal className="h-2.5 w-2.5" /> AI Tools
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {SLASH_COMMANDS.map(c => (
                                    <button key={c.cmd}
                                        onClick={() => handleSend(c.cmd)}
                                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-150 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                                    >
                                        <span className="text-indigo-500">{c.icon}</span>
                                        <span className="text-[9px] font-mono font-semibold text-slate-500 dark:text-slate-400">{c.cmd}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Session Info — redesigned */}
                        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                                <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Activity className="h-2.5 w-2.5" /> Session
                                </h3>
                                <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                </span>
                            </div>

                            {/* Model highlight */}
                            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        'h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[9px] font-bold',
                                        selectedModel === 'gemini' || (selectedModel === 'auto' && currentModel.toLowerCase().includes('gemini'))
                                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
                                            : selectedModel === 'openrouter'
                                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
                                            : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600'
                                    )}>
                                        {(() => {
                                            const isGemini = selectedModel === 'gemini' || (selectedModel === 'auto' && currentModel.toLowerCase().includes('gemini'));
                                            return isGemini ? 'G' : 'L';
                                        })()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                                            {(() => {
                                                if (selectedModel === 'auto') return currentModel;
                                                const sel = availableModels.find(m => m.key === selectedModel);
                                                return sel ? sel.label : currentModel;
                                            })()}
                                        </p>
                                        <p className="text-[9px] text-slate-500 leading-tight">
                                            via{' '}
                                            <span className={cn(
                                                'font-semibold',
                                                selectedModel === 'auto' ? 'text-violet-500' : 'text-indigo-500'
                                            )}>
                                                {selectedModel === 'auto' ? (currentModelSource || 'Auto') : (() => {
                                                    const sel = availableModels.find(m => m.key === selectedModel);
                                                    return sel?.provider || selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1);
                                                })()}
                                            </span>
                                            {selectedModel === 'auto' && (
                                                <span className="ml-1 text-[8px] text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-1 py-px rounded">Auto</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats row */}
                            <div className="px-3 py-2 flex items-center gap-3">
                                <div className="flex-1 text-center">
                                    <p className="text-[14px] font-bold text-slate-900 dark:text-white leading-none">{messages.filter(m => m.id !== 'welcome').length}</p>
                                    <p className="text-[8px] text-slate-400 mt-0.5">Msgs</p>
                                </div>
                                <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                                <div className="flex-1 text-center">
                                    <p className="text-[14px] font-bold text-slate-900 dark:text-white leading-none">{Math.min(messages.filter(m => m.id !== 'welcome').length, 10)}</p>
                                    <p className="text-[8px] text-slate-400 mt-0.5">Memory</p>
                                </div>
                                <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                                <div className="flex-1 text-center">
                                    {(() => {
                                        const lastBot = messages.filter(m => m.role === 'assistant' && m.meta?.latency).pop();
                                        return (
                                            <>
                                                <p className="text-[14px] font-bold text-slate-900 dark:text-white leading-none">{lastBot?.meta?.latency ? `${lastBot.meta.latency}s` : '—'}</p>
                                                <p className="text-[8px] text-slate-400 mt-0.5">Latency</p>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Context sources footer */}
                            {(() => {
                                const lastBot = messages.filter(m => m.role === 'assistant' && m.meta?.contextSources?.length).pop();
                                if (!lastBot?.meta?.contextSources?.length) return null;
                                return (
                                    <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex items-center gap-1">
                                        <Database className="h-2.5 w-2.5 text-slate-400 flex-shrink-0" />
                                        <span className="text-[9px] text-slate-500 truncate">{lastBot.meta.contextSources.join(' + ')}</span>
                                    </div>
                                );
                            })()}
                        </Card>
                    </div>

                    {/* Refresh context — pinned at bottom */}
                    <button
                        onClick={fetchContextSnapshot}
                        disabled={contextLoading}
                        className="flex items-center justify-center gap-1 text-[9px] font-medium text-slate-400 hover:text-indigo-500 transition-colors py-1.5 flex-shrink-0 border-t border-slate-100 dark:border-slate-800 mt-1"
                    >
                        <RefreshCw className={cn('h-2.5 w-2.5', contextLoading && 'animate-spin')} />
                        {contextLoading ? 'Refreshing…' : 'Refresh context'}
                    </button>
                </aside>
            </div>
        </div>
    );
}
