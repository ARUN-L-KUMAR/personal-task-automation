import { useState } from 'react';
import { PlannerForm } from './PlannerForm';
import { PlannerResults } from './PlannerResults';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { plannerService } from './planner.service';
import { usePlannerStore } from '../../store/usePlannerStore';

import { AnimatePresence, motion } from 'framer-motion';

import { AlertTriangle, Bot } from 'lucide-react';

export function PlannerPage() {
    const { currentResult, setResult, isLoading, setIsLoading, error, setError } = usePlannerStore();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingData, setPendingData] = useState<any>(null);

    const handleSubmit = (data: any) => {
        setPendingData(data);
        setIsConfirmOpen(true);
    };

    const handleConfirmAction = async () => {
        setIsConfirmOpen(false);
        setIsLoading(true);
        setError(null);

        try {
            const result = await plannerService.planDay(pendingData);
            setResult(result);
        } catch (err: any) {
            setError(err.message || 'Failed to generate plan');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Day Planner</h1>
                <p className="text-slate-500 mt-1">AI-powered schedule optimization and task prioritization.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-start">
                <section>
                    <PlannerForm onSubmit={handleSubmit} isLoading={isLoading} />
                </section>

                <section className="sticky top-8">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="h-20 bg-white border rounded-xl animate-pulse" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <Skeleton key={i} className="h-64 rounded-xl" />
                                    ))}
                                </div>
                            </motion.div>
                        ) : currentResult ? (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <PlannerResults result={currentResult} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 p-8 text-center"
                            >
                                <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100 mb-4">
                                    <Bot className="h-12 w-12 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 italic">"Ready when you are!"</h3>
                                <p className="mt-2 max-w-xs">Fill out the form on the left to generate your AI-optimized daily schedule.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            </div>

            <ConfirmationDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmAction}
                title="Generate Schedule?"
                description="This will send your meetings and tasks to the AI engine for analysis and optimization. Your previous result will be replaced."
                confirmText="Yes, Optimize"
                isLoading={isLoading}
            />

            {error && (
                <div className="fixed bottom-8 right-8 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3">
                    <div className="bg-red-100 p-2 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <p className="font-bold">Error Occurred</p>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
