import React from 'react';
import { AlertTriangle, Car, Gauge, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';
import { PlannerResult } from '../../types/planner.types';

interface Props {
    result: PlannerResult;
}

function fmtFree(mins?: number): string {
    if (!mins || mins <= 0) return '0m free';
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m free` : `${mins}m free`;
}

export function SummaryStrip({ result }: Props) {
    const { conflicts, travel, insights } = result;
    const score = insights.productivityScore;
    const scoreColor = score >= 80 ? 'text-emerald-600 bg-emerald-50' : score >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';

    const cards = [
        {
            icon: AlertTriangle,
            label: 'Conflicts',
            value: conflicts.length,
            color: conflicts.length > 0 ? 'text-red-600 bg-red-50 border-red-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100',
        },
        {
            icon: Car,
            label: 'Travel Time',
            value: travel.totalMinutes > 0 ? `${Math.floor(travel.totalMinutes / 60)}h ${travel.totalMinutes % 60}m` : '0m',
            color: travel.totalMinutes > 120 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-slate-600 bg-slate-50 border-slate-100',
        },
        {
            icon: Gauge,
            label: 'Productivity',
            value: `${score}%`,
            color: cn(scoreColor, score >= 80 ? 'border-emerald-100' : score >= 60 ? 'border-amber-100' : 'border-red-100'),
        },
        {
            icon: Zap,
            label: 'Overload Risk',
            value: insights.overloadDetected ? 'High' : insights.burnoutRisk ? 'Moderate' : 'Low',
            sub: `${insights.utilizationPercent ?? 0}% utilized · ${fmtFree(insights.freeTimeMinutes)}`,
            color: insights.overloadDetected ? 'text-red-600 bg-red-50 border-red-100' : insights.burnoutRisk ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100',
        },
    ];

    return (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {cards.map((c) => (
                <div key={c.label} className={cn('min-w-0 rounded-xl border p-3 flex items-center gap-3', c.color)}>
                    <c.icon className="h-5 w-5 flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 truncate">{c.label}</p>
                        <p className="text-lg font-black leading-tight break-words">{c.value}</p>
                        {'sub' in c && c.sub && (
                            <p className="text-[9px] font-medium opacity-60 mt-0.5 leading-tight break-words">{c.sub}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
