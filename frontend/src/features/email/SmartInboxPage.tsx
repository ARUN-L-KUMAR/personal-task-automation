import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Mail, Search, RefreshCw, Star, Trash2, Send,
    Sparkles, AlertCircle, X, ChevronLeft, Inbox,
    Clock, ArrowLeft, Loader2, CheckCircle2, XCircle,
    Reply, Forward, MoreHorizontal, PenSquare,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { emailService } from '../../services/email.service';
import { cn } from '../../utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Email {
    id: string;
    from: string;
    subject: string;
    date: string;
    snippet: string;
    is_unread: boolean;
    labels: string[];
}

interface EmailDetail {
    id: string;
    from: string;
    to: string;
    subject: string;
    date: string;
    body: string;
    snippet: string;
    labels: string[];
}

type FolderKey = 'inbox' | 'unread' | 'starred' | 'sent' | 'spam';

interface Folder {
    key: FolderKey;
    label: string;
    icon: React.ElementType;
    query: string;
    color: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const FOLDERS: Folder[] = [
    { key: 'inbox', label: 'Inbox', icon: Inbox, query: 'in:inbox', color: 'text-blue-500' },
    { key: 'unread', label: 'Unread', icon: Mail, query: 'is:unread', color: 'text-violet-500' },
    { key: 'starred', label: 'Starred', icon: Star, query: 'is:starred', color: 'text-amber-500' },
    { key: 'sent', label: 'Sent', icon: Send, query: 'in:sent', color: 'text-emerald-500' },
    { key: 'spam', label: 'Spam', icon: AlertCircle, query: 'in:spam', color: 'text-red-500' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(raw: string): string {
    if (!raw) return '';
    try {
        const d = new Date(raw);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
        return raw.slice(0, 10);
    }
}

function senderInitials(from: string): string {
    const name = from.replace(/<.*?>/, '').trim() || from;
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function senderName(from: string): string {
    const m = from.match(/^"?([^"<]+)"?\s*</);
    return m ? m[1].trim() : from.split('@')[0];
}

const AVATAR_PALETTE = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-pink-500', 'bg-teal-500',
];
function avatarColor(from: string) {
    let h = 0;
    for (let i = 0; i < from.length; i++) h = from.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastMsg { id: number; type: 'success' | 'error'; text: string }
let toastId = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: number) => void }) {
    return (
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white pointer-events-auto animate-in slide-in-from-bottom-4',
                        t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                    )}
                >
                    {t.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
                    <span>{t.text}</span>
                    <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-70 hover:opacity-100">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
interface ComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSent: () => void;
    defaultTo?: string;
    defaultSubject?: string;
}

function ComposeModal({ isOpen, onClose, onSent, defaultTo = '', defaultSubject = '' }: ComposeModalProps) {
    const [to, setTo] = useState(defaultTo);
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    // Reset when opened
    useEffect(() => {
        if (isOpen) { setTo(defaultTo); setSubject(defaultSubject); setBody(''); setError(''); }
    }, [isOpen, defaultTo, defaultSubject]);

    const handleSend = async () => {
        if (!to.trim()) { setError('Recipient email is required.'); return; }
        if (!subject.trim()) { setError('Subject cannot be empty.'); return; }
        if (!body.trim()) { setError('Email body cannot be empty.'); return; }
        setError('');
        setIsSending(true);
        try {
            await emailService.sendEmail(to.trim(), subject.trim(), body.trim());
            onSent();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to send email. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2">
                        <PenSquare className="h-4 w-4 text-blue-500" />
                        <span className="font-bold text-slate-800 dark:text-white text-sm">New Message</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Fields */}
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="flex items-center px-5 py-3 gap-3">
                        <span className="text-xs font-semibold text-slate-400 w-14">To</span>
                        <input
                            type="email"
                            placeholder="recipient@email.com"
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder:text-slate-400 outline-none"
                        />
                    </div>
                    <div className="flex items-center px-5 py-3 gap-3">
                        <span className="text-xs font-semibold text-slate-400 w-14">Subject</span>
                        <input
                            type="text"
                            placeholder="Email subject"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder:text-slate-400 outline-none"
                        />
                    </div>
                </div>

                {/* Body */}
                <textarea
                    placeholder="Write your message here..."
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={8}
                    className="w-full px-5 py-4 bg-transparent text-sm text-slate-800 dark:text-white placeholder:text-slate-400 outline-none resize-none custom-scrollbar"
                />

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex-1">
                        {error && (
                            <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                                <XCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={onClose} disabled={isSending}>Cancel</Button>
                        <Button
                            size="sm"
                            onClick={handleSend}
                            disabled={isSending}
                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[90px]"
                        >
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                            {isSending ? 'Sending…' : 'Send'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Email Detail Panel ───────────────────────────────────────────────────────
interface EmailDetailPanelProps {
    emailId: string;
    onClose: () => void;
    onReply: (to: string, subject: string) => void;
}

function EmailDetailPanel({ emailId, onClose, onReply }: EmailDetailPanelProps) {
    const [detail, setDetail] = useState<EmailDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setIsLoading(true);
        setError('');
        setDetail(null);
        emailService.getEmail(emailId)
            .then(res => setDetail(res.data.email))
            .catch(err => setError(err?.message || 'Could not load email.'))
            .finally(() => setIsLoading(false));
    }, [emailId]);

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>
                {detail && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => onReply(detail.from, `Re: ${detail.subject}`)}
                            className="text-xs gap-1.5 h-8"
                        >
                            <Reply className="h-3.5 w-3.5" /> Reply
                        </Button>
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => onReply('', `Fwd: ${detail.subject}`)}
                            className="text-xs gap-1.5 h-8"
                        >
                            <Forward className="h-3.5 w-3.5" /> Forward
                        </Button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8">
                {isLoading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                        <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-6" />
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className={`h-3 bg-slate-100 dark:bg-slate-800/60 rounded-full w-${i % 2 === 0 ? 'full' : '5/6'}`} />)}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                        <XCircle className="h-12 w-12 text-red-400 mb-4" />
                        <p className="text-sm text-slate-500">{error}</p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
                    </div>
                ) : detail ? (
                    <>
                        {/* Email header */}
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">{detail.subject}</h2>
                        <div className="flex items-start gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
                            <div className={cn('h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0', avatarColor(detail.from))}>
                                {senderInitials(detail.from)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{senderName(detail.from)}</span>
                                    <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(detail.date)}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{detail.from}</p>
                                {detail.to && (
                                    <p className="text-xs text-slate-400 mt-0.5">To: {detail.to}</p>
                                )}
                            </div>
                        </div>

                        {/* Labels */}
                        {detail.labels.filter(l => !['INBOX', 'UNREAD', 'CATEGORY_PERSONAL'].includes(l)).length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mt-3">
                                {detail.labels.filter(l => !['INBOX', 'UNREAD', 'CATEGORY_PERSONAL'].includes(l)).map(l => (
                                    <span key={l} className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                        {l.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Body */}
                        <div className="mt-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words font-normal">
                            {detail.body || detail.snippet || 'No message body available.'}
                        </div>

                        {/* Reply CTA */}
                        <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => onReply(detail.from, `Re: ${detail.subject}`)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Reply className="h-4 w-4 mr-1.5" /> Reply
                            </Button>
                            <Button
                                variant="outline" size="sm"
                                onClick={() => onReply('', `Fwd: ${detail.subject}`)}
                                className="dark:border-slate-700"
                            >
                                <Forward className="h-4 w-4 mr-1.5" /> Forward
                            </Button>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function SmartInboxPage() {
    const [emails, setEmails] = useState<Email[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeFolder, setActiveFolder] = useState<FolderKey>('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [liveFilter, setLiveFilter] = useState('');         // client-side instant filter
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

    const [composeOpen, setComposeOpen] = useState(false);
    const [composeDefaults, setComposeDefaults] = useState({ to: '', subject: '' });

    const [toasts, setToasts] = useState<ToastMsg[]>([]);

    // ── Toasts ──
    const pushToast = (type: 'success' | 'error', text: string) => {
        const id = ++toastId;
        setToasts(p => [...p, { id, type, text }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    };

    // ── Fetch emails (uses Gmail query) ──
    const fetchEmails = useCallback(async (folder: FolderKey, query = '') => {
        setIsLoading(true);
        setError(null);
        setSelectedEmailId(null);
        try {
            const folder_obj = FOLDERS.find(f => f.key === folder)!;
            const gmailQuery = query.trim() ? query.trim() : folder_obj.query;
            const response = await emailService.getInbox(20, gmailQuery);
            setEmails(response.data.emails || []);
        } catch (err: any) {
            setError(err?.message || 'Failed to load emails. Ensure Google account is connected.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEmails(activeFolder);
    }, [activeFolder, fetchEmails]);

    // ── Search: Enter key triggers backend search ──
    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            fetchEmails(activeFolder, searchQuery);
        }
        if (e.key === 'Escape') {
            setSearchQuery('');
            setLiveFilter('');
            fetchEmails(activeFolder);
        }
    };

    // ── Client-side filter from search input (instant) ──
    const displayedEmails = liveFilter
        ? emails.filter(e =>
            e.subject?.toLowerCase().includes(liveFilter.toLowerCase()) ||
            e.from?.toLowerCase().includes(liveFilter.toLowerCase()) ||
            e.snippet?.toLowerCase().includes(liveFilter.toLowerCase())
        )
        : emails;

    // ── Compose helpers ──
    const openCompose = (to = '', subject = '') => {
        setComposeDefaults({ to, subject });
        setComposeOpen(true);
    };

    const handleSent = () => {
        pushToast('success', 'Email sent successfully!');
        if (activeFolder === 'sent') fetchEmails('sent');
    };

    // ── Folder change ──
    const switchFolder = (key: FolderKey) => {
        setActiveFolder(key);
        setSearchQuery('');
        setLiveFilter('');
    };

    const currentFolder = FOLDERS.find(f => f.key === activeFolder)!;

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] space-y-0 overflow-hidden">

            {/* ── Page Header ── */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        Smart Inbox
                        <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none text-[11px]">
                            <Sparkles className="h-3 w-3 mr-1" /> Gmail
                        </Badge>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
                        Real-time Gmail inbox — read, search and compose.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchEmails(activeFolder, searchQuery || '')}
                        disabled={isLoading}
                        className="dark:border-slate-700 h-9"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isLoading && 'animate-spin')} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => openCompose()}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-9"
                    >
                        <PenSquare className="h-3.5 w-3.5 mr-1.5" /> Compose
                    </Button>
                </div>
            </header>

            {/* ── Main Panel ── */}
            <div className="flex flex-1 gap-4 overflow-hidden min-h-0">

                {/* ── Sidebar ── */}
                <aside className="hidden md:flex flex-col w-52 flex-shrink-0 gap-2">
                    <nav className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2 space-y-0.5">
                        {FOLDERS.map(folder => (
                            <button
                                key={folder.key}
                                onClick={() => switchFolder(folder.key)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                                    activeFolder === folder.key
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                )}
                            >
                                <folder.icon className={cn('h-4 w-4 flex-shrink-0', activeFolder === folder.key ? 'text-white' : folder.color)} />
                                {folder.label}
                            </button>
                        ))}
                    </nav>

                    {/* Tips */}
                    <div className="mt-auto bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-900/40">
                        <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3" /> Gmail Search Tips
                        </p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400/80 leading-relaxed">
                            Press <kbd className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-[9px]">Enter</kbd> to search with Gmail syntax.<br />
                            Try: <code className="text-[10px]">from:boss@gmail.com</code><br />
                            Or: <code className="text-[10px]">subject:invoice</code>
                        </p>
                    </div>
                </aside>

                {/* ── Email Panel ── */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">

                    {selectedEmailId ? (
                        /* ── Email Detail ── */
                        <EmailDetailPanel
                            emailId={selectedEmailId}
                            onClose={() => setSelectedEmailId(null)}
                            onReply={(to, subject) => { setSelectedEmailId(null); openCompose(to, subject); }}
                        />
                    ) : (
                        <>
                            {/* ── Toolbar ── */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder={`Search in ${currentFolder.label}… (Enter for Gmail search)`}
                                        value={searchQuery}
                                        onChange={e => {
                                            setSearchQuery(e.target.value);
                                            setLiveFilter(e.target.value);
                                        }}
                                        onKeyDown={handleSearch}
                                        className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => { setSearchQuery(''); setLiveFilter(''); fetchEmails(activeFolder); }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                <span className="text-xs text-slate-400 font-medium flex-shrink-0">
                                    {isLoading ? '…' : `${displayedEmails.length} emails`}
                                </span>
                            </div>

                            {/* ── Mobile folder tabs ── */}
                            <div className="flex md:hidden gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto flex-shrink-0">
                                {FOLDERS.map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => switchFolder(f.key)}
                                        className={cn(
                                            'flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all',
                                            activeFolder === f.key
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* ── Email List ── */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {isLoading ? (
                                    <div className="p-4 space-y-1">
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                                                <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex gap-2">
                                                        <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded-full" />
                                                        <div className="h-3 w-12 bg-slate-100 dark:bg-slate-800/60 rounded-full ml-auto" />
                                                    </div>
                                                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800/60 rounded-full" />
                                                    <div className="h-2 w-4/5 bg-slate-100 dark:bg-slate-800/40 rounded-full" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : error ? (
                                    <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                                        <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
                                            <AlertCircle className="h-8 w-8 text-red-400" />
                                        </div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">Failed to load emails</h3>
                                        <p className="text-sm text-slate-500 mt-1 max-w-xs">{error}</p>
                                        <Button
                                            size="sm"
                                            onClick={() => fetchEmails(activeFolder)}
                                            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try Again
                                        </Button>
                                    </div>
                                ) : displayedEmails.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                                        <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                                            <Mail className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">
                                            {searchQuery ? `No results for "${searchQuery}"` : `${currentFolder.label} is empty`}
                                        </h3>
                                        <p className="text-sm text-slate-400 mt-1">
                                            {searchQuery ? 'Try a different query or press Esc to clear.' : 'Nothing here yet.'}
                                        </p>
                                        {searchQuery && (
                                            <Button variant="outline" size="sm" className="mt-3 dark:border-slate-700"
                                                onClick={() => { setSearchQuery(''); setLiveFilter(''); fetchEmails(activeFolder); }}>
                                                Clear Search
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                        {displayedEmails.map((email) => (
                                            <button
                                                key={email.id}
                                                onClick={() => setSelectedEmailId(email.id)}
                                                className={cn(
                                                    'w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/40',
                                                    email.is_unread && 'bg-blue-50/40 dark:bg-blue-900/10'
                                                )}
                                            >
                                                {/* Unread dot */}
                                                <div className="pt-1.5 flex-shrink-0 w-2">
                                                    {email.is_unread && (
                                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                    )}
                                                </div>

                                                {/* Avatar */}
                                                <div className={cn(
                                                    'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0',
                                                    avatarColor(email.from)
                                                )}>
                                                    {senderInitials(email.from)}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className={cn(
                                                            'text-sm truncate max-w-[60%]',
                                                            email.is_unread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'
                                                        )}>
                                                            {senderName(email.from)}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">
                                                            {formatDate(email.date)}
                                                        </span>
                                                    </div>
                                                    <p className={cn(
                                                        'text-[13px] truncate mb-0.5',
                                                        email.is_unread ? 'font-semibold text-slate-800 dark:text-slate-200' : 'font-normal text-slate-600 dark:text-slate-400'
                                                    )}>
                                                        {email.subject || '(No Subject)'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                                        {email.snippet}
                                                    </p>
                                                </div>

                                                {/* Hover action */}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center">
                                                    <ChevronLeft className="h-4 w-4 text-slate-300 rotate-180" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Status bar ── */}
                            {!isLoading && !error && (
                                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between flex-shrink-0">
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        {currentFolder.label} · {displayedEmails.length} of {emails.length} messages
                                        {liveFilter && ` · filtered by "${liveFilter}"`}
                                    </span>
                                    <button
                                        onClick={() => fetchEmails(activeFolder)}
                                        className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold transition-colors flex items-center gap-1"
                                    >
                                        <Clock className="h-3 w-3" /> Load more
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Compose Modal ── */}
            <ComposeModal
                isOpen={composeOpen}
                onClose={() => setComposeOpen(false)}
                onSent={handleSent}
                defaultTo={composeDefaults.to}
                defaultSubject={composeDefaults.subject}
            />

            {/* ── Toast notifications ── */}
            <ToastContainer toasts={toasts} onDismiss={id => setToasts(p => p.filter(t => t.id !== id))} />
        </div>
    );
}
