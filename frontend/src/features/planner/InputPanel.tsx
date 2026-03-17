import React, { useState } from 'react';
import {
    Calendar, Clock, Plus, Trash2, MapPin, Tag, Settings2,
    RefreshCw, Upload, FlaskConical, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { cn } from '../../utils/cn';
import { usePlannerStore } from '../../store/usePlannerStore';
import { MeetingInput, TaskInput, Priority, TaskCategory, ProductivityPreference } from '../../types/planner.types';
import { calendarService } from '../../services/calendar.service';
import { tasksService } from '../../services/tasks.service';
import { format, startOfDay, endOfDay } from 'date-fns';

const uid = () => Math.random().toString(36).slice(2, 10);

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'text-emerald-600' },
    { value: 'medium', label: 'Medium', color: 'text-amber-600' },
    { value: 'high', label: 'High', color: 'text-red-600' },
];

const CATEGORIES: { value: TaskCategory; label: string }[] = [
    { value: 'work', label: 'Work' },
    { value: 'personal', label: 'Personal' },
    { value: 'study', label: 'Study' },
];

const PREFERENCES: { value: ProductivityPreference; label: string; desc: string }[] = [
    { value: 'balanced', label: 'Balanced', desc: 'Mix of focus & flexibility' },
    { value: 'aggressive', label: 'Aggressive', desc: 'Pack schedule tightly' },
    { value: 'relaxed', label: 'Relaxed', desc: 'Generous buffers' },
];

interface Props {
    disabled: boolean;
}

export function InputPanel({ disabled }: Props) {
    const {
        settings, updateSettings,
        meetings, addMeeting, removeMeeting, updateMeeting, setMeetings,
        tasks, addTask, removeTask, updateTask, setTasks,
    } = usePlannerStore();
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [meetingsOpen, setMeetingsOpen] = useState(true);
    const [tasksOpen, setTasksOpen] = useState(true);

    const handleAutoFill = async () => {
        setIsAutoFilling(true);
        try {
            const d = settings.date ? new Date(settings.date) : new Date();
            const timeMin = startOfDay(d).toISOString();
            const timeMax = endOfDay(d).toISOString();
            const [eventsRes, tasksRes] = await Promise.all([
                calendarService.getEventsRange(timeMin, timeMax),
                tasksService.getTasks(),
            ]);
            const events = eventsRes.data.events || [];
            const tasksList = tasksRes.data.tasks || [];

            const newMeetings: MeetingInput[] = events.map((e: any) => ({
                id: uid(),
                title: e.summary || 'Untitled',
                startTime: e.start?.dateTime ? format(new Date(e.start.dateTime), 'HH:mm') : '09:00',
                endTime: e.end?.dateTime ? format(new Date(e.end.dateTime), 'HH:mm') : '10:00',
                location: e.location || '',
                priority: 'medium' as Priority,
                isFlexible: false,
            }));
            setMeetings(newMeetings);

            const newTasks: TaskInput[] = tasksList
                .filter((t: any) => t.status !== 'completed')
                .map((t: any) => ({
                    id: uid(),
                    title: t.title,
                    deadline: '',
                    estimatedDuration: 30,
                    priority: 'medium' as Priority,
                    requiresTravel: false,
                    flexibleDeadline: false,
                    category: 'work' as TaskCategory,
                }));
            setTasks(newTasks);
        } catch (err) {
            console.error('Auto-fill failed:', err);
        } finally {
            setIsAutoFilling(false);
        }
    };

    const loadSample = () => {
        setMeetings([
            { id: uid(), title: 'Team Standup', startTime: '09:00', endTime: '09:30', location: 'Zoom', priority: 'high', isFlexible: false },
            { id: uid(), title: 'Client Review', startTime: '10:00', endTime: '11:00', location: 'T Nagar Office', priority: 'high', isFlexible: false },
            { id: uid(), title: 'Architecture Sync', startTime: '10:30', endTime: '11:30', location: 'OMR Campus', priority: 'high', isFlexible: false },
            { id: uid(), title: 'Sprint Retro', startTime: '15:30', endTime: '16:30', location: 'Guindy HQ', priority: 'medium', isFlexible: false },
        ]);
        setTasks([
            { id: uid(), title: 'Write API Documentation', deadline: '', estimatedDuration: 90, priority: 'high', requiresTravel: false, flexibleDeadline: false, category: 'work' },
            { id: uid(), title: 'Code Review — PR #142', deadline: '', estimatedDuration: 45, priority: 'medium', requiresTravel: false, flexibleDeadline: true, category: 'work' },
            { id: uid(), title: 'Prepare Presentation Slides', deadline: '', estimatedDuration: 60, priority: 'high', requiresTravel: false, flexibleDeadline: false, category: 'work' },
            { id: uid(), title: 'Gym Session', deadline: '', estimatedDuration: 60, priority: 'low', requiresTravel: true, flexibleDeadline: true, category: 'personal' },
            { id: uid(), title: 'Research LangGraph Patterns', deadline: '', estimatedDuration: 40, priority: 'medium', requiresTravel: false, flexibleDeadline: true, category: 'study' },
        ]);
    };

    const selectCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500';
    const inputCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500';

    return (
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-180px)] pr-1 scrollbar-thin">
            {/* ── Settings ── */}
            <Card className="border-slate-200">
                <CardHeader className="py-3 px-4">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Settings2 className="h-3.5 w-3.5" /> Plan Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-0">
                    {/* ── Time Settings ── */}
                    <div className="pb-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Time Settings
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Date</label>
                                <input
                                    type="date"
                                    value={settings.date}
                                    onChange={(e) => updateSettings({ date: e.target.value })}
                                    disabled={disabled}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Timezone</label>
                                <input value={settings.timezone} readOnly disabled className={cn(inputCls, 'bg-slate-50 text-slate-400')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Work Start</label>
                                <input
                                    type="time"
                                    value={settings.workStart}
                                    onChange={(e) => updateSettings({ workStart: e.target.value })}
                                    disabled={disabled}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Work End</label>
                                <input
                                    type="time"
                                    value={settings.workEnd}
                                    onChange={(e) => updateSettings({ workEnd: e.target.value })}
                                    disabled={disabled}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Divider ── */}
                    <div className="border-t border-dashed border-slate-200 my-1" />

                    {/* ── Productivity Strategy ── */}
                    <div className="pt-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2 flex items-center gap-1.5">
                            <Tag className="h-3 w-3" /> Productivity Strategy
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {PREFERENCES.map((p) => (
                                <div key={p.value} className="relative group">
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => updateSettings({ preference: p.value })}
                                        className={cn(
                                            'w-full rounded-lg border px-2.5 py-2 text-center transition-all',
                                            settings.preference === p.value
                                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-100'
                                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                        )}
                                    >
                                        <span className="text-[11px] font-bold block">{p.label}</span>
                                        <span className="text-[9px] text-slate-400 block mt-0.5">{p.desc}</span>
                                    </button>
                                    {/* Tooltip */}
                                    <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 px-3 py-2 rounded-lg bg-slate-800 text-white text-[10px] leading-snug opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg text-center">
                                        {p.value === 'balanced' && 'Mix focus blocks with buffer time between events'}
                                        {p.value === 'aggressive' && 'Minimize gaps — pack tasks back-to-back for max output'}
                                        {p.value === 'relaxed' && 'Add generous buffers between blocks to avoid burnout'}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Bulk Actions ── */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoFill}
                    isLoading={isAutoFilling}
                    disabled={disabled}
                    className="flex-1 h-8 text-[10px] font-bold"
                >
                    <RefreshCw className={cn('h-3 w-3 mr-1.5', isAutoFilling && 'animate-spin')} />
                    Auto-fill from Google
                </Button>
                <Button variant="outline" size="sm" onClick={loadSample} disabled={disabled} className="flex-1 h-8 text-[10px] font-bold">
                    <FlaskConical className="h-3 w-3 mr-1.5" />
                    Sample Scenario
                </Button>
            </div>

            {/* ── Meetings ── */}
            <Card className="border-slate-200">
                <CardHeader className="py-3 px-4 cursor-pointer select-none" onClick={() => setMeetingsOpen(!meetingsOpen)}>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-blue-500" /> Meetings
                            <span className="ml-1 bg-blue-100 text-blue-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">{meetings.length}</span>
                        </CardTitle>
                        {meetingsOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                </CardHeader>
                {meetingsOpen && (
                    <CardContent className="px-4 pb-4 space-y-3">
                        {meetings.map((m) => (
                            <div key={m.id} className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100 relative group">
                                <button
                                    onClick={() => removeMeeting(m.id)}
                                    disabled={disabled}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <input
                                    value={m.title}
                                    onChange={(e) => updateMeeting(m.id, { title: e.target.value })}
                                    placeholder="Meeting title"
                                    disabled={disabled}
                                    className={cn(inputCls, 'font-medium')}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="time" value={m.startTime} onChange={(e) => updateMeeting(m.id, { startTime: e.target.value })} disabled={disabled} className={inputCls} />
                                    <input type="time" value={m.endTime} onChange={(e) => updateMeeting(m.id, { endTime: e.target.value })} disabled={disabled} className={inputCls} />
                                    <select value={m.priority} onChange={(e) => updateMeeting(m.id, { priority: e.target.value as Priority })} disabled={disabled} className={selectCls}>
                                        {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={m.location}
                                        onChange={(e) => updateMeeting(m.id, { location: e.target.value })}
                                        placeholder="Location (optional)"
                                        disabled={disabled}
                                        className={cn(inputCls, 'flex-1')}
                                    />
                                    <label className={cn('flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-md border cursor-pointer', m.isFlexible ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400')}>
                                        <input type="checkbox" checked={m.isFlexible} onChange={(e) => updateMeeting(m.id, { isFlexible: e.target.checked })} disabled={disabled} className="sr-only" />
                                        Flexible
                                    </label>
                                </div>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            onClick={() => addMeeting({ id: uid(), title: '', startTime: '', endTime: '', location: '', priority: 'medium', isFlexible: false })}
                            className="w-full h-8 text-[10px] font-bold border-dashed"
                        >
                            <Plus className="h-3 w-3 mr-1" /> Add Meeting
                        </Button>
                    </CardContent>
                )}
            </Card>

            {/* ── Tasks ── */}
            <Card className="border-slate-200">
                <CardHeader className="py-3 px-4 cursor-pointer select-none" onClick={() => setTasksOpen(!tasksOpen)}>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 text-emerald-500" /> Tasks
                            <span className="ml-1 bg-emerald-100 text-emerald-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                        </CardTitle>
                        {tasksOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                </CardHeader>
                {tasksOpen && (
                    <CardContent className="px-4 pb-4 space-y-3">
                        {tasks.map((t) => (
                            <div key={t.id} className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100 relative group">
                                <button
                                    onClick={() => removeTask(t.id)}
                                    disabled={disabled}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <input
                                    value={t.title}
                                    onChange={(e) => updateTask(t.id, { title: e.target.value })}
                                    placeholder="Task title"
                                    disabled={disabled}
                                    className={cn(inputCls, 'font-medium')}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[9px] text-slate-400 block mb-0.5">Duration (min)</label>
                                        <input
                                            type="number"
                                            value={t.estimatedDuration}
                                            onChange={(e) => updateTask(t.id, { estimatedDuration: +e.target.value })}
                                            disabled={disabled}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-slate-400 block mb-0.5">Priority</label>
                                        <select value={t.priority} onChange={(e) => updateTask(t.id, { priority: e.target.value as Priority })} disabled={disabled} className={selectCls}>
                                            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-slate-400 block mb-0.5">Category</label>
                                        <select value={t.category} onChange={(e) => updateTask(t.id, { category: e.target.value as TaskCategory })} disabled={disabled} className={selectCls}>
                                            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <label className={cn('flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border cursor-pointer', t.requiresTravel ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-400')}>
                                        <input type="checkbox" checked={t.requiresTravel} onChange={(e) => updateTask(t.id, { requiresTravel: e.target.checked })} disabled={disabled} className="sr-only" />
                                        <MapPin className="h-2.5 w-2.5" /> Travel
                                    </label>
                                    <label className={cn('flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border cursor-pointer', t.flexibleDeadline ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-400')}>
                                        <input type="checkbox" checked={t.flexibleDeadline} onChange={(e) => updateTask(t.id, { flexibleDeadline: e.target.checked })} disabled={disabled} className="sr-only" />
                                        Flexible
                                    </label>
                                </div>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            onClick={() => addTask({ id: uid(), title: '', deadline: '', estimatedDuration: 30, priority: 'medium', requiresTravel: false, flexibleDeadline: false, category: 'work' })}
                            className="w-full h-8 text-[10px] font-bold border-dashed"
                        >
                            <Plus className="h-3 w-3 mr-1" /> Add Task
                        </Button>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
