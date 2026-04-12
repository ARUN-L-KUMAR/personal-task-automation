import React from 'react';
import { MapPin, Clock, ArrowRight, Navigation, Lightbulb } from 'lucide-react';
import { TravelPlan } from '../../types/planner.types';

interface Props {
    travel: TravelPlan;
}

export function TravelTab({ travel }: Props) {
    const hasRoutes = travel.routes && travel.routes.length > 0;
    const noData = !hasRoutes && travel.totalMinutes === 0;

    if (noData) {
        return (
            <div className="text-center py-12 text-slate-400">
                <Navigation className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No travel segments identified.</p>
                <p className="text-xs mt-1">Add locations to meetings/tasks for travel analysis.</p>
            </div>
        );
    }

    const fmt = (mins: number) =>
        mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Total Travel</p>
                    <p className="text-xl font-black text-blue-700 mt-1">{fmt(travel.totalMinutes)}</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Segments</p>
                    <p className="text-xl font-black text-amber-700 mt-1">{travel.travelEventCount}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Longest</p>
                    <p className="text-xl font-black text-slate-700 mt-1">{fmt(travel.longestRouteMinutes)}</p>
                </div>
            </div>

            {/* Optimization tip */}
            {travel.optimizationTip && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700">{travel.optimizationTip}</p>
                </div>
            )}

            {/* Route cards */}
            {hasRoutes && (
                <div className="space-y-2">
                    {travel.routes.map((r, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 p-4 bg-white hover:shadow-sm transition-all">
                            <div className="flex items-start sm:items-center gap-3 flex-wrap sm:flex-nowrap">
                                <div className="flex items-center gap-2 flex-1 min-w-[220px] flex-wrap">
                                    <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                    <span className="text-sm font-semibold text-slate-700 break-words">{r.from}</span>
                                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                    <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                    <span className="text-sm font-semibold text-slate-700 break-words">{r.to}</span>
                                </div>
                                <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full flex-shrink-0">
                                    <Clock className="h-3 w-3" /> {r.minutes}m
                                </span>
                            </div>
                            {r.departure && (
                                <p className="text-[11px] text-slate-500 mt-2">
                                    <span className="font-semibold">Depart by:</span> {r.departure}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
