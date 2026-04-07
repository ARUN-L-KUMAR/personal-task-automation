import React from 'react';
import { cn } from '../../utils/cn';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
    return (
        <div className="w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
        </div>
    );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <thead className={cn('[&_tr]:border-b [&_tr]:border-slate-200 dark:[&_tr]:border-slate-800 bg-slate-50 dark:bg-slate-900/60', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <tfoot className={cn('bg-slate-900 dark:bg-slate-800 font-medium text-slate-50 dark:text-slate-200', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr
            className={cn(
                'border-b border-slate-200 dark:border-slate-800 transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/50 data-[state=selected]:bg-slate-100 dark:data-[state=selected]:bg-slate-800/60',
                className
            )}
            {...props}
        />
    );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
    return (
        <th
            className={cn(
                'h-12 px-4 text-left align-middle font-semibold text-slate-700 dark:text-slate-300 [&:has([role=checkbox])]:pr-0',
                className
            )}
            {...props}
        />
    );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return (
        <td
            className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0 text-slate-600 dark:text-slate-300', className)}
            {...props}
        />
    );
}
