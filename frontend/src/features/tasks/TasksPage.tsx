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

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Task {
    id: string;
    title: string;
    notes?: string;
    due?: string;
    status: 'needsAction' | 'completed';
    updated?: string;
    parent?: string;
}

interface TaskList {
    id: string;
    title: string;
    updated?: string;
}

interface Note {
    id: string;
    title: string;
    content?: string;
    created?: string;
    status?: string;
}

type TabView = 'tasks' | 'notes';
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
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Notes</label>
                        <textarea rows={3} placeholder="Optional description…" value={notes} onChange={e => setNotes(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Due Date</label>
                            <input type="date" value={due} onChange={e => setDue(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">List</label>
                            <select value={listId} onChange={e => setListId(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                                {taskLists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                            </select>
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-500 font-medium flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> {error}</p>}
                </div>
                <div className="flex justify-end gap-2 px-5 pb-5">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button size="sm" onClick={handleCreate} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[110px]">
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
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isLoadingNotes, setIsLoadingNotes] = useState(true);
    const [tasksError, setTasksError] = useState<string | null>(null);
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
            setTasks(t);
        } catch (e: any) {
            setTasksError(e?.message || 'Could not load tasks.');
        } finally { setIsLoadingTasks(false); }
    }, [currentListId, filterMode]);

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
    useEffect(() => { if (tab === 'notes') fetchNotes(); }, [tab, fetchNotes]);

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

    return (
        <div className="space-y-6 pb-12">
            {/* ── Header ── */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tasks & Notes</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
                        {pendingCount} pending · {completedCount} completed · {notes.length} notes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { fetchTasks(); if (tab === 'notes') fetchNotes(); }}
                        className="h-9 dark:border-slate-700">
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', (isLoadingTasks || isLoadingNotes) && 'animate-spin')} />
                        Refresh
                    </Button>
                    {tab === 'tasks' ? (
                        <Button size="sm" onClick={() => setCreateTaskOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Task
                        </Button>
                    ) : (
                        <Button size="sm" onClick={() => setCreateNoteOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white h-9">
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Note
                        </Button>
                    )}
                </div>
            </header>

            {/* ── Tab bar ── */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 w-fit">
                <button
                    onClick={() => setTab('tasks')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                        tab === 'tasks'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    )}>
                    <ClipboardList className="h-4 w-4" /> Tasks
                    {pendingCount > 0 && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                    )}
                </button>
                <button
                    onClick={() => setTab('notes')}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                        tab === 'notes'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    )}>
                    <StickyNote className="h-4 w-4" /> Notes
                    {notes.length > 0 && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded-full">{notes.length}</span>
                    )}
                </button>
            </div>

            {/* ── Main Layout ── */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* ── Sidebar ── */}
                <aside className="xl:col-span-1 space-y-4">
                    {/* Task Lists */}
                    {tab === 'tasks' && (
                        <Card className="p-4 border-slate-200 dark:border-slate-800">
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
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                        <Card className="p-4 border-slate-200 dark:border-slate-800">
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
                                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                    <Card className="p-4 border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-800 text-white">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="bg-amber-400/20 p-1.5 rounded-lg">
                                <Star className="h-4 w-4 text-amber-400" />
                            </div>
                            <h3 className="font-bold text-sm">AI Planner</h3>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-3">
                            Let AI analyze your tasks and calendar to build the optimal daily schedule.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/planner')}
                            className="w-full text-xs text-white border-white/20 hover:bg-white/10 h-8">
                            Open Planner <ExternalLink className="h-3 w-3 ml-1.5" />
                        </Button>
                    </Card>
                </aside>

                {/* ── Main Panel ── */}
                <div className="xl:col-span-3">
                    {/* Search bar */}
                    <div className="mb-4 relative">
                        <input
                            type="text"
                            placeholder={tab === 'tasks' ? 'Search tasks…' : 'Search notes…'}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Tasks Tab */}
                    {tab === 'tasks' && (
                        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                    <CheckSquare className="h-4 w-4 text-blue-500" />
                                    {filterMode === 'all' ? 'All Tasks' : filterMode === 'pending' ? 'Pending Tasks' : 'Completed Tasks'}
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

                    {/* Notes Tab */}
                    {tab === 'notes' && (
                        <div>
                            {isLoadingNotes ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : notesError ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
                                    <p className="font-bold text-slate-700 dark:text-slate-300">Failed to load notes</p>
                                    <p className="text-sm text-slate-400 mt-1 max-w-xs">{notesError}</p>
                                    <Button size="sm" onClick={fetchNotes} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">
                                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                                    </Button>
                                </div>
                            ) : filteredNotes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="h-16 w-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-4">
                                        <FileText className="h-8 w-8 text-amber-300" />
                                    </div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300">
                                        {searchQuery ? 'No notes match your search' : 'No notes yet'}
                                    </h4>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {searchQuery ? 'Try a different search term.' : 'Capture ideas, reminders and more.'}
                                    </p>
                                    {!searchQuery && (
                                        <Button size="sm" onClick={() => setCreateNoteOpen(true)}
                                            className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">
                                            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Note
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredNotes.map(note => (
                                        <NoteCard key={note.id} note={note} onDelete={handleDeleteNote} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
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
            <CreateNoteModal
                isOpen={createNoteOpen}
                onClose={() => setCreateNoteOpen(false)}
                onCreated={fetchNotes}
                pushToast={pushToast}
            />
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
