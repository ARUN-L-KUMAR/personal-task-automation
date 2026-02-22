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

export function HistoryPage() {
    const [history, setHistory] = useState<PlanHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<PlanHistoryItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);

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

    const confirmDelete = () => {
        setHistory(history.filter(item => item.id !== planToDelete));
        setIsDeleteOpen(false);
        setPlanToDelete(null);
    };

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Plan History</h1>
                    <p className="text-slate-500 mt-1">Review and manage your previously generated schedules.</p>
                </div>
            </header>

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
                                        <TableCell><div className="h-4 w-24 bg-slate-100 animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-12 bg-slate-100 animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-12 bg-slate-100 animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-32 bg-slate-100 animate-pulse rounded" /></TableCell>
                                        <TableCell className="text-right flex justify-end space-x-2">
                                            <div className="h-8 w-8 bg-slate-100 animate-pulse rounded" />
                                            <div className="h-8 w-8 bg-slate-100 animate-pulse rounded" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : history.length > 0 ? (
                                history.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium text-slate-900">
                                            <div className="flex items-center">
                                                <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                                                {item.input.date}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{item.input.meetings.length} Meetings</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{item.input.tasks.length} Tasks</Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm">
                                            {new Date(item.timestamp || item.output.generated_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-1">
                                                <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(item)}>
                                                    <Eye className="h-4 w-4 mr-1" /> View
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">
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
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                                    <Clock className="h-4 w-4 mr-2" /> Meetings
                                </h4>
                                <ul className="space-y-2">
                                    {selectedPlan.input.meetings.map((m, i) => (
                                        <li key={i} className="text-xs text-slate-600 bg-white p-2 rounded shadow-sm border border-slate-200">
                                            <span className="font-bold">{m.startTime}-{m.endTime}:</span> {m.title}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                                    <ListChecks className="h-4 w-4 mr-2" /> Tasks
                                </h4>
                                <ul className="space-y-2">
                                    {selectedPlan.input.tasks.map((t, i) => (
                                        <li key={i} className="text-xs text-slate-600 bg-white p-2 rounded shadow-sm border border-slate-200">
                                            <span className="font-bold">{t.duration}m:</span> {t.title}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-900">Optimization Result</h4>
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
