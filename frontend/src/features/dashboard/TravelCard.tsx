import React from 'react';
import { cn } from '../../utils/cn';
import { Car, Route, Lightbulb } from 'lucide-react';
import { TravelSummary } from '../../services/dashboard.service';

interface TravelCardProps {
    travel: TravelSummary;
}

function formatMinutes(m: number): string {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
}

export function TravelCard({ travel }: TravelCardProps) {
    if (!travel || travel.travel_event_count === 0) {
        return (
            <div className="py-8 text-center">
                <div className="inline-flex p-3 rounded-xl bg-slate-100 mb-3">
                    <Car className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400 italic">No travel today.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-400 font-medium">Total Travel Time</p>
                    <p className="text-2xl font-black text-slate-900">{formatMinutes(travel.total_minutes)}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50">
                    <Car className="h-5 w-5 text-amber-600" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50/80 p-3">
                    <Route className="h-3.5 w-3.5 text-slate-400 mb-1" />
                    <p className="text-lg font-black text-slate-800">{formatMinutes(travel.longest_route_minutes)}</p>
                    <p className="text-[11px] text-slate-400 font-medium">Longest Route</p>
                </div>
                <div className="rounded-xl bg-slate-50/80 p-3">
                    <Car className="h-3.5 w-3.5 text-slate-400 mb-1" />
                    <p className="text-lg font-black text-slate-800">{travel.travel_event_count}</p>
                    <p className="text-[11px] text-slate-400 font-medium">Travel Events</p>
                </div>
            </div>

            {travel.optimization_tip && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-100/60">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">{travel.optimization_tip}</p>
                </div>
            )}
        </div>
    );
}
