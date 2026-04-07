import React from 'react';
import { cn } from '../../utils/cn';
import { AgentStatus } from '../../services/dashboard.service';

const agentLabels: Record<string, string> = {
    calendar: 'Calendar',
    tasks: 'Tasks',
    email: 'Email',
    conflict: 'Conflict',
    travel: 'Travel',
    planning: 'Planning',
};

const stateColors: Record<string, { bg: string; text: string; dot: string }> = {
    idle: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-500', dot: 'bg-slate-400' },
    grey: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-500', dot: 'bg-slate-400' },
    running: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
    success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    error: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
};

interface AgentStatusStripProps {
    status: Partial<AgentStatus>;
    executionStates?: Record<string, string>;
}

export function AgentStatusStrip({ status, executionStates }: AgentStatusStripProps) {
    const entries = Object.entries(agentLabels).map(([key, label]) => {
        const execState = executionStates?.[key];
        const agentStatus = status?.[key as keyof AgentStatus] || 'grey';
        const displayState = execState || agentStatus;
        return { key, label, displayState };
    });

    const activeCount = entries.filter(({ displayState }) => displayState !== 'idle' && displayState !== 'grey').length;

    return (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold text-slate-500">
                    Agents
                </span>
                {entries.map(({ key, label, displayState }) => {
                const colors = stateColors[displayState] || stateColors.grey;
                const isRunning = displayState === 'running';

                return (
                    <div
                        key={key}
                        className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-500',
                            colors.bg,
                            colors.text,
                            isRunning && 'scale-105 shadow-sm shadow-blue-100'
                        )}
                    >
                        <span
                            className={cn(
                                'h-2 w-2 rounded-full transition-all duration-300',
                                colors.dot,
                                isRunning && 'animate-pulse scale-150'
                            )}
                        />
                        {label}
                    </div>
                );
                })}
            </div>

            <div className="text-sm font-semibold text-slate-500">
                {activeCount > 0 ? `${activeCount} of ${entries.length} agents active` : `All ${entries.length} agents standing by`}
            </div>
        </div>
    );
}
