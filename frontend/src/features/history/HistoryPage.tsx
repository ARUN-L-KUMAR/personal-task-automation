import { useEffect, useState } from 'react';
import { historyService } from './history.service';
import { PlanHistoryItem } from '../../types/planner.types';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Calendar, Eye, Trash2, Clock, ListChecks } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { usePageContextStore } from '../../store/usePageContextStore';

export function HistoryPage() {
    const [history, setHistory] = useState<PlanHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<PlanHistoryItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);
    const { setHeaderContext, clearHeaderContext } = usePageContextStore();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await historyService.getHistory();
                setHistory(data);
            } catch (err) {
                console.error('Failed to fetch history', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const handleDelete = (id: string) => {
        setPlanToDelete(id);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (planToDelete) {
            try {
                await historyService.deleteHistory(planToDelete);
                setHistory(history.filter(item => item.id !== planToDelete));
            } catch (err) {
                console.error('Failed to delete plan', err);
            }
        }
        setIsDeleteOpen(false);
        setPlanToDelete(null);
    };

    useEffect(() => {
        setHeaderContext({
            hideSearch: true,
            summary: 'Review and manage your previously generated schedules.',
        });
        return () => clearHeaderContext();
    }, [clearHeaderContext, setHeaderContext]);

    return (
        <div className="space-y-4 px-4 py-4 pb-8 md:px-6 lg:px-8">
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Meetings</TableHead>
                                <TableHead>Tasks</TableHead>
                                <TableHead>Optimized At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [1, 2, 3].map((i) => (
                                    <TableRow key={i}>
                                        <TableCell><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" /></TableCell>
                                        <TableCell className="text-right flex justify-end space-x-2">
                                            <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                                            <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : history.length > 0 ? (
                                history.map((item) => (
                                    <TableRow key={item.id || Math.random()}>
                                        <TableCell className="font-medium text-slate-900 dark:text-white">
                                            <div className="flex items-center">
                                                <Calendar className="h-4 w-4 mr-2 text-slate-400 dark:text-slate-500" />
                                                {item.input?.settings?.date || 'N/A'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{(item.input?.meetings?.length || 0)} Meetings</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{(item.input?.tasks?.length || 0)} Tasks</Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                                            {item.timestamp || item.output?.generated_at
                                                ? new Date(item.timestamp || item.output?.generated_at).toLocaleString()
                                                : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-1">
                                                <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(item)} disabled={!item.input}>
                                                    <Eye className="h-4 w-4 mr-1" /> View
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500">
                                        No history found. Start planning to see results here!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* JSON View Dialog */}
            <Dialog
                isOpen={!!selectedPlan}
                onClose={() => setSelectedPlan(null)}
                title="Plan Details"
                className="max-w-4xl"
            >
                {selectedPlan && (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                                    <Clock className="h-4 w-4 mr-2" /> Meetings
                                </h4>
                                <ul className="space-y-2">
                                    {selectedPlan.input?.meetings?.map((m, i) => (
                                        <li key={i} className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                                            <span className="font-bold">{m.startTime}-{m.endTime}:</span> {m.title}
                                        </li>
                                    )) || <li className="text-xs text-slate-400 dark:text-slate-500">No meetings data</li>}
                                </ul>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                                    <ListChecks className="h-4 w-4 mr-2" /> Tasks
                                </h4>
                                <ul className="space-y-2">
                                    {selectedPlan.input?.tasks?.map((t, i) => (
                                        <li key={i} className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                                            <span className="font-bold">{t.estimatedDuration}m:</span> {t.title}
                                        </li>
                                    )) || <li className="text-xs text-slate-400 dark:text-slate-500">No tasks data</li>}
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Optimization Result</h4>
                            <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                {JSON.stringify(selectedPlan.output, null, 2)}
                            </div>
                        </div>
                    </div>
                )}
            </Dialog>

            <ConfirmationDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={confirmDelete}
                title="Delete History Item?"
                description="Are you sure you want to delete this plan? This action cannot be undone."
                confirmText="Yes, Delete"
                variant="danger"
            />
        </div>
    );
}
