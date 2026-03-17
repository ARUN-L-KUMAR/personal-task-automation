import React, { useEffect, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    Bot,
    BrainCircuit,
    Calendar,
    CheckCircle2,
    Clock3,
    Database,
    FileSpreadsheet,
    Gauge,
    History,
    Mail,
    Map,
    Mic,
    RefreshCw,
    Settings,
    Sparkles,
    StickyNote,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import { cn } from '../../utils/cn';
import { usePageContextStore } from '../../store/usePageContextStore';
import { AgentStatus } from '../../services/dashboard.service';

// Sub-components
import { AgentStatusStrip } from './AgentStatusStrip';
import { KPIStat } from './KPIStat';
import { TimelineBlock } from './TimelineBlock';
import { ConflictAlert } from './ConflictAlert';
import { ChartCard } from './ChartCard';
import { TravelCard } from './TravelCard';
import { WorkloadPanel } from './WorkloadPanel';
import { InsightPanel } from './InsightPanel';
import { DashboardSkeleton } from './DashboardSkeleton';
import { ProjectOverviewCards } from './ProjectOverviewCards';
import { ProjectBarChart, PriorityPieChart } from './ProjectAnalytics';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
};

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

const statusMap: Record<string, StatusTone> = {
    success: 'success',
    warning: 'warning',
    error: 'danger',
    grey: 'neutral',
    idle: 'neutral',
    running: 'warning',
};

const statusClasses: Record<StatusTone, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    danger: 'border-red-200 bg-red-50 text-red-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
};

interface ModuleShortcut {
    id: string;
    title: string;
    subtitle: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    statusKey?: keyof AgentStatus;
}

const primaryModules: ModuleShortcut[] = [
    { id: 'planner', title: 'Plan Day', subtitle: 'Optimize your schedule', href: '/planner', icon: Zap, statusKey: 'planning' },
    { id: 'calendar', title: 'Calendar', subtitle: 'Meetings and events', href: '/calendar', icon: Calendar, statusKey: 'calendar' },
    { id: 'tasks', title: 'Tasks', subtitle: 'Due and priority items', href: '/tasks', icon: CheckCircle2, statusKey: 'tasks' },
    { id: 'email', title: 'Email', subtitle: 'Inbox and follow-ups', href: '/email', icon: Mail, statusKey: 'email' },
    { id: 'maps', title: 'Maps & Travel', subtitle: 'Routes and commute risk', href: '/maps', icon: Map, statusKey: 'travel' },
    { id: 'conflicts', title: 'Conflict Review', subtitle: 'Resolve overlaps quickly', href: '/planner', icon: AlertTriangle, statusKey: 'conflict' },
];

const secondaryModules: ModuleShortcut[] = [
    { id: 'chatbot', title: 'Chatbot', subtitle: 'Ask G-ONE', href: '/chatbot', icon: Bot },
    { id: 'voice', title: 'Voice Assistant', subtitle: 'Hands-free actions', href: '/voice-assistant', icon: Mic },
    { id: 'insights', title: 'Insights', subtitle: 'Productivity analytics', href: '/insights', icon: TrendingUp },
    { id: 'history', title: 'History', subtitle: 'Activity timeline', href: '/history', icon: History },
    { id: 'contacts', title: 'Contacts', subtitle: 'People and collaboration', href: '/contacts', icon: Users },
    { id: 'sheets', title: 'Sheets', subtitle: 'Spreadsheets sync', href: '/sheets', icon: FileSpreadsheet },
    { id: 'notes', title: 'Notes', subtitle: 'Capture and recall', href: '/notes', icon: StickyNote },
    { id: 'settings', title: 'Settings', subtitle: 'System configuration', href: '/settings', icon: Settings },
];

export function DashboardPage() {
    const { user } = useAuthStore();
    const { data, loading, error, fetchDashboard, executionStates } = useDashboardStore();
    const navigate = useNavigate();
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 17) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');

        fetchDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Register page context for voice assistant ──
    const { setPageContext, clearPageContext } = usePageContextStore();
    useEffect(() => {
        if (!data) return;
        const s = data.stats;
        const statuses = Object.entries(data.agent_status || {})
            .map(([k, v]) => `${k}:${v}`)
            .join(', ');
        const lines: string[] = [
            'Dashboard overview.',
            s ? `Meetings: ${s.meetings}, Active tasks: ${s.active_tasks}, Overdue: ${s.overdue_tasks}, Urgent: ${s.urgent_tasks}, Conflicts: ${s.conflicts}, Productivity: ${s.productivity_score}%` : '',
            statuses ? `Agent status: ${statuses}` : '',
        ];
        if (data.timeline) {
            lines.push(`Upcoming: ${data.timeline.slice(0, 6).map(e => `${e.time || 'pending'} ${e.title}`).join('; ')}`);
        }
        setPageContext({ page: '/dashboard', pageLabel: 'Dashboard', visibleContent: lines.join('\n') });
        return () => clearPageContext();
    }, [data, setPageContext, clearPageContext]);

    // --- Loading State ---
    if (loading && !data) {
        return <DashboardSkeleton />;
    }

    const stats = data?.stats;
    const dbStats = data?.db_stats;
    const userName = user?.name?.split(' ')[0] || 'User';

    const score = stats?.productivity_score ?? 0;
    const scoreLabel = score >= 85 ? 'Excellent' : score >= 65 ? 'Stable' : score >= 45 ? 'Moderate Risk' : 'At Risk';
    const scorePanelClass = score >= 85
        ? 'from-emerald-600 to-teal-600'
        : score >= 65
        ? 'from-blue-600 to-cyan-600'
        : score >= 45
        ? 'from-amber-600 to-orange-600'
        : 'from-rose-600 to-red-600';

    const timedEntries = (data?.timeline || []).filter(e => e.time);
    const pendingTasks = (data?.timeline || []).filter(e => !e.time);

    const highPriorityCount = (stats?.urgent_tasks || 0) + (stats?.overdue_tasks || 0) + (stats?.conflicts || 0);

    const statusValues = Object.values(data?.agent_status || {});
    const moduleReadiness = statusValues.length === 0
        ? 0
        : Math.round((statusValues.filter((v) => v === 'success').length / statusValues.length) * 100);

    const getModuleState = (module: ModuleShortcut): string => {
        if (!module.statusKey) return 'ready';
        const execution = executionStates[module.statusKey];
        if (execution) return execution;
        return data?.agent_status?.[module.statusKey] || 'grey';
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6 pb-12"
        >
            <motion.section variants={itemVariants}>
                <Card className="overflow-hidden border-slate-200 bg-[radial-gradient(circle_at_top_left,_#eef2ff_0%,_#e2e8f0_45%,_#f8fafc_100%)]">
                    <div className="grid grid-cols-12 gap-4 p-6 lg:p-7">
                        <div className="col-span-12 lg:col-span-8">
                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700/70">
                                Daily Command Center
                            </p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                                {greeting}, {userName}
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-600">
                                Focus on what matters now. The dashboard highlights urgent commitments, module health, and your fastest next actions.
                            </p>

                            <div className="mt-5 flex flex-wrap items-center gap-2">
                                <Button size="sm" onClick={() => navigate('/planner')} className="h-9 rounded-lg bg-slate-900 px-4 text-white hover:bg-slate-800">
                                    <Zap className="mr-2 h-4 w-4" />
                                    Open Plan Day
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => navigate('/tasks')} className="h-9 rounded-lg border-slate-300 bg-white/80 px-4">
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    View Tasks
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => navigate('/calendar')} className="h-9 rounded-lg border-slate-300 bg-white/80 px-4">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Open Calendar
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchDashboard}
                                    disabled={loading}
                                    className="h-9 rounded-lg border-slate-300 bg-white/80 px-4"
                                >
                                    <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        <div className="col-span-12 lg:col-span-4">
                            <div className={cn('rounded-2xl bg-gradient-to-br p-5 text-white shadow-md', scorePanelClass)}>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">Productivity Score</p>
                                <p className="mt-2 text-5xl font-black leading-none">{score}%</p>
                                <p className="mt-2 text-sm font-medium text-white/90">{scoreLabel}</p>
                                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                    <div className="rounded-lg bg-white/15 p-2.5">
                                        <p className="text-white/70">High Priority</p>
                                        <p className="mt-0.5 text-lg font-bold">{highPriorityCount}</p>
                                    </div>
                                    <div className="rounded-lg bg-white/15 p-2.5">
                                        <p className="text-white/70">Module Readiness</p>
                                        <p className="mt-0.5 text-lg font-bold">{moduleReadiness}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.section>

            <motion.section variants={itemVariants}>
                <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-slate-800">Core AI Modules</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {primaryModules.map((module) => {
                        const state = getModuleState(module);
                        const tone = statusMap[state] || 'neutral';
                        const Icon = module.icon;

                        return (
                            <button
                                key={module.id}
                                onClick={() => navigate(module.href)}
                                className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-slate-900 p-2.5 text-white">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{module.title}</p>
                                            <p className="text-xs text-slate-500">{module.subtitle}</p>
                                        </div>
                                    </div>
                                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', statusClasses[tone])}>
                                        {state}
                                    </span>
                                </div>
                                <div className="mt-4 flex items-center text-xs font-semibold text-slate-500 group-hover:text-slate-800">
                                    Open module
                                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </motion.section>

            <motion.section variants={itemVariants}>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-slate-600" />
                        <h2 className="text-sm font-bold text-slate-800">System & Workspace Modules</h2>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/settings')} className="h-8 rounded-lg px-2.5 text-xs">
                        Configure
                    </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {secondaryModules.map((module) => {
                        const Icon = module.icon;
                        return (
                            <button
                                key={module.id}
                                onClick={() => navigate(module.href)}
                                className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{module.title}</p>
                                        <p className="text-xs text-slate-500">{module.subtitle}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </motion.section>

            <motion.div variants={itemVariants}>
                <AgentStatusStrip status={data?.agent_status || {}} executionStates={executionStates} />
            </motion.div>

            {dbStats && (
                <motion.section variants={itemVariants}>
                    <div className="mb-3 flex items-center gap-2">
                        <Database className="h-4 w-4 text-indigo-600" />
                        <h2 className="text-sm font-bold text-slate-800">Project and Database Overview</h2>
                    </div>
                    <ProjectOverviewCards dbStats={dbStats} />
                </motion.section>
            )}

            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPIStat
                    icon={Calendar}
                    value={stats?.meetings ?? 0}
                    label="Meetings Today"
                    subtext={stats?.travel_events ? `${stats.travel_events} require travel` : undefined}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50"
                />
                <KPIStat
                    icon={CheckCircle2}
                    value={stats?.active_tasks ?? 0}
                    label="Google Tasks"
                    subtext={
                        [
                            stats?.overdue_tasks ? `${stats.overdue_tasks} overdue` : '',
                            stats?.urgent_tasks ? `${stats.urgent_tasks} urgent` : '',
                        ]
                            .filter(Boolean)
                            .join(' · ') || undefined
                    }
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-50"
                    badge={
                        stats?.overdue_tasks
                            ? { text: `${stats.overdue_tasks} overdue`, variant: 'danger' as const }
                            : undefined
                    }
                />
                <KPIStat
                    icon={AlertTriangle}
                    value={stats?.conflicts ?? 0}
                    label="Conflicts Detected"
                    iconColor="text-red-600"
                    iconBg="bg-red-50"
                    badge={
                        stats?.conflicts
                            ? { text: stats.conflict_severity, variant: stats.conflict_severity === 'high' ? 'danger' as const : 'warning' as const }
                            : { text: 'clear', variant: 'success' as const }
                    }
                />
                <KPIStat
                    icon={TrendingUp}
                    value={`${stats?.productivity_score ?? 0}%`}
                    label="Productivity Score"
                    subtext={`${scoreLabel} · Weighted: conflicts, overdue, travel, completed`}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-50"
                />
            </motion.div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <motion.div variants={itemVariants}>
                        <Card className="overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-blue-500" />
                                    Today's Optimized Schedule
                                    <span className="text-[10px] font-medium text-slate-400 ml-1">(PlanningAgent)</span>
                                </h2>
                            </div>
                            <div className="p-6">
                                <TimelineBlock entries={timedEntries} />
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <ConflictAlert
                            conflicts={data?.conflicts || []}
                            severity={stats?.conflict_severity || 'none'}
                        />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <InsightPanel insights={data?.insights || []} />
                    </motion.div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <motion.div variants={itemVariants}>
                        <Card className="overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-blue-500" />
                                    Task Load Analysis
                                    <span className="text-[10px] font-medium text-slate-400 ml-1">(TaskAgent)</span>
                                </h2>
                            </div>
                            <div className="p-5">
                                <ChartCard distribution={data?.task_distribution || { urgent: 0, today: 0, upcoming: 0 }} />
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <Card className="overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Map className="h-4 w-4 text-amber-500" />
                                    Travel Summary
                                    <span className="text-[10px] font-medium text-slate-400 ml-1">(Travel)</span>
                                </h2>
                            </div>
                            <div className="p-5">
                                <TravelCard travel={data?.travel || { total_minutes: 0, travel_event_count: 0, longest_route_minutes: 0, optimization_tip: '' }} />
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <Card className="overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Gauge className="h-4 w-4 text-purple-500" />
                                    Workload Assessment
                                </h2>
                            </div>
                            <div className="p-5">
                                <WorkloadPanel workload={data?.workload || { level: 'light', percentage: 0, total_items: 0 }} />
                            </div>
                        </Card>
                    </motion.div>

                    {pendingTasks.length > 0 && (
                        <motion.div variants={itemVariants}>
                            <Card className="overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        Pending Tasks
                                        <span className="ml-auto text-xs font-medium text-slate-400">{pendingTasks.length}</span>
                                    </h2>
                                </div>
                                <div className="p-4 space-y-2">
                                    {pendingTasks.map((task, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 p-2.5 rounded-lg border-l-[3px] border-l-emerald-500 bg-emerald-50/40 hover:shadow-sm transition-all"
                                        >
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                                {task.title}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </div>

            {dbStats && (dbStats.tasks_per_project.length > 0 || dbStats.total_tasks > 0) && (
                <motion.div variants={itemVariants}>
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="h-4 w-4 text-indigo-500" />
                        <h2 className="text-sm font-bold text-slate-800">
                            Project Analytics
                        </h2>
                    </div>
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 lg:col-span-7">
                            <Card className="overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-indigo-500" />
                                        Tasks per Project
                                    </h2>
                                </div>
                                <div className="p-5">
                                    <ProjectBarChart dbStats={dbStats} />
                                </div>
                            </Card>
                        </div>
                        <div className="col-span-12 lg:col-span-5">
                            <Card className="overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        Priority Distribution
                                    </h2>
                                </div>
                                <div className="p-5">
                                    <PriorityPieChart dbStats={dbStats} />
                                </div>
                            </Card>
                        </div>
                    </div>
                </motion.div>
            )}

            {error && (
                <Card className="border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-2 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4" />
                        <p>{error}</p>
                    </div>
                </Card>
            )}
        </motion.div>
    );
}
