import React, { useCallback, useEffect, useState } from 'react';
import {
    BarChart3, TrendingUp, Clock, CalendarCheck, AlertCircle,
    Loader2, RefreshCw, Activity,
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { insightsService, Metric } from './insights.service';
import { usePageContextStore } from '../../store/usePageContextStore';

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
    return (
        <Card className="p-5 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', color)}>
                    <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
            {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
        </Card>
    );
}

// ── Chart wrapper ──────────────────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Card className="p-6 border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{title}</h3>
            <div className="h-64">{children}</div>
        </Card>
    );
}

export function InsightsPage() {
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState(30);
    const { setHeaderContext, clearHeaderContext } = usePageContextStore();

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await insightsService.list(days);
            setMetrics(data);
        } catch (e: any) {
            setError(e.message || 'Failed to load metrics');
        } finally {
            setIsLoading(false);
        }
    }, [days]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        setHeaderContext({
            hideSearch: true,
            summary: (
                <>
                    Trends from the last <span className="font-medium">{days} days</span>.
                </>
            ),
            actions: (
                <>
                    <select
                        value={days}
                        onChange={e => setDays(Number(e.target.value))}
                        className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={90}>90 days</option>
                    </select>
                    <Button variant="outline" onClick={load} disabled={isLoading}>
                        <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} /> Refresh
                    </Button>
                </>
            ),
        });
        return () => clearHeaderContext();
    }, [clearHeaderContext, days, isLoading, load, setHeaderContext]);

    // ── Derived stats ──
    const totalTasks = metrics.reduce((s, m) => s + (m.tasks_completed || 0), 0);
    const totalMeetings = metrics.reduce((s, m) => s + (m.meetings_count || 0), 0);
    const totalTravel = metrics.reduce((s, m) => s + (m.travel_minutes || 0), 0);
    const avgScore = metrics.length
        ? Math.round(metrics.filter(m => m.productivity_score != null).reduce((s, m) => s + (m.productivity_score ?? 0), 0) / (metrics.filter(m => m.productivity_score != null).length || 1))
        : 0;

    // Format chart data (short month-day labels)
    const chartData = metrics.map(m => ({
        ...m,
        label: new Date(m.date + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }));

    return (
        <div className="space-y-4 pb-4">
            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                </div>
            ) : metrics.length === 0 ? (
                <Card className="py-20 text-center">
                    <Activity className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        No productivity data recorded yet. Use the Planner to generate daily metrics.
                    </p>
                </Card>
            ) : (
                <>
                    {/* KPI row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={TrendingUp} label="Avg Score" value={avgScore} sub="out of 100" color="bg-brand-50 dark:bg-brand-900/20 text-brand-600" />
                        <StatCard icon={CalendarCheck} label="Tasks Done" value={totalTasks} sub={`in ${days} days`} color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" />
                        <StatCard icon={BarChart3} label="Meetings" value={totalMeetings} sub="total attended" color="bg-violet-50 dark:bg-violet-900/20 text-violet-600" />
                        <StatCard icon={Clock} label="Travel" value={`${totalTravel}m`} sub="total minutes" color="bg-amber-50 dark:bg-amber-900/20 text-amber-600" />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Productivity Score Over Time">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="productivity_score" name="Score" stroke="#6366f1" fill="url(#scoreGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Tasks Completed">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="tasks_completed" name="Tasks" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Meetings Count">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="meetings_count" name="Meetings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Travel Minutes">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="travelGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="travel_minutes" name="Travel (min)" stroke="#f59e0b" fill="url(#travelGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                </>
            )}
        </div>
    );
}
