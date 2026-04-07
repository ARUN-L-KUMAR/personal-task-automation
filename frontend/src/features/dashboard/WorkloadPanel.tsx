import React from 'react';
import { cn } from '../../utils/cn';
import { Workload } from '../../services/dashboard.service';
import { Gauge } from 'lucide-react';

interface WorkloadPanelProps {
    workload: Workload;
}

export function WorkloadPanel({ workload }: WorkloadPanelProps) {
    const levelConfig = {
        light: { color: 'text-emerald-600', bar: 'bg-gradient-to-r from-emerald-500 to-teal-500', bg: 'bg-emerald-50', label: 'Light' },
        moderate: { color: 'text-amber-600', bar: 'bg-gradient-to-r from-amber-500 to-orange-500', bg: 'bg-amber-50', label: 'Moderate' },
        heavy: { color: 'text-red-600', bar: 'bg-gradient-to-r from-red-500 to-rose-500', bg: 'bg-red-50', label: 'Heavy' },
    };

    const config = levelConfig[workload.level] || levelConfig.light;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className={cn('p-2 rounded-xl', config.bg)}>
                        <Gauge className={cn('h-4 w-4', config.color)} />
                    </div>
                    <span className={cn('text-sm font-black', config.color)}>{config.label}</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">{workload.total_items} items</span>
            </div>

            <div className="h-3 bg-slate-100/80 rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all duration-700 ease-out', config.bar)}
                    style={{ width: `${workload.percentage}%` }}
                />
            </div>

            <p className="text-xs text-slate-400 text-right font-bold">{workload.percentage}%</p>
        </div>
    );
}
