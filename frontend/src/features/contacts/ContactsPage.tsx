import React, { useEffect, useState, useMemo } from 'react';
import {
    Users,
    Search,
    RefreshCw,
    Phone,
    Mail,
    Building2,
    X,
    UserCircle2,
    LayoutGrid,
    LayoutList,
    AlertCircle,
    ChevronRight,
    Copy,
    CheckCheck,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { contactsService } from '../../services/contacts.service';
import { cn } from '../../utils/cn';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Contact {
    name: string;
    email: string;
    phone: string;
    organization: string;
}

// ─── Helper: avatar colour from name ─────────────────────────────────────────
const AVATAR_COLORS = [
    'bg-violet-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-sky-500',
    'bg-pink-500',
    'bg-teal-500',
];

function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() ?? '')
        .join('');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Skeleton card for loading state */
function ContactSkeleton() {
    return (
        <div className="animate-pulse p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800 mx-auto" />
            <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-800 mx-auto" />
            <div className="h-2.5 w-32 rounded-full bg-slate-100 dark:bg-slate-800/60 mx-auto" />
        </div>
    );
}

/** Contact avatar badge */
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
    const color = getAvatarColor(name);
    const sizeClass = size === 'sm' ? 'h-9 w-9 text-sm' : size === 'lg' ? 'h-14 w-14 text-xl' : 'h-11 w-11 text-base';
    return (
        <div className={cn('rounded-full flex items-center justify-center text-white font-bold flex-shrink-0', color, sizeClass)}>
            {getInitials(name) || <UserCircle2 className="h-5 w-5" />}
        </div>
    );
}

/** Copyable info row */
function InfoRow({ icon: Icon, value, href }: { icon: React.ElementType; value: string; href?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault();
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <div className="flex items-center gap-3 group py-2">
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
            {href ? (
                <a href={href} className="text-sm text-brand-600 dark:text-brand-400 hover:underline truncate flex-1">
                    {value}
                </a>
            ) : (
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{value}</span>
            )}
            <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Copy"
            >
                {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
        </div>
    );
}

/** Right-side drawer for contact detail */
function ContactDrawer({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
    if (!contact) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-30"
                onClick={onClose}
            />
            {/* Drawer panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Contact Details</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Avatar + name */}
                    <div className="flex flex-col items-center text-center pt-4 pb-2">
                        <Avatar name={contact.name} size="lg" />
                        <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{contact.name}</h2>
                        {contact.organization && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {contact.organization}
                            </p>
                        )}
                    </div>

                    {/* Contact info */}
                    <div className="space-y-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Contact Information</p>
                        {contact.email ? (
                            <InfoRow icon={Mail} value={contact.email} href={`mailto:${contact.email}`} />
                        ) : (
                            <p className="text-xs text-slate-400 py-1">No email address</p>
                        )}
                        {contact.phone ? (
                            <InfoRow icon={Phone} value={contact.phone} href={`tel:${contact.phone}`} />
                        ) : (
                            <p className="text-xs text-slate-400 py-1">No phone number</p>
                        )}
                        {contact.organization && (
                            <InfoRow icon={Building2} value={contact.organization} />
                        )}
                    </div>

                    {/* Quick actions */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Quick Actions</p>
                        {contact.email && (
                            <a
                                href={`mailto:${contact.email}`}
                                className="flex items-center justify-between w-full px-4 py-3 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-xl font-medium text-sm hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" /> Send Email
                                </span>
                                <ChevronRight className="h-4 w-4" />
                            </a>
                        )}
                        {contact.phone && (
                            <a
                                href={`tel:${contact.phone}`}
                                className="flex items-center justify-between w-full px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl font-medium text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" /> Call
                                </span>
                                <ChevronRight className="h-4 w-4" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [filterLetter, setFilterLetter] = useState<string>('All');

    // ── Fetch all contacts ──
    const fetchContacts = async () => {
        setIsLoading(true);
        setError(null);
        setSearchQuery('');
        setFilterLetter('All');
        try {
            const response = await contactsService.getContacts(100);
            setContacts(response.data.contacts || []);
        } catch (err: any) {
            setError(err?.message || 'Failed to load contacts. Make sure Google account is connected.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Search contacts ──
    const handleSearch = async () => {
        if (!searchQuery.trim()) return fetchContacts();
        setIsSearching(true);
        setError(null);
        try {
            const response = await contactsService.searchContacts(searchQuery.trim());
            setContacts(response.data.contacts || []);
            setFilterLetter('All');
        } catch (err: any) {
            setError(err?.message || 'Search failed.');
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    // Allow pressing Enter to search
    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
        if (e.key === 'Escape') {
            setSearchQuery('');
            fetchContacts();
        }
    };

    // ── Client-side filter by letter ──
    const alphabet = useMemo(() => {
        const letters = new Set(contacts.map((c) => c.name[0]?.toUpperCase()).filter(Boolean));
        return ['All', ...Array.from(letters).sort()];
    }, [contacts]);

    const filteredContacts = useMemo(() => {
        if (filterLetter === 'All') return contacts;
        return contacts.filter((c) => c.name[0]?.toUpperCase() === filterLetter);
    }, [contacts, filterLetter]);

    const isbusy = isLoading || isSearching;

    // ── Render ──
    return (
        <div className="flex flex-col space-y-6 h-full">
            {/* ── Header ── */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        Contacts
                        <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            Google People
                        </Badge>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Manage and browse your Google Contacts.
                        {contacts.length > 0 && !isLoading && (
                            <span className="ml-2 font-semibold text-slate-700 dark:text-slate-300">{contacts.length} contacts</span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                'p-2 transition-colors',
                                viewMode === 'grid'
                                    ? 'bg-slate-900 dark:bg-slate-700 text-white'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                            )}
                            title="Grid view"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                'p-2 transition-colors',
                                viewMode === 'list'
                                    ? 'bg-slate-900 dark:bg-slate-700 text-white'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                            )}
                            title="List view"
                        >
                            <LayoutList className="h-4 w-4" />
                        </button>
                    </div>

                    <Button variant="outline" onClick={fetchContacts} className="dark:border-slate-700" disabled={isbusy}>
                        <RefreshCw className={cn('h-4 w-4 mr-2', isbusy && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </header>

            {/* ── Search Bar ── */}
            <div className="flex gap-2">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search contacts by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => { setSearchQuery(''); fetchContacts(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <Button
                    onClick={handleSearch}
                    disabled={isbusy}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5"
                >
                    {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">Search</span>
                </Button>
            </div>

            {/* ── Alphabet Filter ── */}
            {!isLoading && !error && contacts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {alphabet.map((letter) => (
                        <button
                            key={letter}
                            onClick={() => setFilterLetter(letter)}
                            className={cn(
                                'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                                filterLetter === letter
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            )}
                        >
                            {letter}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Content ── */}
            {error ? (
                /* Error state */
                <Card className="flex flex-col items-center justify-center py-16 border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Could not load contacts</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm text-center">{error}</p>
                    <Button onClick={fetchContacts} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white">
                        <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                    </Button>
                </Card>
            ) : isLoading ? (
                /* Loading skeleton */
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {Array.from({ length: 10 }).map((_, i) => <ContactSkeleton key={i} />)}
                    </div>
                ) : (
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
                                    <div className="h-2.5 w-48 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </Card>
                )
            ) : filteredContacts.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-5">
                        <Users className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">No contacts found</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs">
                        {searchQuery
                            ? `No results for "${searchQuery}". Try a different name.`
                            : 'Your Google Contacts list appears to be empty.'}
                    </p>
                    {(searchQuery || filterLetter !== 'All') && (
                        <Button
                            variant="outline"
                            className="mt-5 dark:border-slate-700"
                            onClick={() => { setSearchQuery(''); setFilterLetter('All'); fetchContacts(); }}
                        >
                            Clear Filters
                        </Button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                /* ── Grid View ── */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredContacts.map((contact, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedContact(contact)}
                            className="group p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-900 hover:shadow-md transition-all text-center flex flex-col items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                            <Avatar name={contact.name} size="md" />
                            <div className="min-w-0 w-full">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {contact.name}
                                </p>
                                {contact.organization && (
                                    <p className="text-xs text-slate-400 truncate mt-0.5">{contact.organization}</p>
                                )}
                                {contact.email && (
                                    <p className="text-xs text-slate-400 truncate mt-0.5">{contact.email}</p>
                                )}
                            </div>
                            <div className="flex gap-1 flex-wrap justify-center">
                                {contact.email && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                                        <Mail className="h-2.5 w-2.5" /> Email
                                    </span>
                                )}
                                {contact.phone && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                                        <Phone className="h-2.5 w-2.5" /> Phone
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                /* ── List View ── */
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredContacts.map((contact, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedContact(contact)}
                                className="w-full group flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all text-left focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/40"
                            >
                                <Avatar name={contact.name} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {contact.name}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {contact.email || contact.phone || contact.organization || 'No additional info'}
                                    </p>
                                </div>
                                {contact.organization && (
                                    <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400 max-w-[150px] truncate">
                                        <Building2 className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{contact.organization}</span>
                                    </span>
                                )}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {contact.email && (
                                        <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center" title={contact.email}>
                                            <Mail className="h-3.5 w-3.5 text-blue-500" />
                                        </div>
                                    )}
                                    {contact.phone && (
                                        <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center" title={contact.phone}>
                                            <Phone className="h-3.5 w-3.5 text-emerald-500" />
                                        </div>
                                    )}
                                    <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors ml-1" />
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-400 font-medium">
                            Showing {filteredContacts.length} of {contacts.length} contacts
                            {filterLetter !== 'All' && ` • Filtered by "${filterLetter}"`}
                        </p>
                    </div>
                </Card>
            )}

            {/* ── Drawer ── */}
            <ContactDrawer contact={selectedContact} onClose={() => setSelectedContact(null)} />
        </div>
    );
}
