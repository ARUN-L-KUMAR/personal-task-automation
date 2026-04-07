import React from 'react';
import { cn } from '../../utils/cn';
import { BrainCircuit, Sparkles } from 'lucide-react';
import { Insight } from '../../services/dashboard.service';

const toneIcons: Record<string, { icon: string; color: string }> = {
    success: { icon: '✓', color: 'text-emerald-600 bg-emerald-50/80 border-emerald-200/60' },
    warning: { icon: '⚠', color: 'text-amber-600 bg-amber-50/80 border-amber-200/60' },
    danger: { icon: '✖', color: 'text-red-600 bg-red-50/80 border-red-200/60' },
    info: { icon: '→', color: 'text-blue-600 bg-blue-50/80 border-blue-200/60' },
};

interface InsightPanelProps {
    insights: Insight[];
}

export function InsightPanel({ insights }: InsightPanelProps) {
    if (!insights || insights.length === 0) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-blue-50/40 backdrop-blur-md border border-blue-200/40 p-8 text-center">
                <p className="text-sm text-slate-400 italic">
                    No strategic insights available. Connect services to enable AI analysis.
                </p>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 backdrop-blur-md border border-blue-200/40 p-6">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-200/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-xl bg-blue-100">
                        <BrainCircuit className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
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
                                    'rounded-xl border p-4 transition-all hover:shadow-md',
                                    tone.color
                                )}
                            >
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1.5">
                                    {insight.label}
                                </p>
                                <p className="text-sm font-bold">{insight.value}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
