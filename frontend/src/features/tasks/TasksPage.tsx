import React, { useCallback, useEffect, useState } from 'react';
import {
    CheckSquare, Plus, RefreshCw, Trash2, Calendar, Star,
    StickyNote, ChevronDown, ChevronRight, AlertCircle,
    CheckCircle2, XCircle, X, Loader2, Filter, List,
    ClipboardList, ExternalLink, FileText, Circle, CheckCircle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { tasksService } from '../../services/tasks.service';
import { cn } from '../../utils/cn';
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { usePageContextStore } from '../../store/usePageContextStore';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Task {
    id: string;
    title: string;
    notes?: string;
    due?: string;
    status: 'needsAction' | 'completed';
    updated?: string;
    parent?: string;
    source?: 'google';
}

interface TaskList {
    id: string;
    title: string;
    updated?: string;
}

interface DBTask {
    id: string;
    title: string;
    description?: string;
    due_date?: string;
    status: 'open' | 'in_progress' | 'completed' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    project_id?: string;
    created_at?: string;
    source: 'database';
}

interface Note {
    id: string;
    title: string;
    content?: string;
    created?: string;
    status?: string;
}

type TabView = 'all-tasks' | 'tasks' | 'notes';
type FilterMode = 'all' | 'pending' | 'completed';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDue(due?: string): { label: string; color: string } | null {
    if (!due) return null;
    try {
        const d = parseISO(due);
        if (isToday(d)) return { label: 'Today', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' };
        if (isTomorrow(d)) return { label: 'Tomorrow', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' };
        if (isPast(d)) return { label: format(d, 'MMM d'), color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' };
        return { label: format(d, 'MMM d'), color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' };
    } catch { return null; }
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
interface ToastMsg { id: number; type: 'success' | 'error'; text: string }
let _tid = 0;
function useToasts() {
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const push = (type: 'success' | 'error', text: string) => {
        const id = ++_tid;
        setToasts(p => [...p, { id, type, text }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
    };
    const dismiss = (id: number) => setToasts(p => p.filter(t => t.id !== id));
    return { toasts, push, dismiss };
}
function ToastContainer({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: number) => void }) {
    return (
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white pointer-events-auto',
                    t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                )}>
                    {t.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
                    <span>{t.text}</span>
                    <button onClick={() => onDismiss(t.id)} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
                </div>
            ))}
        </div>
    );
}

// ─── Create Task Modal ──────────────────────────────────────────────────────────
function CreateTaskModal({ isOpen, onClose, onCreated, taskLists, currentListId, pushToast }: {
    isOpen: boolean; onClose: () => void; onCreated: () => void;
    taskLists: TaskList[]; currentListId: string;
    pushToast: (t: 'success' | 'error', m: string) => void;
}) {
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [due, setDue] = useState('');
    const [listId, setListId] = useState(currentListId);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { if (isOpen) { setTitle(''); setNotes(''); setDue(''); setError(''); setListId(currentListId); } }, [isOpen, currentListId]);

    const handleCreate = async () => {
        if (!title.trim()) { setError('Title is required.'); return; }
        setIsLoading(true); setError('');
        try {
            const dueIso = due ? `${due}T00:00:00.000Z` : '';
            await tasksService.createTask(title.trim(), notes.trim(), dueIso, listId);
            pushToast('success', `Task "${title.trim()}" created!`);
            onCreated(); onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to create task.');
        } finally { setIsLoading(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                        <span className="font-bold text-slate-800 dark:text-white text-sm">New Task</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Title *</label>
                        <input autoFocus type="text" placeholder="What needs to be done?" value={title} onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Notes</label>
                        <textarea rows={3} placeholder="Optional description…" value={notes} onChange={e => setNotes(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Due Date</label>
                            <input type="date" value={due} onChange={e => setDue(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">List</label>
                            <select value={listId} onChange={e => setListId(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all">
                                {taskLists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                            </select>
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-500 font-medium flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> {error}</p>}
                </div>
                <div className="flex justify-end gap-2 px-5 pb-5">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button size="sm" onClick={handleCreate} disabled={isLoading} className="bg-violet-600 hover:bg-violet-700 text-white min-w-[110px]">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                        {isLoading ? 'Creating…' : 'Create Task'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Create Note Modal ──────────────────────────────────────────────────────────
function CreateNoteModal({ isOpen, onClose, onCreated, pushToast }: {
    isOpen: boolean; onClose: () => void; onCreated: () => void;
    pushToast: (t: 'success' | 'error', m: string) => void;
}) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { if (isOpen) { setTitle(''); setContent(''); setError(''); } }, [isOpen]);

    const handleCreate = async () => {
        if (!title.trim()) { setError('Title is required.'); return; }
        setIsLoading(true); setError('');
        try {
            await tasksService.createNote(title.trim(), content.trim());
            pushToast('success', `Note "${title.trim()}" saved!`);
            onCreated(); onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to create note.');
        } finally { setIsLoading(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50 dark:bg-amber-900/20">
                    <div className="flex items-center gap-2">
                        <StickyNote className="h-4 w-4 text-amber-500" />
                        <span className="font-bold text-slate-800 dark:text-white text-sm">New Note</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800/40 text-slate-400 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Title *</label>
                        <input autoFocus type="text" placeholder="Note title…" value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Content</label>
                        <textarea rows={6} placeholder="Write your note here…" value={content} onChange={e => setContent(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all resize-none" />
                    </div>
                    {error && <p className="text-xs text-red-500 font-medium flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> {error}</p>}
                </div>
                <div className="flex justify-end gap-2 px-5 pb-5">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button size="sm" onClick={handleCreate} disabled={isLoading} className="bg-amber-500 hover:bg-amber-600 text-white min-w-[110px]">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                        {isLoading ? 'Saving…' : 'Save Note'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Task Item ──────────────────────────────────────────────────────────────────
function TaskItem({ task, onToggle, onDelete }: {
    task: Task;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const due = formatDue(task.due);
    const completed = task.status === 'completed';
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={cn(
            'group flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all border-b border-slate-100 dark:border-slate-800/60 last:border-0',
            completed && 'opacity-60'
        )}>
            {/* Checkbox */}
            <button
                onClick={() => onToggle(task.id)}
                className="flex-shrink-0 mt-0.5 transition-all"
                title={completed ? 'Mark incomplete' : 'Mark complete'}
            >
                {completed
                    ? <CheckCircle className="h-5 w-5 text-emerald-500" />
                    : <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors" />
                }
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <button
                        className="text-left flex-1"
                        onClick={() => task.notes && setExpanded(e => !e)}
                    >
                        <span className={cn(
                            'font-semibold text-slate-800 dark:text-slate-200 text-sm leading-snug',
                            completed && 'line-through text-slate-400 dark:text-slate-500'
                        )}>
                            {task.title}
                        </span>
                        {task.notes && (
                            <span className="ml-2 inline-flex items-center text-slate-400">
                                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </span>
                        )}
                    </button>

                    {/* Actions */}
                    <button
                        onClick={() => onDelete(task.id)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 transition-all"
                        title="Delete task"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {due && (
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1', due.color)}>
                            <Calendar className="h-2.5 w-2.5" /> {due.label}
                        </span>
                    )}
                    {completed && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                            ✓ Done
                        </span>
                    )}
                </div>

                {expanded && task.notes && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        {task.notes}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Note Card ──────────────────────────────────────────────────────────────────
const NOTE_COLORS = [
    'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/40',
    'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/40',
    'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/40',
    'bg-violet-50 border-violet-100 dark:bg-violet-900/20 dark:border-violet-800/40',
    'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/40',
];
function noteColor(id: string) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
    return NOTE_COLORS[Math.abs(h) % NOTE_COLORS.length];
}

function NoteCard({ note, onDelete }: { note: Note; onDelete: (id: string) => void }) {
    const color = noteColor(note.id);
    return (
        <div className={cn('group relative rounded-2xl border p-4 flex flex-col gap-2 transition-all hover:shadow-md', color)}>
            <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">{note.title}</h4>
                <button
                    onClick={() => onDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-all"
                    title="Delete"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
            {note.content ? (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4">{note.content}</p>
            ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">No content</p>
            )}
            {note.created && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-auto pt-1 border-t border-black/5 dark:border-white/5">
                    {(() => { try { return format(parseISO(note.created), 'MMM d, yyyy'); } catch { return ''; } })()}
                </p>
            )}
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export function TasksPage() {
    const navigate = useNavigate();

    // ── State ──
    const [tab, setTab] = useState<TabView>('tasks');
    const [taskLists, setTaskLists] = useState<TaskList[]>([]);
    const [currentListId, setCurrentListId] = useState('@default');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [dbTasks, setDbTasks] = useState<DBTask[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isLoadingDbTasks, setIsLoadingDbTasks] = useState(true);
    const [isLoadingNotes, setIsLoadingNotes] = useState(true);
    const [tasksError, setTasksError] = useState<string | null>(null);
    const [dbTasksError, setDbTasksError] = useState<string | null>(null);
    const [notesError, setNotesError] = useState<string | null>(null);
    const [filterMode, setFilterMode] = useState<FilterMode>('pending');
    const [createTaskOpen, setCreateTaskOpen] = useState(false);
    const [createNoteOpen, setCreateNoteOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

    // ── Data Fetchers ──
    const fetchTaskLists = useCallback(async () => {
        try {
            const res = await tasksService.getTaskLists();
            const lists: TaskList[] = res.data.task_lists || [];
            setTaskLists(lists);
            if (lists.length > 0 && currentListId === '@default') {
                setCurrentListId(lists[0].id);
            }
        } catch { /* silently ignore */ }
    }, []);

    const fetchTasks = useCallback(async (listId = currentListId) => {
        setIsLoadingTasks(true); setTasksError(null);
        try {
            const res = await tasksService.getTasks(listId, filterMode === 'completed');
            let t: Task[] = res.data.tasks || [];
            t = t.map(task => ({ ...task, source: 'google' as const }));
            setTasks(t);
        } catch (e: any) {
            setTasksError(e?.message || 'Could not load tasks.');
        } finally { setIsLoadingTasks(false); }
    }, [currentListId, filterMode]);

    const fetchDbTasks = useCallback(async () => {
        setIsLoadingDbTasks(true); setDbTasksError(null);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}/api/db-tasks`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('g-one_token') || ''}` }
            });
            if (!res.ok) throw new Error('Failed to fetch database tasks');
            const data = await res.json();
            const tasks: DBTask[] = (data || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                due_date: t.due_date,
                status: t.status,
                priority: t.priority,
                project_id: t.project_id,
                created_at: t.created_at,
                source: 'database' as const,
            }));
            setDbTasks(tasks);
        } catch (e: any) {
            setDbTasksError(e?.message || 'Could not load database tasks.');
        } finally { setIsLoadingDbTasks(false); }
    }, []);

    const fetchNotes = useCallback(async () => {
        setIsLoadingNotes(true); setNotesError(null);
        try {
            const res = await tasksService.getNotes();
            setNotes(res.data.notes || []);
        } catch (e: any) {
            setNotesError(e?.message || 'Could not load notes.');
        } finally { setIsLoadingNotes(false); }
    }, []);

    useEffect(() => { fetchTaskLists(); }, [fetchTaskLists]);
    useEffect(() => { fetchTasks(); }, [fetchTasks]);
    useEffect(() => { if (tab === 'all-tasks') fetchDbTasks(); }, [tab, fetchDbTasks]);
    useEffect(() => { if (tab === 'notes') fetchNotes(); }, [tab, fetchNotes]);

    // ── Register page context for voice assistant ──
    const { setPageContext, clearPageContext, setHeaderContext, clearHeaderContext } = usePageContextStore();
    useEffect(() => {
        const lines: string[] = [];
        if (tab === 'all-tasks') {
            lines.push(`Viewing All Tasks (Google + Database). ${tasks.length} Google tasks, ${dbTasks.length} database tasks.`);
            [...tasks, ...dbTasks].slice(0, 10).forEach(t => {
                    const title = t.source === 'database' ? `[DB] ${t.title}` : `[G] ${t.title}`;
                    const due = t.source === 'database'
                        ? (t.due_date ? ` (due ${t.due_date.slice(0, 10)})` : '')
                        : (t.due ? ` (due ${t.due.slice(0, 10)})` : '');
                lines.push(`- ${title}${due}`);
            });
        } else if (tab === 'tasks') {
            lines.push(`Viewing ${tab === 'tasks' ? 'Google Tasks' : 'Notes'} tab. Filter: ${filterMode}.`);
            const pending = tasks.filter(t => t.status === 'needsAction');
            lines.push(`${pending.length} pending tasks, ${tasks.length - pending.length} completed.`);
            tasks.slice(0, 10).forEach(t => {
                const due = t.due ? ` (due ${t.due.slice(0, 10)})` : '';
                const n = t.notes ? ` — ${t.notes.slice(0, 80)}` : '';
                lines.push(`- [${t.status === 'completed' ? '✓' : ' '}] ${t.title}${due}${n}`);
            });
        } else {
            lines.push(`${notes.length} notes.`);
            notes.slice(0, 8).forEach(n => lines.push(`- ${n.title}${n.content ? ': ' + n.content.slice(0, 80) : ''}`));
        }
        setPageContext({ page: '/tasks', pageLabel: 'Tasks & Notes', visibleContent: lines.join('\n') });
        return () => clearPageContext();
    }, [tasks, dbTasks, notes, tab, filterMode, setPageContext, clearPageContext]);

    // ── Actions ──
    const handleToggleTask = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        try {
            await tasksService.completeTask(taskId, currentListId);
            pushToast('success', newStatus === 'completed' ? `"${task.title}" marked complete!` : `"${task.title}" reopened.`);
        } catch (e: any) {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status } : t));
            pushToast('error', 'Failed to update task.');
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            await tasksService.deleteTask(taskId, currentListId);
            pushToast('success', `Task "${task?.title}" deleted.`);
        } catch (e: any) {
            fetchTasks();
            pushToast('error', 'Failed to delete task.');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        const note = notes.find(n => n.id === noteId);
        setNotes(prev => prev.filter(n => n.id !== noteId));
        try {
            await tasksService.deleteNote(noteId);
            pushToast('success', `Note "${note?.title}" deleted.`);
        } catch {
            fetchNotes();
            pushToast('error', 'Failed to delete note.');
        }
    };

    // ── Computed ──
    const filteredTasks = tasks
        .filter(t => {
            if (filterMode === 'pending') return t.status !== 'completed';
            if (filterMode === 'completed') return t.status === 'completed';
            return true;
        })
        .filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const pendingCount = tasks.filter(t => t.status !== 'completed').length;
    const completedCount = tasks.filter(t => t.status === 'completed').length;

    const filteredNotes = notes.filter(n =>
        !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        setHeaderContext({
            hideSearch: true,
            summary: `${pendingCount} Google · ${dbTasks.length} Database`,
            actions: (
                <>
                    <Button variant="outline" size="sm" onClick={() => { fetchTasks(); fetchDbTasks(); }}
                        className="h-9 dark:border-slate-700">
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', (isLoadingTasks || isLoadingDbTasks) && 'animate-spin')} />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={() => setCreateTaskOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white h-9">
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Task
                    </Button>
                </>
            ),
        });
        return () => clearHeaderContext();
    }, [
        clearHeaderContext,
        dbTasks.length,
        fetchDbTasks,
        fetchTasks,
        isLoadingDbTasks,
        isLoadingTasks,
        pendingCount,
        setHeaderContext,
    ]);

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0 border-y border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50/60 to-white dark:from-slate-950 dark:to-slate-900">
                {/* ── Tab bar ── */}
                <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
                    <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-1.5 w-fit overflow-x-auto border border-violet-100 dark:border-violet-900/40">
                        <button
                            onClick={() => setTab('all-tasks')}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                                tab === 'all-tasks'
                                    ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm ring-1 ring-violet-200/70 dark:ring-violet-800/60'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-300'
                            )}>
                            <List className="h-4 w-4" /> All Tasks
                            {(tasks.length + dbTasks.length) > 0 && (
                                <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 font-bold px-1.5 py-0.5 rounded-full">{tasks.length + dbTasks.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setTab('tasks')}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                                tab === 'tasks'
                                    ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm ring-1 ring-violet-200/70 dark:ring-violet-800/60'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-300'
                            )}>
                            <ClipboardList className="h-4 w-4" /> Google
                            {pendingCount > 0 && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Main Layout ── */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-0 flex-1 min-h-0">

                    {/* ── Sidebar ── */}
                    <aside className="xl:col-span-1 space-y-3 p-4 min-h-0 overflow-y-auto custom-scrollbar border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800 bg-slate-50/85 dark:bg-slate-900/45">
                    {/* Task Lists */}
                    {tab === 'tasks' && (
                        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm bg-white/95 dark:bg-slate-900/80 rounded-2xl">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Task Lists</h3>
                            <div className="space-y-1">
                                {taskLists.length === 0 ? (
                                    <button
                                        onClick={() => fetchTasks('@default')}
                                        className={cn(
                                            'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                                            'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30'
                                        )}>
                                        <div className="flex items-center gap-2.5">
                                            <List className="h-3.5 w-3.5" /> My Tasks
                                        </div>
                                        <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                                    </button>
                                ) : taskLists.map(list => (
                                    <button
                                        key={list.id}
                                        onClick={() => { setCurrentListId(list.id); fetchTasks(list.id); }}
                                        className={cn(
                                            'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                                            currentListId === list.id
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                                        )}>
                                        <div className="flex items-center gap-2.5">
                                            <List className="h-3.5 w-3.5" /> {list.title}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Filters */}
                    {tab === 'tasks' && (
                        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm bg-white/95 dark:bg-slate-900/80 rounded-2xl">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Filter className="h-3 w-3" /> Filter
                            </h3>
                            <div className="space-y-1">
                                {(['all', 'pending', 'completed'] as FilterMode[]).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilterMode(f)}
                                        className={cn(
                                            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all',
                                            filterMode === f
                                                ? 'bg-violet-600 text-white dark:bg-violet-500 dark:text-white'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                                        )}>
                                        {f}
                                        <span className="text-[10px] font-bold">
                                            {f === 'all' ? tasks.length : f === 'pending' ? pendingCount : completedCount}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* AI Planner Card */}
                    <Card className="p-4 border-violet-200/60 dark:border-violet-800/60 bg-gradient-to-br from-violet-700 to-indigo-700 dark:from-violet-800 dark:to-indigo-900 text-white shadow-lg shadow-violet-500/20 rounded-2xl">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur">
                                <Star className="h-4 w-4 text-amber-200" />
                            </div>
                            <h3 className="font-bold text-sm">AI Planner</h3>
                        </div>
                        <p className="text-xs text-violet-100/90 leading-relaxed mb-3">
                            Let AI analyze your tasks and calendar to build the optimal daily schedule.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/planner')}
                            className="w-full text-xs text-white border-white/30 hover:bg-white/15 h-8 bg-white/5">
                            Open Planner <ExternalLink className="h-3 w-3 ml-1.5" />
                        </Button>
                    </Card>
                </aside>

                    {/* ── Main Panel ── */}
                    <div className="xl:col-span-3 p-4 min-h-0 overflow-y-auto custom-scrollbar bg-transparent">
                    {/* Search bar */}
                    <div className="mb-3 relative">
                        <input
                            type="text"
                            placeholder="Search tasks…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white/95 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* All Tasks Tab (Unified View) */}
                    {tab === 'all-tasks' && (
                        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl shadow-sm bg-white/95 dark:bg-slate-900/90">
                            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-50/80 to-transparent dark:from-violet-900/20 dark:to-transparent">
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                    <List className="h-4 w-4 text-purple-500" />
                                    All Tasks (Google + Database)
                                    <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        {tasks.length + dbTasks.length}
                                    </span>
                                </h3>
                            </div>

                            {isLoadingTasks || isLoadingDbTasks ? (
                                <div className="p-6 space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : tasksError || dbTasksError ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                    <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
                                    <p className="font-bold text-slate-700 dark:text-slate-300">Failed to load tasks</p>
                                    <p className="text-sm text-slate-400 mt-1 max-w-xs">{tasksError || dbTasksError}</p>
                                    <Button size="sm" onClick={() => { fetchTasks(); fetchDbTasks(); }} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                                    </Button>
                                </div>
                            ) : tasks.length === 0 && dbTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                                        <CheckSquare className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300">No tasks found</h4>
                                    <p className="text-sm text-slate-400 mt-1">Your Google Tasks and project tasks will appear here.</p>
                                </div>
                            ) : (
                                <div className="divide-y-0 space-y-0">
                                    {/* Google Tasks Section */}
                                    {tasks.length > 0 && (
                                        <>
                                            <div className="px-5 py-2 bg-blue-50/30 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/20">
                                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                                    <CheckCircle className="h-3 w-3" /> Google Tasks ({tasks.length})
                                                </p>
                                            </div>
                                            {tasks.map(task => (
                                                <div key={`google-${task.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all border-b border-slate-100 dark:border-slate-800/60">
                                                    <div className="flex-shrink-0 flex items-center gap-2 mt-1">
                                                        <input type="checkbox" checked={task.status === 'completed'} readOnly className="h-4 w-4 rounded accent-blue-500" />
                                                        <Badge className="h-5 px-1.5 text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-0">Google</Badge>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn('text-sm font-medium', task.status === 'completed' && 'line-through text-slate-400')}>
                                                            {task.title}
                                                        </p>
                                                        {task.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{task.notes.slice(0, 100)}</p>}
                                                        {task.due && formatDue(task.due) && (
                                                            <p className={cn('text-xs font-medium mt-1 px-2 py-0.5 rounded-full w-fit', formatDue(task.due)?.color)}>
                                                                {formatDue(task.due)?.label}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Database Tasks Section */}
                                    {dbTasks.length > 0 && (
                                        <>
                                            {tasks.length > 0 && <div className="h-4" />}
                                            <div className="px-5 py-2 bg-emerald-50/30 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/20">
                                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                                    <CheckCircle className="h-3 w-3" /> Database Tasks ({dbTasks.length})
                                                </p>
                                            </div>
                                            {dbTasks.map(task => (
                                                <div key={`db-${task.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                                                    <div className="flex-shrink-0 flex items-center gap-2 mt-1">
                                                        <input type="checkbox" checked={task.status === 'completed'} readOnly className="h-4 w-4 rounded accent-emerald-500" />
                                                        <Badge className="h-5 px-1.5 text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-0">Database</Badge>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn('text-sm font-medium', task.status === 'completed' && 'line-through text-slate-400')}>
                                                            {task.title}
                                                        </p>
                                                        {task.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{task.description.slice(0, 100)}</p>}
                                                        <div className="flex gap-2 mt-1 flex-wrap">
                                                            {task.priority && (
                                                                <Badge className={cn('h-5 px-1.5 text-[9px] border-0', 
                                                                    task.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                                                                    task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' :
                                                                    task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                                                                    'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                                                )}>
                                                                    {task.priority}
                                                                </Badge>
                                                            )}
                                                            {task.due_date && (
                                                                <Badge className="h-5 px-1.5 text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0">
                                                                    {format(parseISO(task.due_date), 'MMM d')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Tasks Tab */}
                    {tab === 'tasks' && (
                        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl shadow-sm bg-white/95 dark:bg-slate-900/90">
                            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                    <CheckSquare className="h-4 w-4 text-blue-500" />
                                    Google Tasks
                                    <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        {filteredTasks.length}
                                    </span>
                                </h3>
                            </div>

                            {isLoadingTasks ? (
                                <div className="p-6 space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : tasksError ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                    <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
                                    <p className="font-bold text-slate-700 dark:text-slate-300">Failed to load tasks</p>
                                    <p className="text-sm text-slate-400 mt-1 max-w-xs">{tasksError}</p>
                                    <Button size="sm" onClick={() => fetchTasks()} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                                    </Button>
                                </div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                                        <CheckSquare className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300">
                                        {searchQuery ? 'No tasks match your search' : filterMode === 'completed' ? 'No completed tasks' : 'All clear!'}
                                    </h4>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {searchQuery ? 'Try a different search term.' : filterMode === 'pending' ? 'No pending tasks — great work!' : 'Create your first task to get started.'}
                                    </p>
                                    {!searchQuery && (
                                        <Button size="sm" onClick={() => setCreateTaskOpen(true)}
                                            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Task
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y-0">
                                    {filteredTasks.map(task => (
                                        <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}

                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            <CreateTaskModal
                isOpen={createTaskOpen}
                onClose={() => setCreateTaskOpen(false)}
                onCreated={() => fetchTasks()}
                taskLists={taskLists.length > 0 ? taskLists : [{ id: '@default', title: 'My Tasks' }]}
                currentListId={currentListId}
                pushToast={pushToast}
            />
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
