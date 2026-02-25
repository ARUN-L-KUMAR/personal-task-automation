import React from 'react';
import { BrainCircuit, Zap, RotateCcw, Wifi, Radio } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { PlanMode } from '../../types/planner.types';

interface Props {
    mode: PlanMode;
    onModeChange: (mode: PlanMode) => void;
    executionPhase: string;
    onGenerate: () => void;
    onReset: () => void;
    canGenerate?: boolean;
}

const phaseConfig: Record<string, { label: string; color: string; dot: string }> = {
    idle: { label: 'Idle', color: 'text-slate-400 bg-slate-50 border border-slate-200', dot: 'bg-slate-300' },
    running: { label: 'Analyzing', color: 'text-blue-500 bg-blue-50/80 border border-blue-200', dot: 'bg-blue-500 animate-pulse' },
    optimizing: { label: 'Optimizing', color: 'text-violet-500 bg-violet-50/80 border border-violet-200', dot: 'bg-violet-500 animate-pulse' },
    completed: { label: 'Done', color: 'text-emerald-500 bg-emerald-50/60 border border-emerald-200', dot: 'bg-emerald-500' },
    error: { label: 'Error', color: 'text-red-500 bg-red-50/80 border border-red-200', dot: 'bg-red-500' },
};

export function PlannerHeader({ mode, onModeChange, executionPhase, onGenerate, onReset, canGenerate = true }: Props) {
    const isRunning = executionPhase === 'running';
    const phase = phaseConfig[executionPhase] || phaseConfig.idle;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <BrainCircuit className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Day Planner</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Multi-Agent Orchestration Engine</p>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                {/* Mode Toggle */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button
                        onClick={() => onModeChange('manual')}
                        className={cn(
                            'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                            mode === 'manual'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        <Radio className="h-3 w-3 inline mr-1.5" />
                        Manual
                    </button>
                    <button
                        onClick={() => onModeChange('live')}
                        className={cn(
                            'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                            mode === 'live'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        <Wifi className="h-3 w-3 inline mr-1.5" />
                        Live (Google)
                    </button>
                </div>

                {/* Status Badge — compact, subordinate to Generate */}
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider', phase.color)}>
                    <span className={cn('h-1 w-1 rounded-full', phase.dot)} />
                    {phase.label}
                </span>

                {/* Actions — Generate is visually dominant */}
                <Button
                    onClick={onGenerate}
                    disabled={isRunning || !canGenerate}
                    isLoading={isRunning}
                    size="sm"
                    className="h-10 px-5 text-sm shadow-md shadow-blue-200/50 hover:shadow-lg hover:shadow-blue-200/60 transition-shadow"
                >
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    Generate Optimized Plan
                </Button>
                <Button variant="outline" size="sm" onClick={onReset} disabled={isRunning} className="h-9 px-3">
                    <RotateCcw className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
