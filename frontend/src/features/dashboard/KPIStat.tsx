import React from 'react';
import { cn } from '../../utils/cn';
import { LucideIcon } from 'lucide-react';

interface KPIStatProps {
    icon: LucideIcon;
    value: string | number;
    label: string;
    subtext?: string;
    iconColor: string;
    iconBg: string;
    badge?: { text: string; variant: 'success' | 'warning' | 'danger' | 'info' };
    cardClassName?: string;
}

export function KPIStat({ icon: Icon, value, label, subtext, iconColor, iconBg, badge, cardClassName }: KPIStatProps) {
    const badgeColors = {
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-red-50 text-red-700 border-red-200',
        info: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    return (
        <div className={cn("rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-5 transition-shadow hover:shadow-md", cardClassName)}>
            <div className="flex items-center justify-between mb-3">
                <div className={cn('p-2 rounded-lg', iconBg)}>
                    <Icon className={cn('h-5 w-5', iconColor)} />
                </div>
                {badge && (
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border', badgeColors[badge.variant])}>
                        {badge.text}
                    </span>
                )}
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h3>
            <p className="text-sm font-medium text-slate-500 mt-0.5">{label}</p>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
    );
}
