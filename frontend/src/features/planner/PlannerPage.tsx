import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bot, RotateCcw, Download, FileJson, Radio, Wifi, Zap } from 'lucide-react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { plannerService } from './planner.service';
import { InputPanel } from './InputPanel';
import { ExecutionTimeline } from './ExecutionTimeline';
import { SummaryStrip } from './SummaryStrip';
import { ResultPanel } from './ResultPanel';
import { cn } from '../../utils/cn';
import { usePageContextStore } from '../../store/usePageContextStore';

const AGENT_KEYS = ['calendar', 'tasks', 'email', 'conflict', 'travel', 'planning', 'explanation'];

const phaseConfig: Record<string, { label: string; color: string; dot: string }> = {
    idle: { label: 'Idle', color: 'text-slate-400 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700', dot: 'bg-slate-300 dark:bg-slate-500' },
    running: { label: 'Analyzing', color: 'text-blue-500 bg-blue-50/80 border border-blue-200', dot: 'bg-blue-500 animate-pulse' },
    optimizing: { label: 'Optimizing', color: 'text-violet-500 bg-violet-50/80 border border-violet-200', dot: 'bg-violet-500 animate-pulse' },
    completed: { label: 'Done', color: 'text-emerald-500 bg-emerald-50/60 border border-emerald-200', dot: 'bg-emerald-500' },
    error: { label: 'Error', color: 'text-red-500 bg-red-50/80 border border-red-200', dot: 'bg-red-500' },
};

export function PlannerPage() {
    const store = usePlannerStore();
    const executing = useRef(false);
    const { setHeaderContext, clearHeaderContext } = usePageContextStore();

    /* ── Sequential agent-step animation ── */
    const animateSteps = useCallback(async () => {
        for (let i = 0; i < AGENT_KEYS.length; i++) {
            const key = AGENT_KEYS[i];
            store.setAgentStepStatus(key, 'running');
            await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
            store.setAgentStepStatus(key, 'success', `${key} analysis complete`);
            // Switch to "Optimizing" once analysis agents finish (~70%)
            if (i === 4) store.setExecutionPhase('optimizing');
        }
    }, []);

    /* ── Generate handler ── */
    const handleGenerate = useCallback(async () => {
        if (executing.current) return;
        executing.current = true;
        store.startExecution();

        try {
            // Run animation + API call in parallel
            const [result] = await Promise.all([
                store.mode === 'manual'
                    ? plannerService.planDay(store.settings, store.meetings, store.tasks)
                    : plannerService.planDayLive(),
                animateSteps(),
            ]);
            store.completeExecution(result);
        } catch (err: any) {
            store.failExecution(err.message || 'Pipeline failed');
        } finally {
            executing.current = false;
        }
    }, [store.mode, store.settings, store.meetings, store.tasks, animateSteps]);

    /* ── Export as JSON ── */
    const handleExportJSON = useCallback(() => {
        if (!store.currentResult) return;
        const blob = new Blob([JSON.stringify(store.currentResult, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plan-${store.settings.date}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [store.currentResult, store.settings.date]);

    const isRunning = store.executionPhase === 'running' || store.executionPhase === 'optimizing';
    const isCompleted = store.executionPhase === 'completed';
    const hasResult = !!store.currentResult;
    const phase = phaseConfig[store.executionPhase] || phaseConfig.idle;

    /* ── Validation ── */
    const canGenerate =
        store.mode === 'live' || (store.meetings.length > 0 || store.tasks.length > 0);

    useEffect(() => {
        setHeaderContext({
            hideSearch: true,
            summary: 'Multi-Agent Orchestration Engine',
            actions: (
                <>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                        <button
                            onClick={() => store.setMode('manual')}
                            className={cn(
                                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                                store.mode === 'manual'
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            )}
                        >
                            <Radio className="h-3 w-3 inline mr-1.5" />
                            Manual
                        </button>
                        <button
                            onClick={() => store.setMode('live')}
                            className={cn(
                                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                                store.mode === 'live'
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            )}
                        >
                            <Wifi className="h-3 w-3 inline mr-1.5" />
                            Live (Google)
                        </button>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider', phase.color)}>
                        <span className={cn('h-1 w-1 rounded-full', phase.dot)} />
                        {phase.label}
                    </span>
                    <button
                        onClick={handleGenerate}
                        disabled={isRunning || !canGenerate}
                        className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                        <Zap className="h-3.5 w-3.5" />
                        {isRunning ? 'Generating...' : 'Generate Plan'}
                    </button>
                    <button
                        onClick={store.reset}
                        disabled={isRunning}
                        className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                </>
            ),
        });
        return () => clearHeaderContext();
    }, [canGenerate, clearHeaderContext, handleGenerate, isRunning, phase.color, phase.dot, phase.label, setHeaderContext, store.mode, store.reset, store.setMode]);

    return (
        <div className="space-y-4 px-4 py-4 pb-8 md:px-6 lg:px-8">
            {/* ── Main 2-column layout ── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 md:gap-4 items-start">
                {/* Left — Input Panel (5 cols) */}
                <div className="xl:col-span-5">
                    <InputPanel disabled={isRunning} />
                </div>

                {/* Right — Execution + Results (7 cols) */}
                <div className="xl:col-span-7 space-y-4 sticky top-4">
                    <AnimatePresence mode="wait">
                        {isRunning ? (
                            <motion.div
                                key="execution"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.25 }}
                            >
                                <ExecutionTimeline steps={store.agentSteps} />
                            </motion.div>
                        ) : hasResult && store.currentResult ? (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-5"
                            >
                                {/* Summary strip */}
                                <SummaryStrip result={store.currentResult} />

                                {/* Action bar */}
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                        Generated at{' '}
                                        {new Date(store.currentResult.generated_at).toLocaleTimeString()}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleGenerate}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            Re-optimize
                                        </button>
                                        <button
                                            onClick={handleExportJSON}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            <FileJson className="h-3 w-3" />
                                            Export JSON
                                        </button>
                                    </div>
                                </div>

                                {/* Insights banner */}
                                {store.currentResult.insights.overloadDetected && (
                                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 p-3 rounded-xl">
                                        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-red-700 dark:text-red-300">Overload Warning</p>
                                            <p className="text-xs text-red-600 dark:text-red-400">{store.currentResult.insights.overloadMessage}</p>
                                        </div>
                                    </div>
                                )}
                                {store.currentResult.insights.burnoutRisk && !store.currentResult.insights.overloadDetected && (
                                    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 p-3 rounded-xl">
                                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Burnout Risk</p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400">{store.currentResult.insights.burnoutMessage}</p>
                                        </div>
                                    </div>
                                )}
                                {store.currentResult.insights.focusWindow && (
                                    <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40 p-3 rounded-xl">
                                        <Bot className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                                        <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">{store.currentResult.insights.focusWindow}</p>
                                    </div>
                                )}

                                {/* Tabbed result panel */}
                                <ResultPanel result={store.currentResult} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-[520px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 p-8 text-center"
                            >
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 mb-5">
                                    <Bot className="h-14 w-14 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">AI Orchestration Engine</h3>
                                <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                                    {store.mode === 'manual'
                                        ? 'Add meetings & tasks, then hit Generate to run the multi-agent pipeline.'
                                        : 'Switch to Manual or click Generate to auto-fetch from Google and optimize.'}
                                </p>
                                <div className="mt-6 flex items-center gap-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                    <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">7 Agents</span>
                                    <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">Real-time Pipeline</span>
                                    <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">Smart Optimization</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Error toast ── */}
            <AnimatePresence>
                {store.error && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className="fixed bottom-8 right-8 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 z-50"
                    >
                        <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <p className="font-bold">Pipeline Error</p>
                            <p className="text-sm opacity-90">{store.error}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
