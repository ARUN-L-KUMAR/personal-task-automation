import React from 'react';
import { cn } from '../../utils/cn';
import { Workload } from '../../services/dashboard.service';
import { Gauge } from 'lucide-react';

interface WorkloadPanelProps {
    workload: Workload;
}

export function WorkloadPanel({ workload }: WorkloadPanelProps) {
    const levelConfig = {
        light: { color: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'bg-emerald-50', label: 'Light' },
        moderate: { color: 'text-amber-600', bar: 'bg-amber-500', bg: 'bg-amber-50', label: 'Moderate' },
        heavy: { color: 'text-red-600', bar: 'bg-red-500', bg: 'bg-red-50', label: 'Heavy' },
    };

    const config = levelConfig[workload.level] || levelConfig.light;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Gauge className={cn('h-4 w-4', config.color)} />
                    <span className={cn('text-sm font-bold', config.color)}>{config.label}</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">{workload.total_items} items</span>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all duration-700', config.bar)}
                    style={{ width: `${workload.percentage}%` }}
                />
            </div>

            <p className="text-xs text-slate-400 text-right font-medium">{workload.percentage}%</p>
        </div>
    );
}
