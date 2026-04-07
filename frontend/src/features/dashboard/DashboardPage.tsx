import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Bot,
    BrainCircuit,
    Calendar,
    CheckCheck,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Mail,
    MapPinned,
    TimerReset,
    Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useDashboardStore } from '../../store/useDashboardStore';
import { usePageContextStore } from '../../store/usePageContextStore';
import {
    AgentStatus,
    DashboardBoardItem,
    TimelineEntry,
} from '../../services/dashboard.service';
import { AgentStatusStrip } from './AgentStatusStrip';
import { DashboardSkeleton } from './DashboardSkeleton';

/* ── animation variants ── */
const containerVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, staggerChildren: 0.06 },
    },
};
const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

/* ── types ── */
type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

interface BoardCardItem {
    id: string;
    title: string;
    time?: string;
    duration?: string;
    badge?: string;
    badgeTone?: Tone;
    secondaryBadge?: string;
    secondaryBadgeTone?: Tone;
    note?: string;
}

interface AgentModule {
    id: string;
    title: string;
    subtitle: string;
    href: string;
    statusKey: keyof AgentStatus;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
}

interface KPIItem {
    id: string;
    label: string;
    value: string | number;
    badge?: string;
    badgeTone?: Tone;
    icon: React.ComponentType<{ className?: string }>;
    iconWrap: string;
    iconColor: string;
}

const agentModules: AgentModule[] = [
    { id: 'planning', title: 'Planning Agent', subtitle: 'Builds your day plan', href: '/planner', statusKey: 'planning', icon: Zap, accent: 'from-violet-500 to-fuchsia-500' },
    { id: 'calendar', title: 'Calendar Agent', subtitle: 'Tracks meetings and blocks', href: '/calendar', statusKey: 'calendar', icon: Calendar, accent: 'from-blue-500 to-cyan-500' },
    { id: 'tasks', title: 'Task Agent', subtitle: 'Keeps action items moving', href: '/tasks', statusKey: 'tasks', icon: CheckCircle2, accent: 'from-emerald-500 to-teal-500' },
    { id: 'email', title: 'Email Agent', subtitle: 'Surfaces inbox follow-ups', href: '/email', statusKey: 'email', icon: Mail, accent: 'from-amber-500 to-orange-500' },
    { id: 'conflict', title: 'Conflict Agent', subtitle: 'Flags schedule overlaps', href: '/planner', statusKey: 'conflict', icon: AlertTriangle, accent: 'from-rose-500 to-red-500' },
    { id: 'travel', title: 'Travel Agent', subtitle: 'Prepares commute buffers', href: '/maps', statusKey: 'travel', icon: MapPinned, accent: 'from-sky-500 to-indigo-500' },
];

const toneClasses: Record<Tone, string> = {
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const statusClasses: Record<string, string> = {
    idle: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    grey: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    running: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    error: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

/* ── helpers ── */
function formatDateChip(date: Date): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}
function formatTimeLabel(value?: string): string {
    if (!value) return 'Anytime';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(parsed);
    }
    if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
    return value;
}
function formatCompletionTime(value?: string): string {
    if (!value) return 'Completed today';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Completed today';
    return `Done ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(parsed)}`;
}
function formatDuration(minutes?: number, start?: string, end?: string): string | undefined {
    if (minutes && minutes > 0) {
        if (minutes >= 60) { const h = Math.floor(minutes / 60), m = minutes % 60; return m ? `${h}h ${m}m` : `${h}h`; }
        return `${minutes} min`;
    }
    if (!start || !end) return undefined;
    const s = new Date(start), e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return undefined;
    const diff = Math.round((e.getTime() - s.getTime()) / 60000);
    return diff > 0 ? formatDuration(diff) : undefined;
}
function getScoreLabel(score: number): { label: string; tone: Tone } {
    if (score >= 85) return { label: 'Excellent', tone: 'success' };
    if (score >= 65) return { label: 'Stable', tone: 'info' };
    if (score >= 45) return { label: 'Watchlist', tone: 'warning' };
    return { label: 'At risk', tone: 'danger' };
}
function mapTaskTone(task: any): Tone {
    const isUrgent = `${task?.title || ''} ${task?.notes || ''}`.toLowerCase().includes('urgent');
    if (isUrgent) return 'danger';
    if (!task?.due) return 'neutral';
    const dueDate = new Date(task.due);
    if (Number.isNaN(dueDate.getTime())) return 'neutral';
    return dueDate.getTime() < Date.now() ? 'danger' : 'warning';
}
function mapPendingTaskCards(tasks: any[], fallbackTimeline: TimelineEntry[]): BoardCardItem[] {
    if (tasks.length > 0) {
        return tasks.map((task, i) => {
            const tone = mapTaskTone(task);
            const hasDue = Boolean(task?.due);
            return {
                id: String(task?.id || `${task?.title || 'task'}-${i}`),
                title: task?.title || 'Untitled task',
                badge: hasDue ? (tone === 'danger' ? 'Overdue' : 'Due soon') : 'Pending',
                badgeTone: hasDue ? tone : 'neutral',
                secondaryBadge: 'Task',
                secondaryBadgeTone: 'info',
                note: task?.due ? `Due ${formatTimeLabel(task.due)}` : task?.notes || 'Add this to a focused work block.',
            };
        });
    }
    return fallbackTimeline.map((entry, i) => ({
        id: `timeline-task-${i}`,
        title: entry.title,
        badge: 'Pending',
        badgeTone: 'neutral' as Tone,
        secondaryBadge: 'Task',
        secondaryBadgeTone: 'info' as Tone,
        note: 'Unscheduled work item from your day plan.',
    }));
}
function mapScheduledCards(entries: TimelineEntry[]): BoardCardItem[] {
    return entries.map((entry, i) => {
        const isConflict = entry.type === 'conflict';
        const isTravel = entry.type === 'travel';
        return {
            id: `${entry.title}-${entry.time || i}`,
            title: entry.title,
            time: formatTimeLabel(entry.time),
            duration: formatDuration(undefined, entry.time, entry.end_time),
            badge: isConflict ? 'Conflict' : isTravel ? 'Travel' : 'Scheduled',
            badgeTone: isConflict ? 'danger' : isTravel ? 'warning' : 'info',
            secondaryBadge: entry.location || undefined,
            secondaryBadgeTone: 'neutral' as Tone,
            note: entry.end_time ? `Ends ${formatTimeLabel(entry.end_time)}` : 'Scheduled block',
        };
    });
}
function mapDoneCards(items: DashboardBoardItem[]): BoardCardItem[] {
    return items.map((item, i) => ({
        id: item.id || `done-${i}`,
        title: item.title,
        time: formatCompletionTime(item.time),
        duration: formatDuration(item.duration_minutes),
        badge: item.badge || 'Completed',
        badgeTone: item.badge_tone || 'success',
        secondaryBadge: item.secondary_badge,
        secondaryBadgeTone: item.secondary_badge_tone || 'neutral',
        note: item.time ? 'Finished and captured from your workspace data.' : 'Completed today.',
    }));
}

/* ── small reusable UI pieces ── */
function renderBadge(label?: string, tone: Tone = 'neutral') {
    if (!label) return null;
    return (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', toneClasses[tone])}>
            {label}
        </span>
    );
}

function BoardColumn({ title, count, dotClassName, items, emptyMessage, emptyHint }: {
    title: string; count: number; dotClassName: string; items: BoardCardItem[]; emptyMessage: string; emptyHint: string;
}) {
    return (
        <div className="min-w-0">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <span className={cn('h-2.5 w-2.5 rounded-full', dotClassName)} />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                </div>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-500 dark:text-slate-300">{count}</span>
            </div>
            {items.length > 0 ? (
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-shadow hover:shadow-md dark:hover:shadow-none">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-base font-semibold text-slate-900 dark:text-white">{item.title}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        {renderBadge(item.badge, item.badgeTone)}
                                        {renderBadge(item.secondaryBadge, item.secondaryBadgeTone)}
                                        {item.time && <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{item.time}</span>}
                                    </div>
                                    {item.note && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{item.note}</p>}
                                </div>
                                {item.duration && <span className="shrink-0 text-sm font-semibold text-slate-400 dark:text-slate-500">{item.duration}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-6 text-center">
                    <div>
                        <p className="text-base font-semibold text-slate-500 dark:text-slate-300">{emptyMessage}</p>
                        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">{emptyHint}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── main component ── */
export function DashboardPage() {
    const navigate = useNavigate();
    const { data, loading, error, fetchDashboard, executionStates } = useDashboardStore();
    const { setPageContext, clearPageContext } = usePageContextStore();
    const [dateChip, setDateChip] = useState('');

    useEffect(() => {
        const now = new Date();
        setDateChip(formatDateChip(now));
        fetchDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stats = data?.stats;
    const dbStats = data?.db_stats;
    const score = stats?.productivity_score ?? 0;
    const scoreMeta = getScoreLabel(score);

    const scheduledEntries = useMemo(() => (data?.timeline || []).filter((e) => Boolean(e.time)), [data?.timeline]);
    const unscheduledEntries = useMemo(() => (data?.timeline || []).filter((e) => !e.time), [data?.timeline]);
    const todoCards = useMemo(() => mapPendingTaskCards(data?.tasks || [], unscheduledEntries), [data?.tasks, unscheduledEntries]);
    const scheduledCards = useMemo(() => mapScheduledCards(scheduledEntries), [scheduledEntries]);
    const doneCards = useMemo(() => mapDoneCards(data?.done_today || []), [data?.done_today]);

    const kpis: KPIItem[] = [
        { id: 'productivity', label: 'Productivity score', value: `${score}%`, badge: scoreMeta.label, badgeTone: scoreMeta.tone, icon: BrainCircuit, iconWrap: 'bg-violet-100', iconColor: 'text-violet-700' },
        { id: 'pending', label: 'Pending tasks', value: stats?.active_tasks ?? todoCards.length, badge: stats?.overdue_tasks ? `${stats.overdue_tasks} overdue` : 'In queue', badgeTone: stats?.overdue_tasks ? 'danger' : 'warning', icon: TimerReset, iconWrap: 'bg-amber-100', iconColor: 'text-amber-700' },
        { id: 'conflicts', label: 'Conflicts detected', value: stats?.conflicts ?? 0, badge: stats?.conflicts ? stats?.conflict_severity : 'All clear', badgeTone: stats?.conflicts ? 'danger' : 'success', icon: AlertTriangle, iconWrap: 'bg-rose-100', iconColor: 'text-rose-700' },
        { id: 'meetings', label: 'Meetings today', value: stats?.meetings ?? 0, badge: stats?.travel_events ? `${stats.travel_events} with travel` : 'Calendar synced', badgeTone: stats?.travel_events ? 'info' : 'neutral', icon: Clock3, iconWrap: 'bg-blue-100', iconColor: 'text-blue-700' },
    ];

    useEffect(() => {
        if (!data) return;
        const statusSummary = (['calendar', 'tasks', 'email', 'conflict', 'travel', 'planning'] as (keyof AgentStatus)[])
            .map((key) => `${key}:${data.agent_status[key]}`).join(', ');
        const lines = [
            'Sections — board, timeline, insights, and agents are visible.',
            `KPIs — Productivity ${score}%, pending ${stats?.active_tasks ?? 0}, conflicts ${stats?.conflicts ?? 0}, meetings ${stats?.meetings ?? 0}.`,
            `Board — To do ${todoCards.length}, scheduled ${scheduledCards.length}, done ${doneCards.length}.`,
            statusSummary ? `Agent status: ${statusSummary}` : '',
        ].filter(Boolean);
        setPageContext({ page: '/dashboard', pageLabel: 'Dashboard', visibleContent: lines.join('\n') });
        return () => clearPageContext();
    }, [clearPageContext, data, doneCards.length, score, scheduledCards.length, setPageContext, stats?.active_tasks, stats?.conflicts, stats?.meetings, todoCards.length]);

    if (loading && !data) return <DashboardSkeleton />;

    const currentStatuses = agentModules.map((m) => {
        const displayState = executionStates[m.statusKey] || data?.agent_status?.[m.statusKey] || 'grey';
        return { ...m, displayState };
    });
    const activeAgentCount = currentStatuses.filter((a) => a.displayState !== 'idle' && a.displayState !== 'grey').length;

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="px-4 py-4 pb-10 md:px-6 lg:px-8">
            <div className="space-y-4">
                <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-end gap-2">
                    <button
                        onClick={() => navigate('/calendar')}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:text-slate-900 dark:hover:text-white"
                    >
                        Calendar
                    </button>
                    <button
                        onClick={() => navigate('/tasks')}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:text-slate-900 dark:hover:text-white"
                    >
                        Tasks
                    </button>
                    <button
                        onClick={() => navigate('/insights')}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:text-slate-900 dark:hover:text-white"
                    >
                        Insights
                    </button>
                    <span className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{dateChip}</span>
                    <button onClick={() => navigate('/planner')} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800">
                        <Zap className="h-4 w-4" /> Plan day
                    </button>
                </motion.div>

                {/* ─── Content Area ─── */}
                <div className="space-y-4">

                    {/* Auth banner */}
                    {!data?.authenticated && (
                        <motion.div variants={itemVariants} className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-lg font-bold text-amber-900">Connect Google to unlock live tasks and meetings</p>
                                    <p className="mt-1 text-sm text-amber-800">Your board is ready, but timeline and task automation will stay empty until your Google services are connected.</p>
                                </div>
                                <button onClick={() => navigate('/google-connect')} className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white">
                                    Connect now <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Error */}
                    {error && (
                        <motion.div variants={itemVariants} className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                            <p className="text-sm font-semibold text-rose-800">{error}</p>
                        </motion.div>
                    )}

                    {/* KPI Row */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {kpis.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.id} className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-4 transition-shadow hover:shadow-sm dark:hover:shadow-none">
                                    <div className="mb-5 flex items-center justify-between gap-3">
                                        <div className={cn('rounded-xl p-2.5', item.iconWrap)}>
                                            <Icon className={cn('h-5 w-5', item.iconColor)} />
                                        </div>
                                        {renderBadge(item.badge, item.badgeTone)}
                                    </div>
                                    <p className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{item.value}</p>
                                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                                </div>
                            );
                        })}
                    </motion.div>

                    <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total projects</p>
                            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{dbStats?.total_projects ?? 0}</p>
                            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{dbStats?.active_projects ?? 0} active right now</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Database tasks</p>
                            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{dbStats?.total_tasks ?? 0}</p>
                            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{dbStats?.in_progress_tasks ?? 0} in progress</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Completed this week</p>
                            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{dbStats?.completed_this_week ?? 0}</p>
                            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{dbStats?.completion_rate ?? 0}% completion rate</p>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Daily board</h2>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{todoCards.length + scheduledCards.length + doneCards.length} items tracked</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                            <BoardColumn title="To Do" count={todoCards.length} dotClassName="bg-amber-400" items={todoCards} emptyMessage="Nothing waiting in your queue" emptyHint="Add a task or sync Google Tasks to start filling this column." />
                            <BoardColumn title="Scheduled" count={scheduledCards.length} dotClassName="bg-blue-500" items={scheduledCards} emptyMessage="Your schedule is open" emptyHint="Meetings and planned work blocks will land here." />
                            <BoardColumn title="Done" count={doneCards.length} dotClassName="bg-emerald-500" items={doneCards} emptyMessage="Nothing completed yet" emptyHint="Finished DB tasks updated today will appear here automatically." />
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Timeline and insights</h2>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Meetings, conflicts, travel, and workload in one view</p>
                        </div>
                            {/* Schedule + Conflicts side-by-side */}
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                {/* Today's schedule */}
                                <div>
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><Calendar className="h-5 w-5" /></div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Today's schedule</h3>
                                        </div>
                                        <button onClick={() => navigate('/calendar')} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
                                            Open calendar <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {scheduledCards.length > 0 ? (
                                        <div className="space-y-3">
                                            {scheduledCards.map((item) => (
                                                <div key={item.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-4 transition-shadow hover:shadow-sm dark:hover:shadow-none">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div>
                                                            <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.note}</p>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {renderBadge(item.badge, item.badgeTone)}
                                                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{item.time}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center px-6">
                                            <div>
                                                <Calendar className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
                                                <p className="font-semibold text-slate-500 dark:text-slate-300">No events scheduled today</p>
                                                <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Connect Google Calendar or create events to see your schedule here.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Conflict watch */}
                                <div>
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700"><AlertTriangle className="h-5 w-5" /></div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Conflict watch</h3>
                                    </div>
                                    {data?.conflicts?.length ? (
                                        <div className="space-y-3">
                                            {data.conflicts.map((conflict, i) => (
                                                <div key={`${conflict.event_a}-${i}`} className="rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-900/20 p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div>
                                                            <p className="font-semibold text-slate-900 dark:text-white">{conflict.event_a}</p>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">Overlaps with {conflict.event_b}</p>
                                                        </div>
                                                        {renderBadge(`${conflict.overlap_minutes} min`, 'danger')}
                                                    </div>
                                                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{conflict.suggestion}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/20 text-center px-6">
                                            <div>
                                                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-3" />
                                                <p className="font-semibold text-emerald-700 dark:text-emerald-300">No schedule conflicts</p>
                                                <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">Your calendar is looking clean today.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Travel + Workload row */}
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                {/* Travel */}
                                <div>
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><MapPinned className="h-5 w-5" /></div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Travel summary</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Travel minutes', value: data?.travel?.total_minutes ?? 0 },
                                            { label: 'Travel events', value: data?.travel?.travel_event_count ?? 0 },
                                            { label: 'Longest route', value: `${data?.travel?.longest_route_minutes ?? 0}m` },
                                        ].map((s) => (
                                            <div key={s.label} className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-4">
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                                                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{data?.travel?.optimization_tip || 'No travel optimization needed today.'}</p>
                                </div>

                                {/* Workload */}
                                <div>
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700"><BrainCircuit className="h-5 w-5" /></div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Operational insight</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-4">
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Workload</p>
                                            <p className="mt-2 text-2xl font-black capitalize text-slate-900 dark:text-white">{data?.workload?.level || 'light'}</p>
                                            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{data?.workload?.percentage ?? 0}% load score</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-4">
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Open items</p>
                                            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{data?.workload?.total_items ?? 0}</p>
                                            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Meetings + pending tasks</p>
                                        </div>
                                    </div>
                                    {data?.insights?.length ? (
                                        <div className="mt-3 space-y-2">
                                            {data.insights.map((insight, i) => (
                                                <div key={`${insight.label}-${i}`} className="flex items-center justify-between rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 px-4 py-3">
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{insight.label}</p>
                                                    {renderBadge(insight.value, insight.tone)}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Agent network</h2>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{activeAgentCount} active right now</p>
                        </div>
                            {/* Agent grid */}
                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-slate-900 p-2.5 text-white"><Bot className="h-5 w-5" /></div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Open an agent module</h3>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{currentStatuses.length} available</span>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {currentStatuses.map((module) => {
                                        const Icon = module.icon;
                                        return (
                                            <button
                                                key={module.id}
                                                onClick={() => navigate(module.href)}
                                                className="group rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-none hover:bg-white dark:hover:bg-slate-900"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className={cn('rounded-xl bg-gradient-to-br p-3 text-white shadow-md', module.accent)}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize', statusClasses[module.displayState] || statusClasses.grey)}>
                                                        {module.displayState}
                                                    </span>
                                                </div>
                                                <p className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{module.title}</p>
                                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{module.subtitle}</p>
                                                <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors group-hover:text-violet-700 dark:group-hover:text-violet-300">
                                                    Open module <ChevronRight className="h-4 w-4" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Status + Coverage + Action row */}
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                {/* Execution state */}
                                <div>
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><Zap className="h-5 w-5" /></div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Execution state</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {currentStatuses.map((m) => (
                                            <div key={m.id} className="flex items-center justify-between rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 px-4 py-3">
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{m.title}</p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500">{m.subtitle}</p>
                                                </div>
                                                <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize', statusClasses[m.displayState] || statusClasses.grey)}>
                                                    {m.displayState}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Coverage */}
                                <div>
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><CheckCheck className="h-5 w-5" /></div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Coverage</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-4">
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Available agents</p>
                                            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{currentStatuses.length}</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-4">
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Healthy agents</p>
                                            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                                                {currentStatuses.filter((m) => m.displayState === 'success').length}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Next action */}
                                <div>
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700"><ArrowRight className="h-5 w-5" /></div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Next action</h3>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-5">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Recommended focus</p>
                                        <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                                            {stats?.conflicts ? 'Resolve conflicts before planning' : todoCards.length ? 'Schedule your next pending task' : 'Review your planner for new work'}
                                        </p>
                                        <button
                                            onClick={() => navigate(stats?.conflicts ? '/planner' : '/tasks')}
                                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                                        >
                                            Open workflow
                                        </button>
                                    </div>
                                </div>
                            </div>
                    </motion.div>
                </div>

                {/* ─── Agent Status Footer ─── */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 px-4 py-4 md:px-6">
                    <AgentStatusStrip status={data?.agent_status || {} as AgentStatus} executionStates={executionStates} />
                </div>
            </div>
        </motion.div>
    );
}