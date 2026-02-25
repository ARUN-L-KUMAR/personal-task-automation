import React, { useState } from 'react';
import {
    Bot, User, CheckCircle2, AlertTriangle, Clock, Cpu, Database,
    ChevronDown, ChevronUp, Calendar, Mail, CheckSquare, Navigation,
    Users, Zap, Sparkles, Activity,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { ChatMessage } from '../../hooks/useChat';

interface Props {
    message: ChatMessage;
    compact?: boolean;
    showReasoning?: boolean;
    onSuggestionClick?: (text: string) => void;
    isLatest?: boolean;
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
    Calendar: <Calendar className="h-3 w-3" />,
    Tasks: <CheckSquare className="h-3 w-3" />,
    Email: <Mail className="h-3 w-3" />,
    Conflict: <Zap className="h-3 w-3" />,
    Planning: <Sparkles className="h-3 w-3" />,
    Travel: <Navigation className="h-3 w-3" />,
    Contacts: <Users className="h-3 w-3" />,
    Coordinator: <Activity className="h-3 w-3" />,
};

const DYNAMIC_SUGGESTIONS: Record<string, string[]> = {
    Calendar: ["Any conflicts today?", "Reschedule my next meeting", "Block focus time"],
    Tasks: ["Which tasks are overdue?", "Prioritize my morning", "Complete a task"],
    Email: ["Draft a reply", "Summarize unread emails", "Flag urgent emails"],
    Planning: ["Optimize my afternoon", "Plan tomorrow", "What should I do next?"],
    Travel: ["Best route to next meeting?", "How long is my commute?"],
    default: ["Plan my afternoon", "Summarize today", "Draft email reply", "Optimize schedule"],
};

/** Very lightweight markdown renderer — handles bold, inline-code, bullet lists */
function RenderMarkdown({ text }: { text: string }) {
    const lines = text.split('\n');
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                // Bullet list item
                if (/^[-*•]\s/.test(line)) {
                    return (
                        <div key={i} className="flex items-start gap-1.5">
                            <span className="mt-1.5 h-1 w-1 rounded-full bg-current flex-shrink-0 opacity-60" />
                            <span>{formatInline(line.replace(/^[-*•]\s/, ''))}</span>
                        </div>
                    );
                }
                // Numbered list
                if (/^\d+\.\s/.test(line)) {
                    const num = line.match(/^(\d+)\./)?.[1];
                    return (
                        <div key={i} className="flex items-start gap-1.5">
                            <span className="font-bold opacity-60 text-[10px] mt-0.5 flex-shrink-0">{num}.</span>
                            <span>{formatInline(line.replace(/^\d+\.\s/, ''))}</span>
                        </div>
                    );
                }
                // Empty line → small gap
                if (!line.trim()) return <div key={i} className="h-1" />;
                return <p key={i}>{formatInline(line)}</p>;
            })}
        </div>
    );
}

function formatInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return (
                <code key={i} className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[11px] font-mono">
                    {part.slice(1, -1)}
                </code>
            );
        }
        return part;
    });
}

export function ChatMessageBubble({ message, compact = false, showReasoning = false, onSuggestionClick, isLatest = false }: Props) {
    const isUser = message.role === 'user';
    const isError = message.error;
    const meta = message.meta;
    const [reasoningOpen, setReasoningOpen] = useState(false);

    const avatarSize = compact ? 'h-7 w-7' : 'h-9 w-9';
    const avatarIcon = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
    const textSize = compact ? 'text-xs' : 'text-sm';
    const padding = compact ? 'px-3 py-2' : 'px-4 py-3';
    const timestamp = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Get dynamic suggestions based on agents used
    const suggestions = React.useMemo(() => {
        if (isUser || !isLatest || !meta?.agentsUsed?.length) return [];
        const pool = new Set<string>();
        meta.agentsUsed.forEach(a => {
            (DYNAMIC_SUGGESTIONS[a] || DYNAMIC_SUGGESTIONS.default).forEach(s => pool.add(s));
        });
        return Array.from(pool).slice(0, 4);
    }, [isUser, isLatest, meta?.agentsUsed]);

    return (
        <div className={cn('flex items-end gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
            {/* Avatar */}
            <div className={cn(
                'rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm',
                avatarSize,
                isUser
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                    : isError
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-500'
                        : 'bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
            )}>
                {isUser ? <User className={avatarIcon} /> : <Bot className={avatarIcon} />}
            </div>

            {/* Bubble + meta */}
            <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start', 'max-w-[78%]')}>
                {/* Main bubble */}
                <div className={cn(
                    'rounded-2xl leading-relaxed shadow-sm',
                    padding, textSize,
                    isUser
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-sm'
                        : isError
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800 rounded-tl-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
                )}>
                    {isUser ? (
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    ) : (
                        <RenderMarkdown text={message.content} />
                    )}
                </div>

                {/* Context badge for assistant messages */}
                {!isUser && message.usedContext && meta?.contextSources && meta.contextSources.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                        <Database className="h-2.5 w-2.5 text-emerald-500" />
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            Used live {meta.contextSources.join(' + ').toLowerCase()} data
                        </span>
                    </div>
                )}

                {/* Agents used indicator */}
                {!isUser && !isError && meta?.agentsUsed && meta.agentsUsed.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[9px] text-slate-400 font-medium">Agents:</span>
                        {meta.agentsUsed.map(agent => (
                            <span key={agent} className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                                {AGENT_ICONS[agent] || <Activity className="h-2.5 w-2.5" />}
                                {agent} ✓
                            </span>
                        ))}
                    </div>
                )}

                {/* Timestamp + metadata row */}
                <div className={cn(
                    'flex items-center gap-2 text-[9px] text-slate-400 px-1',
                    isUser ? 'flex-row-reverse' : ''
                )}>
                    <span>{timestamp}</span>
                    {!isUser && meta?.latency && (
                        <span className="flex items-center gap-0.5" title="Response latency">
                            <Clock className="h-2.5 w-2.5" /> {meta.latency}s
                        </span>
                    )}
                    {!isUser && meta?.model && meta?.modelSource && (
                        <span className="flex items-center gap-0.5" title="Model used">
                            <Cpu className="h-2.5 w-2.5" /> {meta.model} ({meta.modelSource})
                        </span>
                    )}
                    {isError && <AlertTriangle className="h-2.5 w-2.5 text-red-400" />}
                </div>

                {/* Reasoning transparency panel */}
                {showReasoning && !isUser && !isError && meta && (
                    <div className="w-full">
                        <button
                            onClick={() => setReasoningOpen(!reasoningOpen)}
                            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-500 transition-colors"
                        >
                            {reasoningOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            AI Reasoning Steps
                        </button>
                        {reasoningOpen && (
                            <div className="mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700 text-[10px] space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 w-20">Context:</span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                        {meta.contextSources?.length ? meta.contextSources.join(', ') : 'None'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 w-20">Agents:</span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                        {meta.agentsUsed?.join(', ') || 'Coordinator'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 w-20">Model:</span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                        {meta.model || 'Unknown'} ({meta.modelSource || '?'})
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 w-20">Latency:</span>
                                    <span className="text-slate-600 dark:text-slate-300">{meta.latency ? `${meta.latency}s` : '—'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 w-20">Memory:</span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                        Last {meta.memoryMessages || 0} messages
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Suggestion chips — only on latest assistant message */}
                {!isUser && isLatest && !isError && suggestions.length > 0 && onSuggestionClick && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        {suggestions.map(s => (
                            <button
                                key={s}
                                onClick={() => onSuggestionClick(s)}
                                className="text-[10px] px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800/30 hover:border-indigo-300 transition-all"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
