import React, { useState } from 'react';
import { Calendar, AlertTriangle, MapPin, Brain, Database } from 'lucide-react';
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
    { id: 'schedule',    label: 'Schedule',       icon: Calendar },
    { id: 'conflicts',   label: 'Conflicts',      icon: AlertTriangle },
    { id: 'travel',      label: 'Travel Plan',    icon: MapPin },
    { id: 'explanation', label: 'AI Explanation',  icon: Brain },
    { id: 'raw',         label: 'Agent Data',     icon: Database },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function ResultPanel({ result }: Props) {
    const [activeTab, setActiveTab] = useState<TabId>('schedule');

    const conflictCount = result.conflicts.length;

    return (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 overflow-x-auto">
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
                            {tab.id === 'conflicts' && conflictCount > 0 && (
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
                        {activeTab === 'schedule' && <ScheduleTab schedule={result.schedule} />}
                        {activeTab === 'conflicts' && <ConflictTab conflicts={result.conflicts} />}
                        {activeTab === 'travel' && <TravelTab travel={result.travel} />}
                        {activeTab === 'explanation' && <ExplanationTab explanation={result.explanation} />}
                        {activeTab === 'raw' && <AgentDataTab rawData={result.agentRawData} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
