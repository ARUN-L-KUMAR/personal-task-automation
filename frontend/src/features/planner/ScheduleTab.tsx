import React from 'react';
import { cn } from '../../utils/cn';
import { ScheduleEntry } from '../../types/planner.types';

interface Props {
    schedule: ScheduleEntry[];
}

const typeConfig: Record<string, { bg: string; border: string; dot: string; label: string }> = {
    meeting:  { bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500',    label: 'Meeting' },
    task:     { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Task' },
    travel:   { bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500',   label: 'Travel' },
    break:    { bg: 'bg-slate-50',   border: 'border-slate-200',   dot: 'bg-slate-400',   label: 'Break' },
    free:     { bg: 'bg-slate-50',   border: 'border-slate-100',   dot: 'bg-slate-300',   label: 'Free' },
    conflict: { bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500',     label: 'Conflict Adjusted' },
};

export function ScheduleTab({ schedule }: Props) {
    if (!schedule.length) {
        return (
            <div className="text-center py-12 text-slate-400">
                <p className="text-sm">No schedule entries generated.</p>
                <p className="text-xs mt-1">The AI pipeline will populate this after execution.</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4">
                {Object.entries(typeConfig).filter(([k]) => k !== 'free').map(([key, cfg]) => (
                    <span key={key} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                        <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                        {cfg.label}
                    </span>
                ))}
            </div>

            {/* Timeline */}
            <div className="relative pl-16 border-l-2 border-slate-200 space-y-0">
                {schedule.map((entry, i) => {
                    const cfg = typeConfig[entry.isConflictAdjusted ? 'conflict' : entry.type] || typeConfig.task;
                    return (
                        <div key={i} className="relative pb-3 last:pb-0">
                            {/* Time badge */}
                            <div className="absolute -left-16 top-1 w-14 text-right">
                                <span className="text-[11px] font-mono font-bold text-slate-500">{entry.time}</span>
                            </div>
                            {/* Dot */}
                            <div className={cn('absolute -left-[9px] top-2 h-4 w-4 rounded-full border-2 border-white', cfg.dot)} />
                            {/* Card */}
                            <div className={cn('ml-4 rounded-lg border p-3 transition-all hover:shadow-sm', cfg.bg, cfg.border)}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-800">{entry.title}</h4>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            {entry.time} – {entry.endTime}
                                            {entry.location && <span className="ml-2">📍 {entry.location}</span>}
                                        </p>
                                    </div>
                                    <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', cfg.bg, cfg.border)}>
                                        {cfg.label}
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
