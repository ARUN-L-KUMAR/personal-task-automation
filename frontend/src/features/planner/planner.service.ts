import api from '../../services/api';
import {
    PlannerResult,
    MeetingInput,
    TaskInput,
    PlannerSettings,
    ScheduleEntry,
    ConflictItem,
    TravelPlan,
    AIExplanation,
    IntelligenceInsights,
} from '../../types/planner.types';

function parseMinutes(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return 0;
    const normalized = value.toLowerCase();
    const hourMatch = normalized.match(/(\d+)\s*h/);
    const minMatch = normalized.match(/(\d+)\s*m/);
    if (hourMatch || minMatch) {
        const hours = hourMatch ? Number(hourMatch[1]) : 0;
        const mins = minMatch ? Number(minMatch[1]) : 0;
        return hours * 60 + mins;
    }
    const numberMatch = normalized.match(/\d+/);
    return numberMatch ? Number(numberMatch[0]) : 0;
}

type ParsedRoute = {
    from: string;
    to: string;
    minutes: number;
    departure: string;
};

function toMinutes(hhmm: string, fallback = 0): number {
    if (!hhmm || !hhmm.includes(':')) return fallback;
    const [h, m] = hhmm.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback;
    return h * 60 + m;
}

function toHHMM(total: number): string {
    const safe = Math.max(0, total);
    const h = Math.floor(safe / 60) % 24;
    const m = safe % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isPhysicalLocation(location: string): boolean {
    const l = (location || '').trim().toLowerCase();
    if (!l) return false;
    return !['zoom', 'virtual', 'google meet', 'meet', 'online', 'remote'].some((x) => l.includes(x));
}

function buildDemoSchedule(
    settings: PlannerSettings,
    meetings: MeetingInput[],
    tasks: TaskInput[]
): ScheduleEntry[] {
    const workStart = toMinutes(settings.workStart, 9 * 60);
    const sortedMeetings = [...meetings]
        .filter((m) => m.startTime && m.endTime)
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    const taskQueue = tasks
        .filter((t) => t.title?.trim())
        .map((t) => ({ title: t.title.trim(), duration: Math.max(15, t.estimatedDuration || 30), priority: t.priority }));

    const schedule: ScheduleEntry[] = [];
    let cursor = workStart;
    let taskIndex = 0;

    const placeTask = (start: number, duration: number, title: string, priority: TaskInput['priority']) => {
        const end = start + duration;
        schedule.push({
            time: toHHMM(start),
            endTime: toHHMM(end),
            title,
            type: 'task',
            priority,
        });
        return end;
    };

    for (const meeting of sortedMeetings) {
        const meetStart = toMinutes(meeting.startTime, cursor);
        const meetEnd = toMinutes(meeting.endTime, meetStart + 30);

        let gap = Math.max(0, meetStart - cursor);
        while (taskIndex < taskQueue.length && taskQueue[taskIndex].duration <= gap) {
            const t = taskQueue[taskIndex];
            cursor = placeTask(cursor, t.duration, t.title, t.priority);
            gap = Math.max(0, meetStart - cursor);
            taskIndex += 1;
        }

        schedule.push({
            time: meeting.startTime,
            endTime: meeting.endTime,
            title: meeting.title || 'Meeting',
            type: 'meeting',
            priority: meeting.priority,
            location: meeting.location,
        });
        cursor = Math.max(cursor, meetEnd);
    }

    while (taskIndex < taskQueue.length) {
        const t = taskQueue[taskIndex];
        cursor = placeTask(cursor, t.duration, t.title, t.priority);
        taskIndex += 1;
    }

    return schedule;
}

function buildDemoRoutes(meetings: MeetingInput[]): ParsedRoute[] {
    const orderedLocations = meetings
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
        .map((m) => (m.location || '').trim())
        .filter((loc) => isPhysicalLocation(loc));

    if (orderedLocations.length < 2) return [];

    return orderedLocations.slice(0, -1).map((from, i) => {
        const to = orderedLocations[i + 1];
        const minutes = 20 + (i % 3) * 10;
        return {
            from,
            to,
            minutes,
            departure: '',
        };
    });
}

function enrichManualDemoResult(
    result: PlannerResult,
    settings: PlannerSettings,
    meetings: MeetingInput[],
    tasks: TaskInput[]
): PlannerResult {
    const expectedMinEntries = meetings.length + tasks.length;
    const schedule = result.schedule.length < expectedMinEntries
        ? buildDemoSchedule(settings, meetings, tasks)
        : result.schedule;

    let travel = result.travel;
    if (travel.routes.length === 0) {
        const demoRoutes = buildDemoRoutes(meetings);
        if (demoRoutes.length > 0) {
            const routeTotal = demoRoutes.reduce((sum, r) => sum + r.minutes, 0);
            travel = {
                ...travel,
                routes: demoRoutes,
                travelEventCount: demoRoutes.length,
                longestRouteMinutes: Math.max(...demoRoutes.map((r) => r.minutes)),
                totalMinutes: Math.max(travel.totalMinutes, routeTotal),
            };
        }
    }

    return {
        ...result,
        schedule,
        travel,
    };
}

function parseTimeBlock(value: unknown): { start: string; end: string } {
    if (typeof value !== 'string') return { start: '', end: '' };
    const normalized = value.trim();
    const m = normalized.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (!m) return { start: '', end: '' };
    return { start: m[1], end: m[2] };
}

/* ── Helper — normalise any backend shape into PlannerResult ── */
function normalise(raw: any): PlannerResult {
    const plan = raw.rule_based_plan || raw.optimized_plan || '';
    const conflictRaw = raw.conflict_analysis || raw.conflicts || '';
    const travelRaw = raw.travel_reminders || raw.travel_plan || '';
    const explainRaw = raw.ai_explanation || raw.final_response || '';

    // Parse schedule entries from optimized plan text
    const schedule: ScheduleEntry[] = [];
    let parsedPlanObject: any = null;
    if (typeof plan === 'string' && plan.trim().startsWith('{')) {
        try {
            parsedPlanObject = JSON.parse(plan);
        } catch {
            parsedPlanObject = null;
        }
    }

    if (typeof plan === 'string' && !parsedPlanObject) {
        const lines = plan.split('\n').filter((l: string) => l.trim());
        const timeRe = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*[:|]?\s*(.*)/i;
        lines.forEach((line: string) => {
            const m = timeRe.exec(line.trim());
            if (m) {
                const title = m[3].trim();
                const type = /travel|commute|drive/i.test(title)
                    ? 'travel'
                    : /break|lunch/i.test(title)
                    ? 'break'
                    : /meeting|call|standup|sync/i.test(title)
                    ? 'meeting'
                    : 'task';
                schedule.push({ time: m[1], endTime: m[2], title, type: type as any });
            }
        });
    } else if (Array.isArray(plan)) {
        plan.forEach((e: any) =>
            schedule.push({
                time: e.time || e.start || '',
                endTime: e.endTime || e.end || '',
                title: e.title || '',
                type: e.type || 'task',
            })
        );
    } else if ((plan && typeof plan === 'object') || parsedPlanObject) {
        const source = parsedPlanObject || plan;
        const entries = source.optimized_schedule || source.schedule || source.timeline || [];
        if (Array.isArray(entries)) {
            entries.forEach((e: any) => {
                const block = parseTimeBlock(e.time_block || e.time || e.slot || '');
                schedule.push({
                    time: block.start || e.startTime || e.start || '',
                    endTime: block.end || e.endTime || e.end || '',
                    title: e.activity || e.title || 'Planned activity',
                    type: e.type || 'task',
                    priority: e.priority,
                    location: e.location || '',
                });
            });
        }
    }

    // Parse conflicts
    const conflicts: ConflictItem[] = [];
    if (typeof conflictRaw === 'string' && conflictRaw.length > 5) {
        conflicts.push({
            type: 'schedule',
            severity: 'medium',
            eventA: '-',
            eventB: '-',
            overlapMinutes: 0,
            suggestion: conflictRaw,
        });
    } else if (conflictRaw && typeof conflictRaw === 'object' && Array.isArray((conflictRaw as any).conflicts)) {
        (conflictRaw as any).conflicts.forEach((c: any) =>
            conflicts.push({
                type: c.type || 'schedule',
                severity: c.severity || 'medium',
                eventA: c.items_involved?.[0] || c.event_a || c.eventA || '-',
                eventB: c.items_involved?.[1] || c.event_b || c.eventB || '-',
                overlapMinutes: c.overlap_minutes || 0,
                suggestion: c.description || c.suggestion || '',
            })
        );
    } else if (Array.isArray(conflictRaw)) {
        conflictRaw.forEach((c: any) =>
            conflicts.push({
                type: c.type || 'schedule',
                severity: c.severity || 'medium',
                eventA: c.event_a || c.eventA || '-',
                eventB: c.event_b || c.eventB || '-',
                overlapMinutes: c.overlap_minutes || 0,
                suggestion: c.suggestion || '',
            })
        );
    }

    // Travel
    const routes: ParsedRoute[] = typeof travelRaw === 'object' && Array.isArray((travelRaw as any).routes)
        ? (travelRaw as any).routes.map((r: any) => ({
              from: r.origin || r.from || 'Unknown',
              to: r.destination || r.to || 'Unknown',
              minutes: parseMinutes(r.duration_text || r.duration || r.minutes),
              departure: r.departure || '',
          }))
        : [];
    const totalFromRoutes = routes.reduce((acc: number, r: ParsedRoute) => acc + (Number.isFinite(r.minutes) ? r.minutes : 0), 0);
    const totalMinutes = typeof travelRaw === 'object'
        ? travelRaw.total_minutes || parseMinutes(travelRaw.total_travel_time) || totalFromRoutes
        : 0;
    const travel: TravelPlan = {
        totalMinutes,
        travelEventCount: typeof travelRaw === 'object' ? travelRaw.travel_event_count || routes.length : 0,
        longestRouteMinutes: typeof travelRaw === 'object'
            ? travelRaw.longest_route_minutes || Math.max(0, ...routes.map((r: ParsedRoute) => r.minutes || 0))
            : 0,
        optimizationTip: typeof travelRaw === 'string'
            ? travelRaw
            : travelRaw?.optimization_tip || travelRaw?.summary || 'No travel optimization needed.',
        routes,
    };

    // Explanation
    const explanation: AIExplanation =
        typeof explainRaw === 'object'
            ? explainRaw
            : {
                  summary: typeof explainRaw === 'string' ? explainRaw : 'Optimization complete.',
                  issues: [],
                  recommendations: [],
                  timeManagement: '',
              };

    // Intelligence insights — derived
    const totalTaskMins = schedule.filter((s) => s.type === 'task').reduce((a, s) => {
        const [sh, sm] = s.time.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        return a + (eh * 60 + em - sh * 60 - sm);
    }, 0);
    const meetingCount = schedule.filter((s) => s.type === 'meeting').length;
    const score = Math.min(100, Math.max(0, 100 - conflicts.length * 15 - (meetingCount > 5 ? 20 : 0)));

    // Calculate total scheduled minutes (tasks + meetings) and work-hour capacity
    const meetingMins = schedule.filter((s) => s.type === 'meeting').reduce((a, s) => {
        const [sh, sm] = s.time.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        return a + Math.max(0, eh * 60 + em - sh * 60 - sm);
    }, 0);
    const totalScheduled = totalTaskMins + meetingMins;
    const workCapacity = 8 * 60; // default 8h
    const utilizationPercent = Math.min(100, Math.round((totalScheduled / workCapacity) * 100));
    const freeTimeMinutes = Math.max(0, workCapacity - totalScheduled);

    const insights: IntelligenceInsights = {
        overloadDetected: totalTaskMins > 480,
        overloadMessage: totalTaskMins > 480 ? `Task load is ${Math.round(totalTaskMins / 60)}h — exceeds 8h capacity.` : undefined,
        burnoutRisk: meetingCount >= 4,
        burnoutMessage: meetingCount >= 4 ? `${meetingCount} back-to-back meetings detected. Consider adding breaks.` : undefined,
        focusWindow: schedule.length > 0 ? 'Best focus block: early morning before first meeting.' : undefined,
        productivityScore: score,
        utilizationPercent,
        freeTimeMinutes,
    };

    return {
        status: raw.status || 'success',
        generated_at: raw.generated_at || new Date().toISOString(),
        schedule,
        conflicts,
        travel,
        explanation,
        insights,
        agentRawData: {
            calendar_analysis: raw.calendar_analysis,
            task_analysis: raw.task_analysis,
            conflicts: raw.conflict_analysis || raw.conflicts,
            travel_plan: raw.travel_reminders || raw.travel_plan,
            optimized_plan: raw.rule_based_plan || raw.optimized_plan,
            final_response: raw.ai_explanation || raw.final_response,
        },
        // Legacy compat
        conflict_analysis: typeof conflictRaw === 'string' ? conflictRaw : JSON.stringify(conflictRaw),
        travel_reminders: typeof travelRaw === 'string' ? travelRaw : JSON.stringify(travelRaw),
        rule_based_plan: typeof plan === 'string' ? plan : JSON.stringify(plan),
        ai_explanation: typeof explainRaw === 'string' ? explainRaw : JSON.stringify(explainRaw),
        calendar_analysis: raw.calendar_analysis,
        task_analysis: raw.task_analysis,
    };
}

export const plannerService = {
    /** Manual mode — send user-entered data */
    planDay: async (
        settings: PlannerSettings,
        meetings: MeetingInput[],
        tasks: TaskInput[]
    ): Promise<PlannerResult> => {
        const payload = {
            date: settings.date,
            meetings: meetings.map((m) => ({
                title: m.title,
                startTime: m.startTime,
                endTime: m.endTime,
                location: m.location,
                isFlexible: m.isFlexible,
                priority: m.priority,
            })),
            tasks: tasks.map((t) => ({
                title: t.title,
                duration: t.estimatedDuration,
                deadline: t.deadline,
                requiresTravel: t.requiresTravel,
                flexibleDeadline: t.flexibleDeadline,
                category: t.category,
                priority: t.priority,
            })),
        };
        const res = await api.post('/api/plan-day', payload);
        const normalized = normalise(res.data);
        return enrichManualDemoResult(normalized, settings, meetings, tasks);
    },

    /** Live mode — let backend fetch from Google */
    planDayLive: async (): Promise<PlannerResult> => {
        const res = await api.post('/api/plan-day-live');
        return normalise(res.data);
    },

    getLastOutput: async () => {
        const res = await api.get('/api/last-output');
        return res.data;
    },
};
