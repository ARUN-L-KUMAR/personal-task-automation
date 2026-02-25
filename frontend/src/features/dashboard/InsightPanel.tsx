import React from 'react';
import { cn } from '../../utils/cn';
import { BrainCircuit, Sparkles } from 'lucide-react';
import { Insight } from '../../services/dashboard.service';

const toneIcons: Record<string, { icon: string; color: string }> = {
    success: { icon: '✓', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    warning: { icon: '⚠', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    danger: { icon: '✖', color: 'text-red-600 bg-red-50 border-red-200' },
    info: { icon: '→', color: 'text-blue-600 bg-blue-50 border-blue-200' },
};

interface InsightPanelProps {
    insights: Insight[];
}

export function InsightPanel({ insights }: InsightPanelProps) {
    if (!insights || insights.length === 0) {
        return (
            <div className="py-12 text-center">
                <p className="text-sm text-slate-400 italic">
                    No strategic insights available. Connect services to enable AI analysis.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-6">
            <div className="flex items-center gap-2.5 mb-5">
                <div className="p-2 rounded-lg bg-blue-100">
                    <BrainCircuit className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        G-One Strategic Insight
                        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                        Merged intelligence from Calendar, Task, Travel & Planning agents
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {insights.map((insight, i) => {
                    const tone = toneIcons[insight.tone] || toneIcons.info;
                    return (
                        <div
                            key={i}
                            className={cn(
                                'rounded-lg border p-4 transition-colors',
                                tone.color
                            )}
                        >
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">
                                {insight.label}
                            </p>
                            <p className="text-sm font-semibold">{insight.value}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
