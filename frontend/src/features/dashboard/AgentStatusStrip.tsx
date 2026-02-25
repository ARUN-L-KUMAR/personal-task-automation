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
    idle: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-400', dot: 'bg-slate-300' },
    grey: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-400', dot: 'bg-slate-300' },
    running: { bg: 'bg-blue-50 border-blue-300', text: 'text-blue-600', dot: 'bg-blue-500' },
    success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    error: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
};

interface AgentStatusStripProps {
    status: Partial<AgentStatus>;
    executionStates?: Record<string, string>;
}

export function AgentStatusStrip({ status, executionStates }: AgentStatusStripProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                AI Pipeline
            </span>
            {Object.entries(agentLabels).map(([key, label]) => {
                const execState = executionStates?.[key];
                const agentStatus = status?.[key as keyof AgentStatus] || 'grey';
                const displayState = execState || agentStatus;
                const colors = stateColors[displayState] || stateColors.grey;
                const isRunning = displayState === 'running';
                const isSuccess = displayState === 'success';

                return (
                    <div
                        key={key}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all duration-500',
                            colors.bg,
                            colors.text,
                            isRunning && 'shadow-sm shadow-blue-200/60 scale-105'
                        )}
                    >
                        <span
                            className={cn(
                                'h-1.5 w-1.5 rounded-full transition-all duration-300',
                                colors.dot,
                                isRunning && 'animate-pulse scale-150'
                            )}
                        />
                        {label}
                        {isSuccess && (
                            <svg className="h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
