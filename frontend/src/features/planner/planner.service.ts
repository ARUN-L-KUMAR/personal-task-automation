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

/* ── Helper — normalise any backend shape into PlannerResult ── */
function normalise(raw: any): PlannerResult {
    const plan = raw.rule_based_plan || raw.optimized_plan || '';
    const conflictRaw = raw.conflict_analysis || raw.conflicts || '';
    const travelRaw = raw.travel_reminders || raw.travel_plan || '';
    const explainRaw = raw.ai_explanation || raw.final_response || '';

    // Parse schedule entries from optimized plan text
    const schedule: ScheduleEntry[] = [];
    if (typeof plan === 'string') {
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
    const travel: TravelPlan = {
        totalMinutes: typeof travelRaw === 'object' ? travelRaw.total_minutes || 0 : 0,
        travelEventCount: typeof travelRaw === 'object' ? travelRaw.travel_event_count || 0 : 0,
        longestRouteMinutes: typeof travelRaw === 'object' ? travelRaw.longest_route_minutes || 0 : 0,
        optimizationTip: typeof travelRaw === 'string' ? travelRaw : travelRaw?.optimization_tip || 'No travel optimization needed.',
        routes: [],
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
                priority: m.priority,
            })),
            tasks: tasks.map((t) => ({
                title: t.title,
                duration: t.estimatedDuration,
                priority: t.priority,
            })),
        };
        const res = await api.post('/api/plan-day', payload);
        return normalise(res.data);
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
