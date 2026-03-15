import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertTriangle, XCircle, Circle } from 'lucide-react';
import { AgentStep } from '../../types/planner.types';
import { cn } from '../../utils/cn';

interface Props {
    steps: AgentStep[];
}

const statusIcon: Record<string, React.ReactNode> = {
    idle: <Circle className="h-4 w-4 text-slate-300" />,
    running: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    error: <XCircle className="h-4 w-4 text-red-500" />,
};

const statusLine: Record<string, string> = {
    idle: 'bg-slate-200',
    running: 'bg-blue-400 animate-pulse',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error: 'bg-red-400',
};

export function ExecutionTimeline({ steps }: Props) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
                AI Agent Execution Pipeline
            </h3>
            <div className="space-y-0">
                {steps.map((step, i) => (
                    <motion.div
                        key={step.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 relative"
                    >
                        {/* Connector line */}
                        {i < steps.length - 1 && (
                            <div className={cn('absolute left-[7px] top-[24px] w-0.5 h-5', statusLine[step.status])} />
                        )}
                        {/* Icon */}
                        <div className="relative z-10 flex-shrink-0">
                            {statusIcon[step.status]}
                        </div>
                        {/* Label */}
                        <div className="flex-1 flex items-center justify-between py-2.5">
                            <span className={cn(
                                'text-xs font-semibold',
                                step.status === 'running' ? 'text-blue-700' :
                                step.status === 'success' ? 'text-slate-700' :
                                step.status === 'error' ? 'text-red-600' :
                                'text-slate-400'
                            )}>
                                {step.label}
                            </span>
                            {step.summary && (
                                <span className="text-[10px] text-slate-400 max-w-[50%] truncate text-right">
                                    {step.summary}
                                </span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
