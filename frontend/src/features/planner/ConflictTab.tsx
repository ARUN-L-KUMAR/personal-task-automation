import React from 'react';
import { AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ConflictItem } from '../../types/planner.types';

interface Props {
    conflicts: ConflictItem[];
}

const severityConfig: Record<string, { bg: string; text: string; badge: string }> = {
    low:    { bg: 'bg-slate-50',  text: 'text-slate-600', badge: 'bg-slate-200 text-slate-700' },
    medium: { bg: 'bg-amber-50',  text: 'text-amber-800', badge: 'bg-amber-200 text-amber-800' },
    high:   { bg: 'bg-red-50',    text: 'text-red-800',   badge: 'bg-red-200 text-red-800' },
};

export function ConflictTab({ conflicts }: Props) {
    if (!conflicts.length) {
        return (
            <div className="text-center py-12 text-emerald-600">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-semibold">No conflicts detected!</p>
                <p className="text-xs text-slate-400 mt-1">Your schedule is clear.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs min-w-[680px]">
                    <thead>
                        <tr className="bg-slate-50 text-left">
                            <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Type</th>
                            <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Severity</th>
                            <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Items</th>
                            <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Suggestion</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {conflicts.map((c, i) => {
                            const cfg = severityConfig[c.severity] || severityConfig.medium;
                            return (
                                <tr key={i} className={cn('transition-colors hover:bg-slate-50', cfg.bg)}>
                                    <td className="px-4 py-3 font-medium text-slate-700 capitalize">{c.type}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', cfg.badge)}>
                                            {c.severity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 align-top whitespace-normal break-words">
                                        <span className="font-medium">{c.eventA}</span>
                                        {c.eventB !== '-' && <> × <span className="font-medium">{c.eventB}</span></>}
                                        {c.overlapMinutes > 0 && <span className="text-red-500 ml-1">({c.overlapMinutes}m overlap)</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-start gap-1.5">
                                            <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-slate-600 whitespace-normal break-words">{c.suggestion}</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
