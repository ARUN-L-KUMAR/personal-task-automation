import { create } from 'zustand';
import { getDashboardSummary, DashboardSummary } from '../services/dashboard.service';

const AGENT_KEYS = ['calendar', 'tasks', 'email', 'conflict', 'travel', 'planning'] as const;

let _isFetching = false;  // module-level guard prevents concurrent / repeated fetches

interface DashboardState {
    data: DashboardSummary | null;
    loading: boolean;
    error: string | null;
    executionStates: Record<string, string>;
    fetchDashboard: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    data: null,
    loading: false,
    error: null,
    executionStates: {},

    fetchDashboard: async () => {
        // Prevent concurrent or repeated fetches
        if (_isFetching || get().loading) return;
        _isFetching = true;
        /* Phase 0 — reset all agents to idle (grey) */
        const init: Record<string, string> = {};
        AGENT_KEYS.forEach((k) => (init[k] = 'idle'));
        set({ loading: true, error: null, executionStates: init });

        /* Phase 1 — sequential "running" animation (parallel with fetch) */
        const animateRunning = async () => {
            for (const key of AGENT_KEYS) {
                await new Promise<void>((r) => setTimeout(r, 250));
                set((s) => ({
                    executionStates: { ...s.executionStates, [key]: 'running' },
                }));
            }
        };

        let summary: DashboardSummary | null = null;

        try {
            [summary] = await Promise.all([getDashboardSummary(), animateRunning()]);
        } catch (err: any) {
            console.error('Dashboard fetch failed:', err);
            const errStates: Record<string, string> = {};
            AGENT_KEYS.forEach((k) => (errStates[k] = 'error'));
            set({
                loading: false,
                error: err?.message || 'Failed to load dashboard data',
                executionStates: errStates,
            });
            _isFetching = false;
            return;
        }

        /* Phase 2 — sequential resolve to final agent status */
        for (const key of AGENT_KEYS) {
            await new Promise<void>((r) => setTimeout(r, 180));
            const finalStatus = (summary.agent_status as any)?.[key] || 'success';
            set((s) => ({
                executionStates: { ...s.executionStates, [key]: finalStatus },
            }));
        }

        set({ data: summary, loading: false });
        _isFetching = false;

        /* Keep final states visible, then clear to fall back to static display */
        setTimeout(() => set({ executionStates: {} }), 3000);
    },
}));
