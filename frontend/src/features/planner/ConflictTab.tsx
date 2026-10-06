import React from 'react';
import { AlertTriangle, Lightbulb, CheckCircle2, ArrowRight, Trash2, Clock, Users } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ConflictItem, ResolutionPlan } from '../../types/planner.types';

interface Props {
    conflicts: ConflictItem[];
    resolutionPlan?: ResolutionPlan;
}

const severityConfig: Record<string, { bg: string; text: string; badge: string }> = {
    low:    { bg: 'bg-slate-50',  text: 'text-slate-600', badge: 'bg-slate-200 text-slate-700' },
    medium: { bg: 'bg-amber-50',  text: 'text-amber-800', badge: 'bg-amber-200 text-amber-800' },
    high:   { bg: 'bg-red-50',    text: 'text-red-800',   badge: 'bg-red-200 text-red-800' },
};

const actionConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    reschedule: { icon: <Clock className="h-3.5 w-3.5" />,     color: 'text-blue-600 bg-blue-50 border-blue-200',   label: 'Reschedule' },
    delegate:   { icon: <Users className="h-3.5 w-3.5" />,     color: 'text-purple-600 bg-purple-50 border-purple-200', label: 'Delegate' },
    drop:       { icon: <Trash2 className="h-3.5 w-3.5" />,    color: 'text-red-600 bg-red-50 border-red-200',      label: 'Drop' },
    compress:   { icon: <ArrowRight className="h-3.5 w-3.5" />,color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Compress' },
    shift:      { icon: <Clock className="h-3.5 w-3.5" />,     color: 'text-teal-600 bg-teal-50 border-teal-200',   label: 'Shift' },
};

export function ConflictTab({ conflicts, resolutionPlan }: Props) {
    const hasResolutions = resolutionPlan && resolutionPlan.resolutions.length > 0;

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
        <div className="space-y-4">
            {/* Conflict Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs min-w-[680px]">
                    <thead>
                        <tr className="bg-slate-50 text-left">
                            <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Type</th>
                            <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Severity</th>
                            <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Items</th>
                            <th className="px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Description</th>
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

            {/* Resolution Plan — shown only when ConflictResolutionAgent was triggered */}
            {hasResolutions && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-100/70 border-b border-blue-200">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                            AI Resolution Plan
                        </span>
                        <span className="ml-auto text-[10px] text-blue-500 font-mono">
                            {resolutionPlan!.resolutions.length} action{resolutionPlan!.resolutions.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Summary */}
                    {resolutionPlan!.summary && (
                        <p className="px-4 py-2 text-xs text-blue-700 border-b border-blue-100">
                            {resolutionPlan!.summary}
                        </p>
                    )}

                    {/* Per-conflict resolutions */}
                    <div className="divide-y divide-blue-100">
                        {resolutionPlan!.resolutions.map((r, i) => {
                            const action = actionConfig[r.action] || actionConfig.reschedule;
                            return (
                                <div key={i} className="px-4 py-3 flex items-start gap-3">
                                    {/* Action badge */}
                                    <span className={cn(
                                        'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap mt-0.5 flex-shrink-0',
                                        action.color
                                    )}>
                                        {action.icon}
                                        {action.label}
                                    </span>
                                    {/* Instruction */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                                            {r.instruction}
                                        </p>
                                        {r.affected_item && (
                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                Affects: <span className="font-medium text-slate-600">{r.affected_item}</span>
                                                {r.new_time && <> → <span className="font-medium text-blue-600">{r.new_time}</span></>}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Dropped items summary */}
                    {resolutionPlan!.dropped.length > 0 && (
                        <div className="px-4 py-2 bg-red-50/70 border-t border-blue-100 flex items-center gap-2">
                            <Trash2 className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                            <span className="text-[10px] text-red-600">
                                Suggested to drop: <span className="font-semibold">{resolutionPlan!.dropped.join(', ')}</span>
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
