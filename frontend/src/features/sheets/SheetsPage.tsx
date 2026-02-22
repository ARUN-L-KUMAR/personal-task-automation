import React, { useCallback, useEffect, useState } from 'react';
import {
    FileSpreadsheet, Plus, RefreshCw, Search, ExternalLink,
    Link2, CheckCircle2, AlertCircle, X, Loader2, XCircle,
    CheckCircle, Table2, BarChart3, Rows, Columns, ChevronDown,
    Download, Pencil, Trash2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { sheetsService } from '../../services/sheets.service';
import { cn } from '../../utils/cn';
import { format, parseISO } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DriveSheet {
    id: string;
    name: string;
    modified: string;
    owner: string;
    link: string;
}

interface SheetData {
    headers: string[];
    data: string[][];
    rows: number;
    spreadsheet_id: string;
    range: string;
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

// ─── Connect Modal ──────────────────────────────────────────────────────────────
function ConnectModal({ isOpen, onClose, onConnect, pushToast }: {
    isOpen: boolean; onClose: () => void;
    onConnect: (id: string, range: string) => void;
    pushToast: (t: 'success' | 'error', m: string) => void;
}) {
    const [idInput, setIdInput] = useState('');
    const [rangeInput, setRangeInput] = useState('Sheet1');
    const [error, setError] = useState('');

    useEffect(() => { if (isOpen) { setIdInput(''); setRangeInput('Sheet1'); setError(''); } }, [isOpen]);

    const handle = () => {
        const id = idInput.trim();
        if (!id) { setError('Please enter a Spreadsheet ID.'); return; }
        // Extract ID from URL if full URL pasted
        const match = id.match(/\/spreadsheets\/d\/([^/]+)/);
        const finalId = match ? match[1] : id;
        onConnect(finalId, rangeInput.trim() || 'Sheet1');
        onClose();
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-900/20">
                    <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold text-slate-800 dark:text-white text-sm">Connect a Spreadsheet</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/40 text-slate-400 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Spreadsheet ID or URL *</label>
                        <input autoFocus type="text" value={idInput} onChange={e => setIdInput(e.target.value)}
                            placeholder="Paste URL or Spreadsheet ID"
                            onKeyDown={e => e.key === 'Enter' && handle()}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                            Find the ID in your Sheet URL:{' '}
                            <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-500">
                                docs.google.com/spreadsheets/d/<strong className="text-emerald-600">[ID]</strong>/edit
                            </code>
                        </p>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Range</label>
                        <input type="text" value={rangeInput} onChange={e => setRangeInput(e.target.value)}
                            placeholder="e.g. Sheet1 or Sheet1!A1:D20"
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                    </div>
                    {error && <p className="text-xs text-red-500 font-medium flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> {error}</p>}
                </div>
                <div className="flex justify-end gap-2 px-5 pb-5">
                    <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" onClick={handle} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]">
                        <Link2 className="h-3.5 w-3.5 mr-1.5" /> Connect & Load
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Append Row Modal ───────────────────────────────────────────────────────────
function AppendRowModal({ isOpen, onClose, headers, spreadsheetId, rangeName, pushToast, onAppended }: {
    isOpen: boolean; onClose: () => void;
    headers: string[]; spreadsheetId: string; rangeName: string;
    pushToast: (t: 'success' | 'error', m: string) => void;
    onAppended: () => void;
}) {
    const [values, setValues] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => { if (isOpen) setValues(headers.map(() => '')); }, [isOpen, headers]);

    const handleAppend = async () => {
        setIsLoading(true);
        try {
            await sheetsService.appendRows(spreadsheetId, rangeName, [values]);
            pushToast('success', 'Row appended successfully!');
            onAppended(); onClose();
        } catch (e: any) {
            pushToast('error', e?.message || 'Failed to append row.');
        } finally { setIsLoading(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-500" />
                        <span className="font-bold text-slate-800 dark:text-white text-sm">Append New Row</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-5 space-y-3">
                    {headers.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No headers detected — data will be added as a raw row.</p>
                    ) : (
                        headers.map((h, i) => (
                            <div key={i}>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">{h || `Column ${i + 1}`}</label>
                                <input type="text" value={values[i] || ''} onChange={e => setValues(v => { const n = [...v]; n[i] = e.target.value; return n; })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                            </div>
                        ))
                    )}
                    {headers.length === 0 && (
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Values (comma-separated)</label>
                            <input type="text" placeholder="val1, val2, val3" onChange={e => setValues(e.target.value.split(',').map(s => s.trim()))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 px-5 pb-5">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button size="sm" onClick={handleAppend} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                        {isLoading ? 'Appending…' : 'Append Row'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Export CSV ────────────────────────────────────────────────────────────────
function exportCsv(data: SheetData) {
    const rows = [data.headers, ...data.data];
    const csv = rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sheet-${data.spreadsheet_id.slice(0, 8)}.csv`;
    a.click(); URL.revokeObjectURL(url);
}

// ─── Sheet Data Table ───────────────────────────────────────────────────────────
function SheetTable({ data, onRefresh, onDisconnect, onAppendRow }: {
    data: SheetData;
    onRefresh: () => void;
    onDisconnect: () => void;
    onAppendRow: () => void;
}) {
    const [search, setSearch] = useState('');
    const filtered = search
        ? data.data.filter(row => row.some(c => c?.toLowerCase().includes(search.toLowerCase())))
        : data.data;

    return (
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-emerald-50/50 dark:bg-emerald-900/10">
                <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                            {filtered.length} of {data.rows} rows
                            {search && <span className="text-xs font-normal text-slate-400 ml-2">filtered</span>}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">{data.spreadsheet_id.slice(0, 20)}…</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Live search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Filter rows…"
                            className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-40" />
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAppendRow}>
                        <Plus className="h-3 w-3 mr-1" /> Row
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => exportCsv(data)}>
                        <Download className="h-3 w-3 mr-1" /> CSV
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onRefresh}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Reload
                    </Button>
                    <a href={`https://docs.google.com/spreadsheets/d/${data.spreadsheet_id}/edit`}
                        target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" /> Open
                        </Button>
                    </a>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-600" onClick={onDisconnect}>
                        <X className="h-3 w-3 mr-1" /> Disconnect
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-[450px] custom-scrollbar">
                <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 dark:bg-slate-800">
                            <th className="px-3 py-2.5 text-left font-bold text-slate-400 w-10 border-b border-r border-slate-100 dark:border-slate-700">
                                #
                            </th>
                            {data.headers.map((h, i) => (
                                <th key={i} className="px-3 py-2.5 text-left font-bold text-slate-600 dark:text-slate-300 border-b border-r border-slate-100 dark:border-slate-700 whitespace-nowrap">
                                    {h || `Col ${i + 1}`}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={data.headers.length + 1} className="px-4 py-10 text-center text-slate-400">
                                    {search ? 'No rows match your filter.' : 'No data rows found.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((row, ri) => (
                                <tr key={ri} className={cn(
                                    'hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors',
                                    ri % 2 === 0 ? '' : 'bg-slate-50/40 dark:bg-slate-800/10'
                                )}>
                                    <td className="px-3 py-2 text-slate-300 dark:text-slate-600 font-mono border-r border-slate-50 dark:border-slate-800/60">
                                        {ri + 1}
                                    </td>
                                    {data.headers.map((_, ci) => (
                                        <td key={ci} className="px-3 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-50 dark:border-slate-800/60 max-w-xs truncate">
                                            {row[ci] ?? ''}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Stats footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><Rows className="h-3 w-3" /> {data.rows} rows</span>
                <span className="flex items-center gap-1"><Columns className="h-3 w-3" /> {data.headers.length} columns</span>
                <span className="flex items-center gap-1"><Table2 className="h-3 w-3" /> Range: {data.range}</span>
            </div>
        </Card>
    );
}

// ─── Drive Sheet Card ───────────────────────────────────────────────────────────
function DriveSheetCard({ sheet, onOpen }: { sheet: DriveSheet; onOpen: (id: string) => void }) {
    const modifiedLabel = (() => {
        try { return format(parseISO(sheet.modified), 'MMM d, yyyy'); } catch { return sheet.modified; }
    })();

    return (
        <div className="group flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all border-b border-slate-100 dark:border-slate-800/60 last:border-0">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {sheet.name}
                    </h4>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                    Modified {modifiedLabel} · Owner: {sheet.owner}
                </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <Button size="sm" variant="ghost" className="h-8 text-xs"
                    onClick={() => onOpen(sheet.id)}>
                    <Table2 className="h-3.5 w-3.5 mr-1" /> View Data
                </Button>
                <a href={sheet.link} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-8 text-xs">
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                </a>
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export function SheetsPage() {
    const [driveSheets, setDriveSheets] = useState<DriveSheet[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [listError, setListError] = useState<string | null>(null);
    const [driveSearch, setDriveSearch] = useState('');

    const [sheetData, setSheetData] = useState<SheetData | null>(null);
    const [activeId, setActiveId] = useState('');
    const [activeRange, setActiveRange] = useState('Sheet1');
    const [sheetTabs, setSheetTabs] = useState<string[]>([]);
    const [sheetTitle, setSheetTitle] = useState('');
    const [isLoadingSheet, setIsLoadingSheet] = useState(false);
    const [sheetError, setSheetError] = useState<string | null>(null);

    const [connectOpen, setConnectOpen] = useState(false);
    const [appendOpen, setAppendOpen] = useState(false);

    const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

    // ── Fetch Drive Sheet List ──
    const fetchList = useCallback(async (q = '') => {
        setIsLoadingList(true); setListError(null);
        try {
            const res = await sheetsService.listSheets(q);
            setDriveSheets(res.data.sheets || []);
        } catch (e: any) {
            setListError(e?.message || 'Could not fetch your Google Sheets. Ensure Google account is connected.');
        } finally { setIsLoadingList(false); }
    }, []);

    useEffect(() => { fetchList(); }, [fetchList]);

    // ── Fetch Sheet Data ──
    const fetchSheetData = useCallback(async (id: string, range?: string) => {
        setIsLoadingSheet(true); setSheetError(null);
        setActiveId(id);
        try {
            // Step 1: Fetch tab names so we know the real first sheet name
            let resolvedRange = range || '';
            let tabs: string[] = [];
            let title = '';
            try {
                const tabsRes = await sheetsService.getSheetTabs(id);
                tabs = tabsRes.data.tabs || [];
                title = tabsRes.data.title || '';
                setSheetTabs(tabs);
                setSheetTitle(title);
                // If no explicit range given, use first tab's actual name
                if (!resolvedRange && tabs.length > 0) {
                    resolvedRange = tabs[0];
                }
            } catch {
                // If tabs fail, fall back to no range (API will use first sheet)
            }
            if (!resolvedRange) resolvedRange = 'Sheet1';
            setActiveRange(resolvedRange);

            // Step 2: Fetch the actual data using the resolved tab name
            const dataRes = await sheetsService.readSheet(id, resolvedRange);
            setSheetData(dataRes.data.sheet);
        } catch (e: any) {
            const msg = e?.response?.data?.detail || e?.message || 'Failed to load sheet.';
            setSheetError(msg);
            pushToast('error', msg);
        } finally { setIsLoadingSheet(false); }
    }, []);

    const handleConnect = (id: string, range: string) => {
        // Use the user-specified range (from modal), or let fetchSheetData auto-detect first tab
        fetchSheetData(id, range !== 'Sheet1' ? range : undefined);
        pushToast('success', 'Connecting to spreadsheet…');
    };

    const handleTabSwitch = (tab: string) => {
        setActiveRange(tab);
        // Pass tab explicitly — it's already the real tab name
        sheetsService.readSheet(activeId, tab).then(res => {
            setSheetData(res.data.sheet);
            setSheetError(null);
        }).catch((e: any) => {
            const msg = e?.response?.data?.detail || e?.message || 'Failed to switch tab.';
            pushToast('error', msg);
        });
    };

    const handleDisconnect = () => {
        setSheetData(null); setSheetTabs([]); setSheetTitle(''); setActiveId(''); setActiveRange('Sheet1');
    };

    // ── Drive list search ──
    const handleDriveSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') fetchList(driveSearch);
    };

    const filteredDrive = driveSheets.filter(s =>
        !driveSearch || s.name.toLowerCase().includes(driveSearch.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-12">
            {/* ── Header ── */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        Google Sheets
                        <span className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Drive</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
                        {driveSheets.length} spreadsheet{driveSheets.length !== 1 ? 's' : ''} in your Drive
                        {sheetData && ` · Viewing ${sheetData.rows} rows`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchList(driveSearch)}
                        disabled={isLoadingList} className="h-9 dark:border-slate-700">
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isLoadingList && 'animate-spin')} /> Refresh
                    </Button>
                    <Button size="sm" onClick={() => setConnectOpen(true)}
                        className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Link2 className="h-3.5 w-3.5 mr-1.5" /> Connect by ID
                    </Button>
                </div>
            </header>

            {/* ── Active Sheet Viewer ── */}
            {(isLoadingSheet || sheetData || sheetError) && (
                <div className="space-y-3">
                    {/* Sheet title & tab switcher */}
                    {(sheetTitle || sheetTabs.length > 0) && !isLoadingSheet && sheetData && (
                        <div className="flex items-center gap-3 flex-wrap">
                            {sheetTitle && (
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> {sheetTitle}
                                </span>
                            )}
                            {sheetTabs.length > 1 && (
                                <div className="flex items-center gap-1 overflow-x-auto">
                                    {sheetTabs.map(tab => (
                                        <button key={tab} onClick={() => handleTabSwitch(tab)}
                                            className={cn(
                                                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                                                activeRange === tab
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            )}>
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {isLoadingSheet ? (
                        <Card className="border-slate-200 dark:border-slate-800 p-12">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                                <p className="text-sm text-slate-400 font-medium">Loading spreadsheet data…</p>
                            </div>
                        </Card>
                    ) : sheetError ? (
                        <Card className="border-red-100 dark:border-red-900/30 p-8">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 dark:text-white text-sm">Failed to load spreadsheet</p>
                                    <p className="text-xs text-slate-500 mt-1">{sheetError}</p>
                                    <div className="flex gap-2 mt-3">
                                        <Button size="sm" onClick={() => fetchSheetData(activeId, activeRange)}
                                            className="bg-red-500 hover:bg-red-600 text-white text-xs">
                                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={handleDisconnect} className="text-xs">
                                            Dismiss
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : sheetData && (
                        <SheetTable
                            data={sheetData}
                            onRefresh={() => fetchSheetData(activeId, activeRange)}
                            onDisconnect={handleDisconnect}
                            onAppendRow={() => setAppendOpen(true)}
                        />
                    )}
                </div>
            )}

            {/* ── Drive Sheets List ── */}
            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-emerald-600" />
                        Your Google Sheets
                        {!isLoadingList && (
                            <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                {driveSheets.length}
                            </span>
                        )}
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={driveSearch}
                            onChange={e => setDriveSearch(e.target.value)}
                            onKeyDown={handleDriveSearch}
                            placeholder="Search sheets… (Enter to search Drive)"
                            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-64"
                        />
                    </div>
                </div>

                {isLoadingList ? (
                    <div className="p-6 space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : listError ? (
                    <div className="flex flex-col items-center py-16 text-center px-6">
                        <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
                        <p className="font-bold text-slate-700 dark:text-slate-300">Could not load your sheets</p>
                        <p className="text-sm text-slate-400 mt-1 max-w-xs">{listError}</p>
                        <div className="flex gap-2 mt-4">
                            <Button size="sm" onClick={() => fetchList()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setConnectOpen(true)} className="dark:border-slate-700">
                                <Link2 className="h-3.5 w-3.5 mr-1.5" /> Connect by ID
                            </Button>
                        </div>
                    </div>
                ) : filteredDrive.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-4">
                            <FileSpreadsheet className="h-8 w-8 text-emerald-300" />
                        </div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-300">
                            {driveSearch ? 'No sheets match your search' : 'No Google Sheets found'}
                        </h4>
                        <p className="text-sm text-slate-400 mt-1">
                            {driveSearch ? 'Try pressing Enter to search Drive.' : 'Your Drive has no spreadsheets yet.'}
                        </p>
                        {!driveSearch && (
                            <Button size="sm" onClick={() => setConnectOpen(true)} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Link2 className="h-3.5 w-3.5 mr-1.5" /> Connect by ID
                            </Button>
                        )}
                    </div>
                ) : (
                    <div>
                        {filteredDrive.map(sheet => (
                            <DriveSheetCard key={sheet.id} sheet={sheet} onOpen={(id) => fetchSheetData(id)} />
                        ))}
                    </div>
                )}
            </Card>

            {/* ── Modals ── */}
            <ConnectModal
                isOpen={connectOpen}
                onClose={() => setConnectOpen(false)}
                onConnect={handleConnect}
                pushToast={pushToast}
            />

            {sheetData && (
                <AppendRowModal
                    isOpen={appendOpen}
                    onClose={() => setAppendOpen(false)}
                    headers={sheetData.headers}
                    spreadsheetId={activeId}
                    rangeName={activeRange}
                    pushToast={pushToast}
                    onAppended={() => fetchSheetData(activeId, activeRange)}
                />
            )}

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
