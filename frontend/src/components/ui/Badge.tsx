import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    const variants = {
        default: 'bg-slate-900 text-slate-50 dark:bg-slate-200 dark:text-slate-900',
        secondary: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200',
        outline: 'text-slate-950 border border-slate-200 dark:text-slate-200 dark:border-slate-700',
        success: 'bg-green-100 text-green-700 border border-green-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
        warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
        danger: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    };

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2',
                variants[variant],
                className
            )}
            {...props}
        />
    );
}
