import React, { useEffect, useState, useRef } from 'react';
import {
    StickyNote, Plus, Trash2, Pencil, Save, X, Loader2,
    Search, FileText, AlertCircle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { cn } from '../../utils/cn';
import { notesService, Note } from './notes.service';

export function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Create / Edit state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formContent, setFormContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Delete
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const titleRef = useRef<HTMLInputElement>(null);

    // ── Fetch ──
    useEffect(() => {
        loadNotes();
    }, []);

    const loadNotes = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await notesService.list();
            setNotes(data);
        } catch (e: any) {
            setError(e.message || 'Failed to load notes');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Create / Update ──
    const openCreate = () => {
        setEditingId(null);
        setFormTitle('');
        setFormContent('');
        setShowForm(true);
        setTimeout(() => titleRef.current?.focus(), 100);
    };

    const openEdit = (note: Note) => {
        setEditingId(note.id);
        setFormTitle(note.title);
        setFormContent(note.content);
        setShowForm(true);
        setTimeout(() => titleRef.current?.focus(), 100);
    };

    const handleSave = async () => {
        if (!formTitle.trim()) return;
        setIsSaving(true);
        try {
            if (editingId) {
                await notesService.update(editingId, formTitle.trim(), formContent.trim());
            } else {
                await notesService.create(formTitle.trim(), formContent.trim());
            }
            setShowForm(false);
            loadNotes();
        } catch (e: any) {
            setError(e.message || 'Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Delete ──
    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await notesService.remove(deleteId);
            setNotes(prev => prev.filter(n => n.id !== deleteId));
        } catch (e: any) {
            setError(e.message || 'Delete failed');
        }
        setDeleteId(null);
    };

    // ── Filter ──
    const filtered = notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Notes</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Synced with Google Tasks — <span className="font-medium">AI Agent Notes</span> list.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search notes…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                    <Button onClick={openCreate} className="bg-brand-600 hover:bg-brand-700 text-white">
                        <Plus className="h-4 w-4 mr-2" /> New Note
                    </Button>
                </div>
            </header>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Create / Edit Form */}
            {showForm && (
                <Card className="p-6 border-brand-200 dark:border-brand-900/40 shadow-md">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {editingId ? 'Edit Note' : 'New Note'}
                    </h3>
                    <div className="space-y-3">
                        <input
                            ref={titleRef}
                            type="text"
                            placeholder="Note title"
                            value={formTitle}
                            onChange={e => setFormTitle(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                        <textarea
                            placeholder="Note content (optional)"
                            value={formContent}
                            onChange={e => setFormContent(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                        />
                        <div className="flex items-center gap-2">
                            <Button onClick={handleSave} disabled={isSaving || !formTitle.trim()} className="bg-brand-600 hover:bg-brand-700 text-white">
                                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                {editingId ? 'Update' : 'Create'}
                            </Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Notes Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="p-5 animate-pulse">
                            <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded mb-3" />
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded mb-2" />
                            <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
                        </Card>
                    ))}
                </div>
            ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(note => (
                        <Card key={note.id} className="p-5 group hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                                        <StickyNote className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{note.title}</h4>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(note)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-600">
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => setDeleteId(note.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                {note.content || <span className="italic text-slate-400">No content</span>}
                            </p>
                            {note.created && (
                                <p className="text-[10px] text-slate-400 mt-3">
                                    {new Date(note.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="py-16 text-center">
                    <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {search ? 'No notes match your search.' : 'No notes yet. Create your first note!'}
                    </p>
                </Card>
            )}

            {/* Delete confirmation */}
            <ConfirmationDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Delete Note?"
                description="This will permanently remove the note from Google Tasks."
                confirmText="Yes, Delete"
                variant="danger"
            />
        </div>
    );
}
