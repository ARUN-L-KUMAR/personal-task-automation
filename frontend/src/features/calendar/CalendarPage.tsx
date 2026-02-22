import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Calendar as CalendarIcon, Clock, MapPin, Plus, RefreshCw,
    ChevronLeft, ChevronRight, AlertCircle, CheckCircle2,
    XCircle, X, Loader2, Users, Link2, CalendarDays,
    LayoutList, Grid3X3, CalendarRange,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { calendarService } from '../../services/calendar.service';
import { cn } from '../../utils/cn';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, addMonths, subMonths, isSameMonth, isSameDay,
    isToday, startOfDay, endOfDay, addWeeks, subWeeks,
    startOfWeek as startW, endOfWeek as endW, parseISO,
    addHours,
} from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalEvent {
    id?: string;
    title: string;
    start: string;
    end: string;
    location?: string;
    description?: string;
    attendees?: string[];
    status?: string;
    link?: string;
}

type ViewMode = 'month' | 'week' | 'day';

// ─── Colour palette per event (deterministic) ─────────────────────────────────
const EVENT_COLORS = [
    { bg: 'bg-blue-500', light: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' },
    { bg: 'bg-violet-500', light: 'bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-300' },
    { bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300' },
    { bg: 'bg-amber-500', light: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300' },
    { bg: 'bg-rose-500', light: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300' },
    { bg: 'bg-sky-500', light: 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-300' },
];
function eventColor(id?: string) {
    if (!id) return EVENT_COLORS[0];
    let h = 0;
    for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
    return EVENT_COLORS[Math.abs(h) % EVENT_COLORS.length];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function eventStart(e: CalEvent): Date | null {
    try { return e.start ? parseISO(e.start) : null; } catch { return null; }
}
function eventEnd(e: CalEvent): Date | null {
    try { return e.end ? parseISO(e.end) : null; } catch { return null; }
}
function isAllDay(e: CalEvent) {
    return !e.start?.includes('T');
}
function formatTime(dt: Date | null): string {
    if (!dt) return '';
    return format(dt, 'h:mm a');
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastMsg { id: number; type: 'success' | 'error'; text: string }
let _tid = 0;
function useToasts() {
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const push = (type: 'success' | 'error', text: string) => {
        const id = ++_tid;
        setToasts(p => [...p, { id, type, text }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    };
    const dismiss = (id: number) => setToasts(p => p.filter(t => t.id !== id));
    return { toasts, push, dismiss };
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: number) => void }) {
    return (
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white pointer-events-auto animate-in slide-in-from-bottom-4',
                    t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                )}>
                    {t.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
                    <span>{t.text}</span>
                    <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
                </div>
            ))}
        </div>
    );
}

// ─── Create Event Modal ───────────────────────────────────────────────────────
interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    defaultDate?: Date;
    pushToast: (type: 'success' | 'error', text: string) => void;
}

function CreateEventModal({ isOpen, onClose, onCreated, defaultDate, pushToast }: CreateModalProps) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const defaultDateStr = defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    const nowH = new Date().getHours();

    const [title, setTitle] = useState('');
    const [date, setDate] = useState(defaultDateStr);
    const [startTime, setStartTime] = useState(`${pad(nowH)}:00`);
    const [endTime, setEndTime] = useState(`${pad((nowH + 1) % 24)}:00`);
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            const d = defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
            setDate(d); setTitle(''); setLocation(''); setDescription(''); setError('');
        }
    }, [isOpen, defaultDate]);

    const handleCreate = async () => {
        if (!title.trim()) { setError('Event title is required.'); return; }
        if (!date) { setError('Please pick a date.'); return; }
        if (startTime >= endTime) { setError('End time must be after start time.'); return; }
        setError(''); setIsLoading(true);
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const start_time = `${date}T${startTime}:00`;
            const end_time = `${date}T${endTime}:00`;
            await calendarService.createEvent({
                summary: title.trim(),
                start_time,
                end_time,
                location: location.trim(),
                description: description.trim(),
            });
            pushToast('success', `"${title.trim()}" added to Google Calendar!`);
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to create event. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-500" />
                        <span className="font-bold text-slate-800 dark:text-white text-sm">New Event</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Event Title *</label>
                        <input
                            type="text"
                            placeholder="e.g. Team standup"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            autoFocus
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    {/* Date */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Date *</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Start Time</label>
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">End Time</label>
                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Location</label>
                        <input type="text" placeholder="Optional location" value={location} onChange={e => setLocation(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
                        <textarea rows={3} placeholder="Optional notes..." value={description} onChange={e => setDescription(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" />
                    </div>

                    {error && (
                        <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                            <XCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-5 pb-5">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button size="sm" onClick={handleCreate} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[110px]">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                        {isLoading ? 'Creating…' : 'Add to Calendar'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Event Detail Popup ───────────────────────────────────────────────────────
function EventPopup({ event, onClose }: { event: CalEvent; onClose: () => void }) {
    const start = eventStart(event);
    const end = eventEnd(event);
    const color = eventColor(event.id);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className={cn('h-2 w-full', color.bg)} />
                <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">{event.title}</h3>
                        <button onClick={onClose} className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                            <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            {isAllDay(event) ? 'All day' : `${formatTime(start)} – ${formatTime(end)}`}
                        </div>
                        {start && (
                            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                <CalendarDays className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                {format(start, 'EEEE, MMMM d, yyyy')}
                            </div>
                        )}
                        {event.location && event.location !== 'No location' && (
                            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                <span className="break-words">{event.location}</span>
                            </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                                <Users className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                <span className="break-all">{event.attendees.slice(0, 3).join(', ')}{event.attendees.length > 3 && ` +${event.attendees.length - 3} more`}</span>
                            </div>
                        )}
                        {event.description && (
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{event.description}</p>
                            </div>
                        )}
                        {event.link && (
                            <a href={event.link} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-medium hover:underline pt-1">
                                <Link2 className="h-3.5 w-3.5" /> Open in Google Calendar
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Mini month grid for sidebar ─────────────────────────────────────────────
function MiniMonthGrid({
    viewDate, selectedDate, events, onSelectDate,
}: {
    viewDate: Date; selectedDate: Date; events: CalEvent[]; onSelectDate: (d: Date) => void;
}) {
    const [miniMonth, setMiniMonth] = useState(startOfMonth(viewDate));

    useEffect(() => setMiniMonth(startOfMonth(viewDate)), [viewDate]);

    const days = useMemo(() => {
        const start = startOfWeek(miniMonth, { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(miniMonth), { weekStartsOn: 1 });
        const arr: Date[] = [];
        let cur = start;
        while (cur <= end) { arr.push(cur); cur = addDays(cur, 1); }
        return arr;
    }, [miniMonth]);

    const hasEvent = (d: Date) => events.some(e => {
        const s = eventStart(e);
        return s && isSameDay(s, d);
    });

    return (
        <div className="select-none">
            <div className="flex items-center justify-between mb-2">
                <button onClick={() => setMiniMonth(m => subMonths(m, 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{format(miniMonth, 'MMMM yyyy')}</span>
                <button onClick={() => setMiniMonth(m => addMonths(m, 1))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-0">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-bold text-slate-400 pb-1">{d}</div>
                ))}
                {days.map((day, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelectDate(day)}
                        className={cn(
                            'h-7 w-full flex items-center justify-center rounded-full text-[11px] font-medium transition-all relative',
                            !isSameMonth(day, miniMonth) && 'opacity-30',
                            isToday(day) && 'ring-2 ring-blue-500 ring-offset-1',
                            isSameDay(day, selectedDate) && 'bg-blue-600 text-white',
                            !isSameDay(day, selectedDate) && 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
                        )}
                    >
                        {format(day, 'd')}
                        {hasEvent(day) && !isSameDay(day, selectedDate) && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-blue-500" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Day Agenda (sidebar) ─────────────────────────────────────────────────────
function DayAgenda({ date, events, onEventClick }: { date: Date; events: CalEvent[]; onEventClick: (e: CalEvent) => void }) {
    const dayEvts = events.filter(e => {
        const s = eventStart(e);
        return s && isSameDay(s, date);
    }).sort((a, b) => (a.start > b.start ? 1 : -1));

    return (
        <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {isToday(date) ? "Today's schedule" : format(date, 'MMM d')}
            </p>
            {dayEvts.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No events</p>
            ) : (
                dayEvts.map((e, i) => {
                    const color = eventColor(e.id);
                    return (
                        <button
                            key={i}
                            onClick={() => onEventClick(e)}
                            className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left group"
                        >
                            <div className={cn('h-2 w-2 rounded-full flex-shrink-0', color.bg)} />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{e.title}</p>
                                <p className="text-[10px] text-slate-400">
                                    {isAllDay(e) ? 'All day' : formatTime(eventStart(e))}
                                </p>
                            </div>
                        </button>
                    );
                })
            )}
        </div>
    );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ currentDate, events, onSelectDate, onEventClick }: {
    currentDate: Date; events: CalEvent[];
    onSelectDate: (d: Date) => void; onEventClick: (e: CalEvent) => void;
}) {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });

    const days: Date[] = [];
    let cur = start;
    while (cur <= end) { days.push(cur); cur = addDays(cur, 1); }

    const eventsForDay = (d: Date) =>
        events.filter(e => { const s = eventStart(e); return s && isSameDay(s, d); });

    return (
        <div className="flex flex-col h-full">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {d}
                    </div>
                ))}
            </div>
            {/* Cells */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 divide-x divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden">
                {days.map((day, idx) => {
                    const dayEvts = eventsForDay(day);
                    return (
                        <div
                            key={idx}
                            onClick={() => onSelectDate(day)}
                            className={cn(
                                'p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors overflow-hidden',
                                !isSameMonth(day, currentDate) && 'bg-slate-50/50 dark:bg-slate-900/30 opacity-50',
                            )}
                        >
                            <div className={cn(
                                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 mx-auto transition-all',
                                isToday(day) ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
                            )}>
                                {format(day, 'd')}
                            </div>
                            <div className="space-y-0.5">
                                {dayEvts.slice(0, 2).map((e, i) => {
                                    const color = eventColor(e.id);
                                    return (
                                        <button
                                            key={i}
                                            onClick={ev => { ev.stopPropagation(); onEventClick(e); }}
                                            className={cn(
                                                'w-full text-left px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border transition-all hover:opacity-80',
                                                color.light
                                            )}
                                        >
                                            {e.title}
                                        </button>
                                    );
                                })}
                                {dayEvts.length > 2 && (
                                    <p className="text-[10px] text-slate-400 pl-1">+{dayEvts.length - 2} more</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({ currentDate, events, onEventClick }: {
    currentDate: Date; events: CalEvent[]; onEventClick: (e: CalEvent) => void;
}) {
    const weekStart = startW(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <div className="flex flex-col h-full">
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
                {days.map((d, i) => (
                    <div key={i} className={cn(
                        'py-3 text-center',
                        isToday(d) && 'bg-blue-50 dark:bg-blue-900/20'
                    )}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{format(d, 'EEE')}</p>
                        <div className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold mx-auto mt-0.5',
                            isToday(d) ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
                        )}>
                            {format(d, 'd')}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800/60 overflow-y-auto custom-scrollbar">
                {days.map((day, idx) => {
                    const dayEvts = events
                        .filter(e => { const s = eventStart(e); return s && isSameDay(s, day); })
                        .sort((a, b) => a.start > b.start ? 1 : -1);
                    return (
                        <div key={idx} className={cn(
                            'p-1.5 space-y-1 min-h-[200px]',
                            isToday(day) && 'bg-blue-50/40 dark:bg-blue-900/10'
                        )}>
                            {dayEvts.length === 0 && (
                                <div className="h-full flex items-start justify-center pt-4">
                                    <span className="text-[10px] text-slate-300">—</span>
                                </div>
                            )}
                            {dayEvts.map((e, i) => {
                                const color = eventColor(e.id);
                                return (
                                    <button key={i} onClick={() => onEventClick(e)}
                                        className={cn(
                                            'w-full text-left p-1.5 rounded-lg border text-[11px] font-semibold transition-all hover:opacity-80',
                                            color.light
                                        )}>
                                        <p className="truncate">{e.title}</p>
                                        {!isAllDay(e) && (
                                            <p className="font-normal opacity-70 mt-0.5">{formatTime(eventStart(e))}</p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({ currentDate, events, onEventClick }: {
    currentDate: Date; events: CalEvent[]; onEventClick: (e: CalEvent) => void;
}) {
    const dayEvts = events
        .filter(e => { const s = eventStart(e); return s && isSameDay(s, currentDate); })
        .sort((a, b) => a.start > b.start ? 1 : -1);

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="overflow-y-auto custom-scrollbar h-full">
            {dayEvts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-24 text-center">
                    <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <CalendarIcon className="h-8 w-8 text-slate-300" />
                    </div>
                    <h4 className="font-bold text-slate-700 dark:text-slate-300">No events</h4>
                    <p className="text-sm text-slate-400 mt-1">No events on {format(currentDate, 'MMMM d, yyyy')}.</p>
                </div>
            ) : (
                <div className="relative">
                    {hours.map(h => {
                        const slotEvts = dayEvts.filter(e => {
                            const s = eventStart(e);
                            return s && s.getHours() === h;
                        });
                        return (
                            <div key={h} className="flex gap-3 border-b border-slate-50 dark:border-slate-800/60 min-h-[60px]">
                                <div className="w-14 flex-shrink-0 pt-1 text-right pr-3">
                                    <span className="text-[10px] font-medium text-slate-400">
                                        {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                                    </span>
                                </div>
                                <div className="flex-1 py-1 space-y-1">
                                    {slotEvts.map((e, i) => {
                                        const color = eventColor(e.id);
                                        return (
                                            <button key={i} onClick={() => onEventClick(e)}
                                                className={cn(
                                                    'w-full text-left px-3 py-2 rounded-xl border font-medium text-sm transition-all hover:opacity-80',
                                                    color.light
                                                )}>
                                                <p className="font-bold truncate">{e.title}</p>
                                                <p className="text-xs opacity-80 flex items-center gap-1.5 mt-0.5">
                                                    <Clock className="h-3 w-3" />
                                                    {isAllDay(e) ? 'All day' : `${formatTime(eventStart(e))} – ${formatTime(eventEnd(e))}`}
                                                </p>
                                                {e.location && e.location !== 'No location' && (
                                                    <p className="text-xs opacity-70 flex items-center gap-1.5 mt-0.5">
                                                        <MapPin className="h-3 w-3" /> {e.location}
                                                    </p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function CalendarPage() {
    const [events, setEvents] = useState<CalEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [createDefaultDate, setCreateDefaultDate] = useState<Date | undefined>();

    const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

    // ── Range to fetch ──
    const fetchRange = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            let rangeStart: Date, rangeEnd: Date;
            if (viewMode === 'month') {
                rangeStart = startOfDay(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }));
                rangeEnd = endOfDay(endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }));
            } else if (viewMode === 'week') {
                rangeStart = startOfDay(startW(currentDate, { weekStartsOn: 1 }));
                rangeEnd = endOfDay(endW(currentDate, { weekStartsOn: 1 }));
            } else {
                rangeStart = startOfDay(currentDate);
                rangeEnd = endOfDay(currentDate);
            }
            const res = await calendarService.getEventsRange(rangeStart.toISOString(), rangeEnd.toISOString(), 100);
            setEvents(res.data.events || []);
        } catch (err: any) {
            setError(err?.message || 'Could not load events. Ensure Google account is connected.');
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, viewMode]);

    useEffect(() => { fetchRange(); }, [fetchRange]);

    // ── Navigation ──
    const navigate = (dir: 1 | -1) => {
        if (viewMode === 'month') setCurrentDate(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
        else if (viewMode === 'week') setCurrentDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
        else setCurrentDate(d => dir === 1 ? addDays(d, 1) : addDays(d, -1));
    };

    // ── Title ──
    const title = useMemo(() => {
        if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
        if (viewMode === 'week') {
            const ws = startW(currentDate, { weekStartsOn: 1 });
            const we = endW(currentDate, { weekStartsOn: 1 });
            return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
        }
        return format(currentDate, 'EEEE, MMMM d, yyyy');
    }, [currentDate, viewMode]);

    const handleDaySelect = (d: Date) => {
        setCurrentDate(d);
        setViewMode('day');
    };

    const openCreate = (d?: Date) => {
        setCreateDefaultDate(d || currentDate);
        setCreateOpen(true);
    };

    const todayEvents = events.filter(e => { const s = eventStart(e); return s && isToday(s); });

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
            {/* ── Header ── */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        Calendar
                        <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none text-[11px]">
                            <CalendarDays className="h-3 w-3 mr-1" /> Google
                        </Badge>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
                        {events.length} event{events.length !== 1 ? 's' : ''} · {title}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* View mode toggle */}
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        {([['month', Grid3X3], ['week', CalendarRange], ['day', LayoutList]] as [ViewMode, React.ElementType][]).map(([mode, Icon]) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={cn(
                                    'px-3 py-2 flex items-center gap-1.5 text-xs font-semibold transition-all capitalize',
                                    viewMode === mode
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                )}
                                title={mode}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{mode}</span>
                            </button>
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-x border-slate-200 dark:border-slate-700">
                            Today
                        </button>
                        <button onClick={() => navigate(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <Button size="sm" onClick={() => openCreate()} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Event
                    </Button>

                    <Button variant="outline" size="sm" onClick={fetchRange} disabled={isLoading} className="h-9 dark:border-slate-700">
                        <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                    </Button>
                </div>
            </header>

            {/* ── Main ── */}
            <div className="flex flex-1 gap-4 overflow-hidden min-h-0">

                {/* ── Sidebar ── */}
                <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 gap-3">
                    {/* Mini month nav */}
                    <Card className="p-3 border-slate-200 dark:border-slate-800">
                        <MiniMonthGrid
                            viewDate={currentDate}
                            selectedDate={currentDate}
                            events={events}
                            onSelectDate={handleDaySelect}
                        />
                    </Card>

                    {/* Today agenda */}
                    <Card className="p-3 border-slate-200 dark:border-slate-800 flex-1 overflow-y-auto custom-scrollbar">
                        <DayAgenda
                            date={new Date()}
                            events={events}
                            onEventClick={setSelectedEvent}
                        />
                    </Card>

                    {/* Stats */}
                    <Card className="p-3 border-slate-200 dark:border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stats</p>
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Events in view</span>
                                <span className="font-bold text-slate-800 dark:text-white">{events.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Today's events</span>
                                <span className="font-bold text-blue-600">{todayEvents.length}</span>
                            </div>
                        </div>
                    </Card>
                </aside>

                {/* ── Calendar Panel ── */}
                <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                                <p className="text-sm text-slate-400 font-medium">Loading events…</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
                                <AlertCircle className="h-8 w-8 text-red-400" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Failed to load calendar</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-xs">{error}</p>
                            <Button size="sm" onClick={fetchRange} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try Again
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-hidden">
                            {viewMode === 'month' && (
                                <MonthView
                                    currentDate={currentDate}
                                    events={events}
                                    onSelectDate={handleDaySelect}
                                    onEventClick={setSelectedEvent}
                                />
                            )}
                            {viewMode === 'week' && (
                                <WeekView
                                    currentDate={currentDate}
                                    events={events}
                                    onEventClick={setSelectedEvent}
                                />
                            )}
                            {viewMode === 'day' && (
                                <DayView
                                    currentDate={currentDate}
                                    events={events}
                                    onEventClick={setSelectedEvent}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modals ── */}
            <CreateEventModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={fetchRange}
                defaultDate={createDefaultDate}
                pushToast={pushToast}
            />

            {selectedEvent && (
                <EventPopup event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            )}

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
