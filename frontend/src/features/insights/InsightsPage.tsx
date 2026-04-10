import React, { useCallback, useEffect, useState } from 'react';
import {
    BarChart3, TrendingUp, Clock, CalendarCheck, AlertCircle,
    Loader2, RefreshCw, Activity, ArrowRight,
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
import { useNavigate } from 'react-router-dom';

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
    return (
        <Card className="group relative overflow-hidden p-5 border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/70 shadow-sm shadow-slate-200/50 dark:shadow-none transition-all hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-none">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-100/70 dark:bg-slate-800/70" />
            <div className="relative mb-3 flex items-center gap-3">
                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', color)}>
                    <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
            </div>
            <p className="relative text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
            {sub && <p className="relative mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{sub}</p>}
        </Card>
    );
}

// ── Chart wrapper ──────────────────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Card className="p-6 border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/70 shadow-sm shadow-slate-200/50 dark:shadow-none">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold tracking-wide text-slate-900 dark:text-white">{title}</h3>
                <span className="h-2 w-2 rounded-full bg-brand-500" />
            </div>
            <div className="h-64 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 p-2">{children}</div>
        </Card>
    );
}

export function InsightsPage() {
    const navigate = useNavigate();
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
        <div className="space-y-6 pb-6">
            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
            )}

            {/* KPI row stays visible even when dataset is empty */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={TrendingUp} label="Avg Score" value={avgScore} sub="out of 100" color="bg-brand-50 dark:bg-brand-900/20 text-brand-600" />
                <StatCard icon={CalendarCheck} label="Tasks Done" value={totalTasks} sub={`in ${days} days`} color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" />
                <StatCard icon={BarChart3} label="Meetings" value={totalMeetings} sub="total attended" color="bg-violet-50 dark:bg-violet-900/20 text-violet-600" />
                <StatCard icon={Clock} label="Travel" value={`${totalTravel}m`} sub="total minutes" color="bg-amber-50 dark:bg-amber-900/20 text-amber-600" />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 py-24 dark:border-slate-800 dark:bg-slate-900/60">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                </div>
            ) : metrics.length === 0 ? (
                <Card className="overflow-hidden border-slate-200/80 bg-white/95 p-6 shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
                    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-6 dark:border-violet-900/40 dark:from-violet-900/20 dark:via-slate-900 dark:to-slate-900">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700 dark:border-violet-700 dark:bg-slate-900/70 dark:text-violet-300">
                            <Activity className="h-3.5 w-3.5" /> No trend data yet
                        </div>
                        <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Insights Ready, Waiting For Data</h3>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                            No productivity records were found for the selected window. Generate a daily plan to start tracking trends here.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => navigate('/planner')} className="bg-violet-600 text-white hover:bg-violet-700">
                                Open Plan Day <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={load}>
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate('/history')}>
                                View History
                            </Button>
                        </div>
                    </div>
                </Card>
            ) : (
                <>
                    {/* Charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
