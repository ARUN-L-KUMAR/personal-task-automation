import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgentLogHistoryItem, ChatSessionHistoryItem, historyService } from './history.service';
import { PlanHistoryItem } from '../../types/planner.types';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Activity, Bot, Calendar, Eye, MessageSquareText, RefreshCw, Trash2, Clock, ListChecks } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { usePageContextStore } from '../../store/usePageContextStore';

type ActivityType = 'plan' | 'agent' | 'chat';

interface UnifiedActivityItem {
    id: string;
    type: ActivityType;
    title: string;
    subtitle: string;
    timestamp?: string;
    meetingsCount?: number;
    tasksCount?: number;
    planId?: string;
    raw: unknown;
}

const POLL_MS = 5000;

function formatDateTime(value?: string): string {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleString();
}

function toUnifiedPlanItem(item: any): UnifiedActivityItem {
    const date = item?.input?.settings?.date || item?.plan_date || 'N/A';

    // /api/ai-plans stores plan entries in optimized_schedule, often nested under optimized_schedule.
    const rawSchedule = item?.optimized_schedule ?? item?.output?.schedule ?? [];
    const scheduleEntries = Array.isArray(rawSchedule)
        ? rawSchedule
        : Array.isArray(rawSchedule?.optimized_schedule)
            ? rawSchedule.optimized_schedule
            : [];

    const meetingsCount = scheduleEntries.filter((entry: any) => entry?.type === 'meeting').length;
    const tasksCount = scheduleEntries.filter((entry: any) => entry?.type === 'task').length;
    const timestamp = item?.timestamp || item?.output?.generated_at || item?.created_at;
    const planId = item?.id ? String(item.id) : undefined;

    return {
        id: `plan-${planId || date}`,
        type: 'plan',
        title: `Plan generated for ${date}`,
        subtitle: `${meetingsCount} meetings • ${tasksCount} tasks`,
        timestamp,
        meetingsCount,
        tasksCount,
        planId,
        raw: item,
    };
}

function toUnifiedLogItem(item: AgentLogHistoryItem): UnifiedActivityItem {
    return {
        id: `agent-${item.id}`,
        type: 'agent',
        title: `${item.agent_name} agent ${item.status}`,
        subtitle: `${item.log_level || 'INFO'} • ${item.execution_time_ms || 0}ms`,
        timestamp: item.created_at,
        planId: item.plan_id,
        raw: item,
    };
}

function toUnifiedChatItem(item: ChatSessionHistoryItem): UnifiedActivityItem {
    return {
        id: `chat-${item.id}`,
        type: 'chat',
        title: item.title || 'Chat session',
        subtitle: `${item.message_count || 0} messages`,
        timestamp: item.updated_at || item.created_at,
        raw: item,
    };
}

function sortByNewest(items: UnifiedActivityItem[]): UnifiedActivityItem[] {
    return [...items].sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
    });
}

export function HistoryPage() {
    const [activities, setActivities] = useState<UnifiedActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedActivity, setSelectedActivity] = useState<UnifiedActivityItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const { setHeaderContext, clearHeaderContext } = usePageContextStore();
    const isFetchingRef = useRef(false);

    const fetchLiveHistory = useCallback(async (silent = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        if (!silent) setIsLoading(true);

        try {
            const [plansResult, logsResult, chatsResult] = await Promise.allSettled([
                historyService.getHistory(),
                historyService.getAgentLogs(),
                historyService.getChatSessions(),
            ]);

            const planItems = plansResult.status === 'fulfilled'
                ? plansResult.value.map((item: PlanHistoryItem | any) => toUnifiedPlanItem(item))
                : [];

            const logItems = logsResult.status === 'fulfilled'
                ? logsResult.value.map((item) => toUnifiedLogItem(item))
                : [];

            const chatItems = chatsResult.status === 'fulfilled'
                ? chatsResult.value.map((item) => toUnifiedChatItem(item))
                : [];

            setActivities(sortByNewest([...planItems, ...logItems, ...chatItems]));
            setLastUpdatedAt(new Date());
        } catch (err) {
            console.error('Failed to fetch live history', err);
        } finally {
            if (!silent) setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        fetchLiveHistory(false);

        const intervalId = window.setInterval(() => {
            fetchLiveHistory(true);
        }, POLL_MS);

        const handleVisibleRefresh = () => {
            if (document.visibilityState === 'visible') {
                fetchLiveHistory(true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibleRefresh);
        window.addEventListener('focus', handleVisibleRefresh);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibleRefresh);
            window.removeEventListener('focus', handleVisibleRefresh);
        };
    }, [fetchLiveHistory]);

    const handleDelete = (id: string) => {
        setPlanToDelete(id);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (planToDelete) {
            try {
                await historyService.deleteHistory(planToDelete);
                setActivities((prev) => prev.filter((item) => item.planId !== planToDelete));
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
            summary: 'Live activity feed across plans, agents, and chat sessions.',
            actions: (
                <Button variant="outline" size="sm" onClick={() => fetchLiveHistory(true)} className="h-9">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh now
                </Button>
            ),
        });
        return () => clearHeaderContext();
    }, [clearHeaderContext, fetchLiveHistory, setHeaderContext]);

    const selectedPlan = useMemo(() => {
        if (!selectedActivity || selectedActivity.type !== 'plan') return null;
        return selectedActivity.raw as any;
    }, [selectedActivity]);

    return (
        <div className="space-y-4 px-4 py-4 pb-8 md:px-6 lg:px-8">
            <Card>
                <CardContent className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Activity className="h-3.5 w-3.5" /> Live updates every {Math.floor(POLL_MS / 1000)}s
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Last sync: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : 'N/A'}
                    </div>
                </CardContent>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Activity</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Time</TableHead>
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
                            ) : activities.length > 0 ? (
                                activities.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Badge variant="secondary" className="inline-flex items-center gap-1.5">
                                                {item.type === 'plan' ? <Calendar className="h-3 w-3" /> : item.type === 'agent' ? <Bot className="h-3 w-3" /> : <MessageSquareText className="h-3 w-3" />}
                                                {item.type === 'plan' ? 'Plan' : item.type === 'agent' ? 'Agent' : 'Chat'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-900 dark:text-white">
                                            {item.title}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-500 dark:text-slate-400">{item.subtitle}</span>
                                            {item.type === 'plan' && (
                                                <div className="mt-1 flex gap-2">
                                                    <Badge variant="secondary">{item.meetingsCount || 0} Meetings</Badge>
                                                    <Badge variant="secondary">{item.tasksCount || 0} Tasks</Badge>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                                            {formatDateTime(item.timestamp)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(() => {
                                                const canDelete = item.type === 'plan' && Boolean(item.planId);
                                                return (
                                            <div className="flex justify-end space-x-1">
                                                <Button variant="ghost" size="sm" onClick={() => setSelectedActivity(item)}>
                                                    <Eye className="h-4 w-4 mr-1" /> View
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={!canDelete}
                                                    onClick={canDelete ? () => handleDelete(item.planId!) : undefined}
                                                    title={canDelete ? 'Delete plan' : 'Delete unavailable for this item'}
                                                    className={canDelete
                                                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300'
                                                        : 'text-slate-300 dark:text-slate-600 opacity-60 cursor-not-allowed'}
                                                >
                                                        <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                                );
                                            })()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500">
                                        No activity found yet. Start using planner, agents, or chat to populate this feed.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* JSON View Dialog */}
            <Dialog
                isOpen={!!selectedActivity}
                onClose={() => setSelectedActivity(null)}
                title="Activity Details"
                className="max-w-4xl"
            >
                {selectedActivity && (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                        {selectedActivity.type === 'plan' && selectedPlan && selectedPlan.input && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                                        <Clock className="h-4 w-4 mr-2" /> Meetings
                                    </h4>
                                    <ul className="space-y-2">
                                        {selectedPlan.input?.meetings?.map((m: any, i: number) => (
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
                                        {selectedPlan.input?.tasks?.map((t: any, i: number) => (
                                            <li key={i} className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                                                <span className="font-bold">{t.estimatedDuration}m:</span> {t.title}
                                            </li>
                                        )) || <li className="text-xs text-slate-400 dark:text-slate-500">No tasks data</li>}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Raw Payload</h4>
                            <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                {JSON.stringify(selectedActivity.raw, null, 2)}
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
