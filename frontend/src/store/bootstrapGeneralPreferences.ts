import api from '../services/api';
import {
    isAppLanguage,
    isDateFormat,
    isStartOfWeek,
    isTimeFormat,
    useGeneralPreferencesStore,
} from './useGeneralPreferencesStore';

let didBootstrap = false;

async function bootstrapGeneralPreferences() {
    if (didBootstrap || typeof window === 'undefined') return;
    didBootstrap = true;

    const token = localStorage.getItem('g-one_token');
    if (!token) return;

    try {
        const { data } = await api.get('/api/settings');
        const incoming = data?.preferences?.general || {};

        useGeneralPreferencesStore.getState().setGeneralPreferences({
            language: isAppLanguage(incoming.language) ? incoming.language : undefined,
            timezone: typeof incoming.timezone === 'string' ? incoming.timezone : data?.timezone,
            timeFormat: isTimeFormat(incoming.time_format) ? incoming.time_format : undefined,
            dateFormat: isDateFormat(incoming.date_format) ? incoming.date_format : undefined,
            startOfWeek: isStartOfWeek(incoming.start_of_week) ? incoming.start_of_week : undefined,
        });
    } catch {
        // Keep persisted local preferences when backend fetch fails.
    }
}

void bootstrapGeneralPreferences();
