import React from 'react';
import { Bot, User, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ChatMessage } from '../../hooks/useChat';

interface Props {
    message: ChatMessage;
    compact?: boolean;
}

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
    // Split on **bold**, *italic*, `code`
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

export function ChatMessageBubble({ message, compact = false }: Props) {
    const isUser = message.role === 'user';
    const isError = message.error;

    const avatarSize = compact ? 'h-7 w-7' : 'h-9 w-9';
    const avatarIcon = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
    const textSize = compact ? 'text-xs' : 'text-sm';
    const padding = compact ? 'px-3 py-2' : 'px-4 py-3';
    const timestamp = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={cn(
            'flex items-end gap-2',
            isUser ? 'flex-row-reverse' : 'flex-row'
        )}>
            {/* Avatar */}
            <div className={cn(
                'rounded-xl flex items-center justify-center flex-shrink-0 border',
                avatarSize,
                isUser
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                    : isError
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-500'
                        : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
            )}>
                {isUser ? <User className={avatarIcon} /> : <Bot className={avatarIcon} />}
            </div>

            {/* Bubble */}
            <div className={cn('flex flex-col gap-0.5', isUser ? 'items-end' : 'items-start', 'max-w-[78%]')}>
                <div className={cn(
                    'rounded-2xl leading-relaxed',
                    padding, textSize,
                    isUser
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : isError
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800 rounded-tl-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                )}>
                    {isUser ? (
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    ) : (
                        <RenderMarkdown text={message.content} />
                    )}
                </div>
                <div className={cn(
                    'flex items-center gap-1 text-[9px] text-slate-400 px-1',
                    isUser ? 'flex-row-reverse' : ''
                )}>
                    <span>{timestamp}</span>
                    {!isUser && message.usedContext && (
                        <span className="flex items-center gap-0.5 text-emerald-500" title="Used your live Google data">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Live
                        </span>
                    )}
                    {isError && <AlertTriangle className="h-2.5 w-2.5 text-red-400" />}
                </div>
            </div>
        </div>
    );
}
