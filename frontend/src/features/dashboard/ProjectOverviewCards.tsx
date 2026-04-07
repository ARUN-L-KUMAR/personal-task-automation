import React from 'react';
import { cn } from '../../utils/cn';
import { FolderKanban, ListChecks, CheckCheck, AlertCircle } from 'lucide-react';
import { DbStats } from '../../services/dashboard.service';

interface ProjectOverviewProps {
    dbStats: DbStats;
}

const cards = [
    {
        key: 'active_projects' as const,
        label: 'Active Projects',
        icon: FolderKanban,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        gradient: 'from-violet-500/10',
        getValue: (s: DbStats) => s.active_projects,
        getSub: (s: DbStats) => `${s.total_projects} total`,
    },
    {
        key: 'total_tasks' as const,
        label: 'Total Tasks',
        icon: ListChecks,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        gradient: 'from-blue-500/10',
        getValue: (s: DbStats) => s.total_tasks,
        getSub: (s: DbStats) => `${s.in_progress_tasks} in progress`,
    },
    {
        key: 'completed_this_week' as const,
        label: 'Completed This Week',
        icon: CheckCheck,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        gradient: 'from-emerald-500/10',
        getValue: (s: DbStats) => s.completed_this_week,
        getSub: (s: DbStats) => `${s.completion_rate}% overall rate`,
    },
    {
        key: 'overdue_db_tasks' as const,
        label: 'Overdue Tasks',
        icon: AlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        gradient: 'from-red-500/10',
        getValue: (s: DbStats) => s.overdue_db_tasks,
        getSub: () => 'Requires attention',
    },
];

export function ProjectOverviewCards({ dbStats }: ProjectOverviewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => {
                const Icon = card.icon;
                const value = card.getValue(dbStats);
                const sub = card.getSub(dbStats);
                const isOverdue = card.key === 'overdue_db_tasks' && value > 0;

                return (
                    <div
                        key={card.key}
                        className={cn(
                            'relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-md border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50',
                            isOverdue ? 'border-red-200/60 bg-red-50/30' : 'border-white/40'
                        )}
                    >
                        <div className={cn('absolute inset-0 bg-gradient-to-br', card.gradient)} />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className={cn('p-2.5 rounded-xl', card.bg)}>
                                    <Icon className={cn('h-5 w-5', card.color)} />
                                </div>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">DB</span>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900">{value}</h3>
                            <p className="text-sm font-semibold text-slate-500 mt-1">{card.label}</p>
                            <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
