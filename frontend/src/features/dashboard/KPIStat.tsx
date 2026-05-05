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
        success: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60',
        warning: 'bg-amber-50/80 text-amber-700 border-amber-200/60',
        danger: 'bg-red-50/80 text-red-700 border-red-200/60',
        info: 'bg-blue-50/80 text-blue-700 border-blue-200/60',
    };

    return (
        <div className={cn("relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50", cardClassName)}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-100/50 to-transparent rounded-full blur-xl -translate-y-1/2 translate-x-1/4" />
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <div className={cn('p-2.5 rounded-xl', iconBg)}>
                        <Icon className={cn('h-5 w-5', iconColor)} />
                    </div>
                    {badge && (
                        <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border', badgeColors[badge.variant])}>
                            {badge.text}
                        </span>
                    )}
                </div>
                <h3 className="text-3xl font-black text-slate-900">{value}</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">{label}</p>
                {subtext && <p className="text-xs text-slate-400 mt-1.5">{subtext}</p>}
            </div>
        </div>
    );
}
