import React from 'react';
import { cn } from '../../utils/cn';
import { Clock } from 'lucide-react';
import { TimelineEntry } from '../../services/dashboard.service';

const typeStyles: Record<string, { border: string; bg: string; dot: string; label: string }> = {
    meeting: { border: 'border-l-blue-500', bg: 'bg-blue-50/40', dot: 'bg-blue-500', label: 'Meeting' },
    task: { border: 'border-l-emerald-500', bg: 'bg-emerald-50/40', dot: 'bg-emerald-500', label: 'Task' },
    travel: { border: 'border-l-amber-500', bg: 'bg-amber-50/40', dot: 'bg-amber-500', label: 'Travel' },
    conflict: { border: 'border-l-red-500', bg: 'bg-red-50/40', dot: 'bg-red-500', label: 'Conflict' },
};

function formatTime(iso: string): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return '';
    }
}

interface TimelineBlockProps {
    entries: TimelineEntry[];
}

export function TimelineBlock({ entries }: TimelineBlockProps) {
    if (!entries || entries.length === 0) {
        return (
            <div className="py-16 text-center">
                <p className="text-sm text-slate-400 italic">No scheduled items for today.</p>
            </div>
        );
    }

    const sorted = [...entries].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    return (
        <div className="relative">
            {/* Vertical timeline guide */}
            <div className="absolute left-[76px] top-3 bottom-3 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent dark:from-slate-700" />

            <div className="space-y-1.5">
                {sorted.map((entry, i) => {
                    const style = typeStyles[entry.type] || typeStyles.meeting;
                    return (
                        <div
                            key={i}
                            className={cn(
                                'relative flex items-start gap-3 p-3 rounded-lg border-l-[3px] transition-all duration-200 group',
                                'hover:shadow-sm hover:translate-x-0.5 cursor-default',
                                style.border,
                                i % 2 === 0 ? style.bg : 'bg-white/60 dark:bg-slate-900/40'
                            )}
                        >
                            <div className="min-w-[54px] text-right">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {formatTime(entry.time)}
                                </span>
                            </div>
                            {/* Dot on timeline */}
                            <div className="relative z-10 flex-shrink-0">
                                <div className={cn(
                                    'h-2.5 w-2.5 mt-1 rounded-full ring-2 ring-white dark:ring-slate-900 transition-transform group-hover:scale-125',
                                    style.dot
                                )} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {entry.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {entry.end_time && (
                                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatTime(entry.time)} – {formatTime(entry.end_time)}
                                        </span>
                                    )}
                                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', style.bg, style.border.replace('border-l-', 'text-'))}>
                                        {style.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
