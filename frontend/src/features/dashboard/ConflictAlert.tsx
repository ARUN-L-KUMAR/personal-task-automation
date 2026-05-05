import React from 'react';
import { cn } from '../../utils/cn';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Conflict } from '../../services/dashboard.service';

interface ConflictAlertProps {
    conflicts: Conflict[];
    severity: string;
}

export function ConflictAlert({ conflicts, severity }: ConflictAlertProps) {
    const navigate = useNavigate();

    if (!conflicts || conflicts.length === 0) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-emerald-50/60 backdrop-blur-md border border-emerald-200/60 p-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
                <div className="relative flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-emerald-800">No Scheduling Conflicts</p>
                        <p className="text-xs text-emerald-600 mt-0.5">All clear for today.</p>
                    </div>
                </div>
            </div>
        );
    }

    const severityConfig = {
        high: { bg: 'bg-red-50/60', border: 'border-red-200/60', text: 'text-red-800', sub: 'text-red-600', badge: 'bg-red-100/80 text-red-700', accent: 'from-red-500/10' },
        medium: { bg: 'bg-amber-50/60', border: 'border-amber-200/60', text: 'text-amber-800', sub: 'text-amber-600', badge: 'bg-amber-100/80 text-amber-700', accent: 'from-amber-500/10' },
        low: { bg: 'bg-yellow-50/60', border: 'border-yellow-200/60', text: 'text-yellow-800', sub: 'text-yellow-600', badge: 'bg-yellow-100/80 text-yellow-700', accent: 'from-yellow-500/10' },
    };

    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.medium;

    return (
        <div className={cn('relative overflow-hidden rounded-2xl border p-5 backdrop-blur-md', config.bg, config.border)}>
            <div className={cn('absolute inset-0 bg-gradient-to-br', config.accent)} />
            <div className="relative">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white/60 backdrop-blur-sm">
                            <AlertTriangle className={cn('h-5 w-5', config.sub)} />
                        </div>
                        <div>
                            <p className={cn('text-sm font-bold', config.text)}>
                                {conflicts.length} Scheduling Conflict{conflicts.length > 1 ? 's' : ''}
                            </p>
                            <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mt-1 inline-block', config.badge)}>
                                {severity} severity
                            </span>
                        </div>
                    </div>
                </div>
                <div className="space-y-2 mb-4">
                    {conflicts.slice(0, 2).map((c, i) => (
                        <p key={i} className={cn('text-xs', config.sub)}>
                            <span className="font-bold">{c.event_a}</span> overlaps with{' '}
                            <span className="font-bold">{c.event_b}</span> ({c.overlap_minutes}m)
                        </p>
                    ))}
                </div>
                <button
                    onClick={() => navigate('/planner')}
                    className={cn('text-xs font-bold px-3.5 py-2 rounded-xl border transition-all hover:opacity-80', config.badge, config.border)}
                >
                    Review in Planner →
                </button>
            </div>
        </div>
    );
}
