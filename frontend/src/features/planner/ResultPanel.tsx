import React, { useState } from 'react';
import { Calendar, Lightbulb, Database, LayoutGrid, CheckCircle2, Clock3, AlertTriangle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { PlannerResult } from '../../types/planner.types';
import { ScheduleTab } from './ScheduleTab';
import { ConflictTab } from './ConflictTab';
import { TravelTab } from './TravelTab';
import { ExplanationTab } from './ExplanationTab';
import { AgentDataTab } from './AgentDataTab';

interface Props {
    result: PlannerResult;
}

const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'agents', label: 'Agents', icon: Database },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function ResultPanel({ result }: Props) {
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    const conflictCount = result.conflicts.length;
    const scheduledCount = result.schedule.filter((entry) => entry.type === 'meeting' || entry.type === 'task').length;
    const taskCount = result.schedule.filter((entry) => entry.type === 'task').length;
    const meetingCount = result.schedule.filter((entry) => entry.type === 'meeting').length;

    const todoCards = result.explanation.recommendations.slice(0, 5);
    const scheduledCards = result.schedule
        .filter((entry) => entry.type === 'meeting' || entry.type === 'task')
        .slice(0, 8);

    const kpis = [
        {
            label: 'Productivity Score',
            value: `${result.insights.productivityScore}%`,
            tone: 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/30 dark:border-sky-900 dark:text-sky-200',
        },
        {
            label: 'Pending Tasks',
            value: String(taskCount),
            meta: conflictCount > 0 ? `${conflictCount} conflicts` : 'All clear',
            tone: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200',
        },
        {
            label: 'Conflicts Detected',
            value: String(conflictCount),
            tone: conflictCount > 0
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-200',
        },
        {
            label: 'Meetings Today',
            value: String(meetingCount),
            meta: `${result.travel.totalMinutes}m travel`,
            tone: 'bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-950/30 dark:border-violet-900 dark:text-violet-200',
        },
    ];

    return (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 overflow-x-auto">
                {tabs.map(tab => {
                    const active = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'relative flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-all whitespace-nowrap',
                                active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                            {tab.id === 'insights' && conflictCount > 0 && (
                                <span className="ml-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                    {conflictCount}
                                </span>
                            )}
                            {active && (
                                <motion.div
                                    layoutId="tab-underline"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            <div className="p-5 min-h-[320px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                    >
                        {activeTab === 'overview' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                                    {kpis.map((kpi) => (
                                        <div key={kpi.label} className={cn('rounded-xl border px-4 py-3', kpi.tone)}>
                                            <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">{kpi.label}</p>
                                            <p className="text-3xl font-black leading-tight mt-1">{kpi.value}</p>
                                            {kpi.meta && (
                                                <p className="text-[11px] mt-1 opacity-75 font-semibold">{kpi.meta}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                                        <header className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">To Do</h3>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{todoCards.length}</span>
                                        </header>
                                        <div className="p-3 space-y-2 min-h-[260px]">
                                            {todoCards.length > 0 ? todoCards.map((todo, idx) => (
                                                <article key={`${todo}-${idx}`} className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
                                                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">{todo}</p>
                                                </article>
                                            )) : (
                                                <div className="h-full min-h-[220px] flex items-center justify-center text-center text-slate-400 dark:text-slate-500 text-sm">
                                                    No pending recommendations.
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                                        <header className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Scheduled</h3>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{scheduledCount}</span>
                                        </header>
                                        <div className="p-3 space-y-2 min-h-[260px]">
                                            {scheduledCards.length > 0 ? scheduledCards.map((entry, idx) => (
                                                <article key={`${entry.title}-${idx}`} className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 px-3 py-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs font-bold text-blue-900 dark:text-blue-100 truncate">{entry.title}</p>
                                                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">{entry.type}</span>
                                                    </div>
                                                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1">{entry.time} - {entry.endTime}</p>
                                                </article>
                                            )) : (
                                                <div className="h-full min-h-[220px] flex items-center justify-center text-center text-slate-400 dark:text-slate-500 text-sm">
                                                    No scheduled entries.
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                                        <header className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Done Today</h3>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">0</span>
                                        </header>
                                        <div className="p-3 min-h-[260px] flex flex-col items-center justify-center text-center">
                                            <CheckCircle2 className="h-7 w-7 text-emerald-400 dark:text-emerald-500" />
                                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-2">Nothing completed yet</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Generate and execute the schedule to move tasks here.</p>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}

                        {activeTab === 'timeline' && <ScheduleTab schedule={result.schedule} />}

                        {activeTab === 'agents' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/70 dark:bg-slate-900/60">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pipeline Status</p>
                                        <p className="mt-1 text-base font-black text-emerald-600 dark:text-emerald-400">Active</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/70 dark:bg-slate-900/60">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Schedule Entries</p>
                                        <p className="mt-1 text-base font-black text-slate-800 dark:text-slate-100">{result.schedule.length}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/70 dark:bg-slate-900/60">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Travel Routes</p>
                                        <p className="mt-1 text-base font-black text-slate-800 dark:text-slate-100">{result.travel.routes.length}</p>
                                    </div>
                                </div>
                                <AgentDataTab rawData={result.agentRawData} />
                            </div>
                        )}

                        {activeTab === 'insights' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/60">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Conflict Analysis</h3>
                                        </div>
                                        <ConflictTab conflicts={result.conflicts} />
                                    </div>
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/60">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock3 className="h-4 w-4 text-amber-500" />
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Travel Plan</h3>
                                        </div>
                                        <TravelTab travel={result.travel} />
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/60">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="h-4 w-4 text-indigo-500" />
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">AI Explanation</h3>
                                    </div>
                                    <ExplanationTab explanation={result.explanation} />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
