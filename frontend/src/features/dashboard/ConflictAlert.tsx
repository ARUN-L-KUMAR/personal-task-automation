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
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-emerald-800">No Scheduling Conflicts</p>
                        <p className="text-xs text-emerald-600 mt-0.5">All clear for today.</p>
                    </div>
                </div>
            </div>
        );
    }

    const severityConfig = {
        high: { bg: 'bg-red-50/60', border: 'border-red-200', text: 'text-red-800', sub: 'text-red-600', badge: 'bg-red-100 text-red-700' },
        medium: { bg: 'bg-amber-50/60', border: 'border-amber-200', text: 'text-amber-800', sub: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
        low: { bg: 'bg-yellow-50/60', border: 'border-yellow-200', text: 'text-yellow-800', sub: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
    };

    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.medium;

    return (
        <div className={cn('rounded-xl border p-5', config.bg, config.border)}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/60">
                        <AlertTriangle className={cn('h-5 w-5', config.sub)} />
                    </div>
                    <div>
                        <p className={cn('text-sm font-semibold', config.text)}>
                            {conflicts.length} Scheduling Conflict{conflicts.length > 1 ? 's' : ''}
                        </p>
                        <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block', config.badge)}>
                            {severity} severity
                        </span>
                    </div>
                </div>
            </div>
            <div className="space-y-2 mb-4">
                {conflicts.slice(0, 2).map((c, i) => (
                    <p key={i} className={cn('text-xs', config.sub)}>
                        <span className="font-semibold">{c.event_a}</span> overlaps with{' '}
                        <span className="font-semibold">{c.event_b}</span> ({c.overlap_minutes}m)
                    </p>
                ))}
            </div>
            <button
                onClick={() => navigate('/planner')}
                className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80', config.badge, config.border)}
            >
                Review in Planner →
            </button>
        </div>
    );
}
