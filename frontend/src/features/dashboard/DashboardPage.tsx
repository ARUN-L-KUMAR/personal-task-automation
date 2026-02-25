import React, { useEffect, useState } from 'react';
import {
    Calendar, CheckCircle2, Mail, Sparkles,
    RefreshCw, AlertTriangle, TrendingUp,
    Zap, BrainCircuit, Settings, Car, BarChart3, Gauge, ListTodo,
    FolderKanban, Database, Wifi, LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import { cn } from '../../utils/cn';

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

    // --- Loading State ---
    if (loading && !data) {
        return <DashboardSkeleton />;
    }

    const stats = data?.stats;
    const dbStats = data?.db_stats;
    const userName = user?.name?.split(' ')[0] || 'User';

    // --- Computed intelligence ---
    const conflictCardClass = stats?.conflict_severity === 'high'
        ? 'bg-red-50/30 border-red-300'
        : stats?.conflict_severity === 'medium'
        ? 'border-amber-300 bg-amber-50/20'
        : undefined;

    const score = stats?.productivity_score ?? 0;
    const scoreLabel = score >= 85 ? 'Excellent' : score >= 65 ? 'Stable' : score >= 45 ? 'Moderate Risk' : 'At Risk';

    const timedEntries = (data?.timeline || []).filter(e => e.time);
    const pendingTasks = (data?.timeline || []).filter(e => !e.time);

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6 pb-12"
        >
            {/* ═══════════════════════════════════════════════════
                Section 1 — User Header
            ═══════════════════════════════════════════════════ */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {greeting}, <span className="text-blue-600">{userName}</span>
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Here's your productivity overview.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchDashboard}
                        disabled={loading}
                        className="h-9 px-3"
                    >
                        <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </motion.div>

            {/* ═══════════════════════════════════════════════════
                Section 2 — Project & Task Overview (Database Layer)
            ═══════════════════════════════════════════════════ */}
            {dbStats && (
                <>
                    <motion.div variants={itemVariants}>
                        <div className="flex items-center gap-2 mb-3">
                            <Database className="h-3.5 w-3.5 text-violet-500" />
                            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                Persistent Layer — Database
                            </h2>
                        </div>
                        <ProjectOverviewCards dbStats={dbStats} />
                    </motion.div>
                </>
            )}

            {/* ─── AI Agent Status Strip ─── */}
            <motion.div variants={itemVariants}>
                <AgentStatusStrip status={data?.agent_status || {}} executionStates={executionStates} />
            </motion.div>

            {/* ═══════════════════════════════════════════════════
                Section 3 — Live Intelligence Panel (Google Layer)
            ═══════════════════════════════════════════════════ */}
            <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 mb-3">
                    <Wifi className="h-3.5 w-3.5 text-blue-500" />
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Live Intelligence — Google Services
                    </h2>
                </div>
            </motion.div>

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
                    cardClassName={conflictCardClass}
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

            {/* ─── Main Intelligence Grid ─── */}
            <div className="grid grid-cols-12 gap-6">
                {/* LEFT COLUMN — Operational Intelligence (8 cols) */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    {/* A) Optimized Day Preview */}
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

                    {/* B) Conflict Summary */}
                    <motion.div variants={itemVariants}>
                        <ConflictAlert
                            conflicts={data?.conflicts || []}
                            severity={stats?.conflict_severity || 'none'}
                        />
                    </motion.div>
                </div>

                {/* RIGHT COLUMN — Analytical Intelligence (4 cols) */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* A) Task Distribution Chart */}
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

                    {/* B) Travel Burden */}
                    <motion.div variants={itemVariants}>
                        <Card className="overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Car className="h-4 w-4 text-amber-500" />
                                    Travel Summary
                                    <span className="text-[10px] font-medium text-slate-400 ml-1">(TravelAgent)</span>
                                </h2>
                            </div>
                            <div className="p-5">
                                <TravelCard travel={data?.travel || { total_minutes: 0, travel_event_count: 0, longest_route_minutes: 0, optimization_tip: '' }} />
                            </div>
                        </Card>
                    </motion.div>

                    {/* C) Workload Assessment */}
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

                    {/* D) Pending Tasks */}
                    {pendingTasks.length > 0 && (
                        <motion.div variants={itemVariants}>
                            <Card className="overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <ListTodo className="h-4 w-4 text-emerald-500" />
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

            {/* ═══════════════════════════════════════════════════
                Section 4 — Project Analytics (Database Charts)
            ═══════════════════════════════════════════════════ */}
            {dbStats && (dbStats.tasks_per_project.length > 0 || dbStats.total_tasks > 0) && (
                <motion.div variants={itemVariants}>
                    <div className="flex items-center gap-2 mb-3">
                        <FolderKanban className="h-3.5 w-3.5 text-indigo-500" />
                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
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

            {/* ═══════════════════════════════════════════════════
                Section 5 — AI Strategic Insight Panel (Full Width)
            ═══════════════════════════════════════════════════ */}
            <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 mb-3">
                    <BrainCircuit className="h-3.5 w-3.5 text-blue-500" />
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        AI Insight Layer
                    </h2>
                </div>
                <InsightPanel insights={data?.insights || []} />
            </motion.div>

            {/* ─── Error Toast ─── */}
            {error && (
                <div className="fixed bottom-6 right-6 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50">
                    {error}
                </div>
            )}
        </motion.div>
    );
}
