import React, { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bot, RotateCcw, Download, FileJson } from 'lucide-react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { plannerService } from './planner.service';
import { PlannerHeader } from './PlannerHeader';
import { InputPanel } from './InputPanel';
import { ExecutionTimeline } from './ExecutionTimeline';
import { SummaryStrip } from './SummaryStrip';
import { ResultPanel } from './ResultPanel';

const AGENT_KEYS = ['calendar', 'tasks', 'email', 'conflict', 'travel', 'planning', 'explanation'];

export function PlannerPage() {
    const store = usePlannerStore();
    const executing = useRef(false);

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

    /* ── Validation ── */
    const canGenerate =
        store.mode === 'live' || (store.meetings.length > 0 || store.tasks.length > 0);

    return (
        <div className="space-y-6 pb-12">
            {/* ── Header ── */}
            <PlannerHeader
                mode={store.mode}
                onModeChange={store.setMode}
                executionPhase={store.executionPhase}
                onGenerate={handleGenerate}
                onReset={store.reset}
                canGenerate={canGenerate}
            />

            {/* ── Main 2-column layout ── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Left — Input Panel (5 cols) */}
                <div className="xl:col-span-5">
                    <InputPanel disabled={isRunning} />
                </div>

                {/* Right — Execution + Results (7 cols) */}
                <div className="xl:col-span-7 space-y-5 sticky top-6">
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
                                    <p className="text-xs text-slate-400">
                                        Generated at{' '}
                                        {new Date(store.currentResult.generated_at).toLocaleTimeString()}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleGenerate}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            Re-optimize
                                        </button>
                                        <button
                                            onClick={handleExportJSON}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            <FileJson className="h-3 w-3" />
                                            Export JSON
                                        </button>
                                    </div>
                                </div>

                                {/* Insights banner */}
                                {store.currentResult.insights.overloadDetected && (
                                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 p-3 rounded-xl">
                                        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-red-700">Overload Warning</p>
                                            <p className="text-xs text-red-600">{store.currentResult.insights.overloadMessage}</p>
                                        </div>
                                    </div>
                                )}
                                {store.currentResult.insights.burnoutRisk && !store.currentResult.insights.overloadDetected && (
                                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-amber-700">Burnout Risk</p>
                                            <p className="text-xs text-amber-600">{store.currentResult.insights.burnoutMessage}</p>
                                        </div>
                                    </div>
                                )}
                                {store.currentResult.insights.focusWindow && (
                                    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                                        <Bot className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                                        <p className="text-xs text-indigo-700 font-medium">{store.currentResult.insights.focusWindow}</p>
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
                                className="h-[520px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 p-8 text-center"
                            >
                                <div className="bg-white p-5 rounded-full shadow-sm border border-slate-100 mb-5">
                                    <Bot className="h-14 w-14 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">AI Orchestration Engine</h3>
                                <p className="mt-2 max-w-xs text-sm">
                                    {store.mode === 'manual'
                                        ? 'Add meetings & tasks, then hit Generate to run the multi-agent pipeline.'
                                        : 'Switch to Manual or click Generate to auto-fetch from Google and optimize.'}
                                </p>
                                <div className="mt-6 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                                    <span className="bg-slate-200 px-2 py-0.5 rounded-full">7 Agents</span>
                                    <span className="bg-slate-200 px-2 py-0.5 rounded-full">Real-time Pipeline</span>
                                    <span className="bg-slate-200 px-2 py-0.5 rounded-full">Smart Optimization</span>
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
                        className="fixed bottom-8 right-8 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 z-50"
                    >
                        <div className="bg-red-100 p-2 rounded-lg">
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
