import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calendarService } from '../services/calendar.service';
import { tasksService } from '../services/tasks.service';
import { emailService } from '../services/email.service';

interface SyncState {
    lastSynced: string | null;
    isSyncing: boolean;
    error: string | null;
    syncCalendar: () => Promise<void>;
    syncTasks: () => Promise<void>;
    syncEmail: () => Promise<void>;
    syncAll: () => Promise<void>;
}

export const useSyncStore = create<SyncState>()(
    persist(
        (set, get) => ({
            lastSynced: null,
            isSyncing: false,
            error: null,

            syncCalendar: async () => {
                set({ isSyncing: true, error: null });
                try {
                    await calendarService.getTodayEvents();
                    set({ lastSynced: new Date().toISOString() });
                } catch (err: any) {
                    set({ error: err.message || 'Failed to sync Calendar' });
                } finally {
                    set({ isSyncing: false });
                }
            },

            syncTasks: async () => {
                set({ isSyncing: true, error: null });
                try {
                    await tasksService.getTasks();
                    set({ lastSynced: new Date().toISOString() });
                } catch (err: any) {
                    set({ error: err.message || 'Failed to sync Tasks' });
                } finally {
                    set({ isSyncing: false });
                }
            },

            syncEmail: async () => {
                set({ isSyncing: true, error: null });
                try {
                    await emailService.getInbox();
                    set({ lastSynced: new Date().toISOString() });
                } catch (err: any) {
                    set({ error: err.message || 'Failed to sync Email' });
                } finally {
                    set({ isSyncing: false });
                }
            },

            syncAll: async () => {
                set({ isSyncing: true, error: null });
                try {
                    await Promise.all([
                        get().syncCalendar(),
                        get().syncTasks(),
                        get().syncEmail()
                    ]);
                    set({ lastSynced: new Date().toISOString() });
                } catch (err: any) {
                    set({ error: 'One or more services failed to sync' });
                } finally {
                    set({ isSyncing: false });
                }
            }
        }),
        {
            name: 'sync-storage',
        }
    )
);
