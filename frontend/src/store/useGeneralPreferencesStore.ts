import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppLanguage = 'en' | 'ta' | 'hi';
export type TimeFormat = '12h' | '24h';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type StartOfWeek = 'monday' | 'sunday';

export interface GeneralPreferenceValues {
    language: AppLanguage;
    timezone: string;
    timeFormat: TimeFormat;
    dateFormat: DateFormat;
    startOfWeek: StartOfWeek;
}

interface GeneralPreferencesState extends GeneralPreferenceValues {
    setGeneralPreferences: (patch: Partial<GeneralPreferenceValues>) => void;
}

const DEFAULT_GENERAL_PREFERENCES: GeneralPreferenceValues = {
    language: 'en',
    timezone: 'Asia/Kolkata',
    timeFormat: '12h',
    dateFormat: 'DD/MM/YYYY',
    startOfWeek: 'monday',
};

export const GENERAL_SETTINGS_EVENT = 'g1-general-settings-updated';

export const GENERAL_LANGUAGE_STORAGE_KEY = 'g1_pref_language';
export const GENERAL_TIMEZONE_STORAGE_KEY = 'g1_pref_timezone';
export const GENERAL_TIME_FORMAT_STORAGE_KEY = 'g1_pref_time_format';
export const GENERAL_DATE_FORMAT_STORAGE_KEY = 'g1_pref_date_format';
export const GENERAL_WEEK_START_STORAGE_KEY = 'g1_pref_start_of_week';

function toLocale(language: AppLanguage): string {
    if (language === 'ta') return 'ta-IN';
    if (language === 'hi') return 'hi-IN';
    return 'en-US';
}

export function isAppLanguage(value: unknown): value is AppLanguage {
    return value === 'en' || value === 'ta' || value === 'hi';
}

export function isTimeFormat(value: unknown): value is TimeFormat {
    return value === '12h' || value === '24h';
}

export function isDateFormat(value: unknown): value is DateFormat {
    return value === 'DD/MM/YYYY' || value === 'MM/DD/YYYY' || value === 'YYYY-MM-DD';
}

export function isStartOfWeek(value: unknown): value is StartOfWeek {
    return value === 'monday' || value === 'sunday';
}

function applyGeneralPreferences(values: GeneralPreferenceValues) {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    root.lang = toLocale(values.language);
    root.setAttribute('data-app-language', values.language);
    root.setAttribute('data-time-format', values.timeFormat);
    root.setAttribute('data-date-format', values.dateFormat);
    root.setAttribute('data-week-start', values.startOfWeek);

    localStorage.setItem(GENERAL_LANGUAGE_STORAGE_KEY, values.language);
    localStorage.setItem(GENERAL_TIMEZONE_STORAGE_KEY, values.timezone);
    localStorage.setItem(GENERAL_TIME_FORMAT_STORAGE_KEY, values.timeFormat);
    localStorage.setItem(GENERAL_DATE_FORMAT_STORAGE_KEY, values.dateFormat);
    localStorage.setItem(GENERAL_WEEK_START_STORAGE_KEY, values.startOfWeek);
}

export const useGeneralPreferencesStore = create<GeneralPreferencesState>()(
    persist(
        (set, get) => ({
            ...DEFAULT_GENERAL_PREFERENCES,
            setGeneralPreferences: (patch) => {
                const current = get();
                const next: GeneralPreferenceValues = {
                    language: patch.language ?? current.language,
                    timezone: patch.timezone ?? current.timezone,
                    timeFormat: patch.timeFormat ?? current.timeFormat,
                    dateFormat: patch.dateFormat ?? current.dateFormat,
                    startOfWeek: patch.startOfWeek ?? current.startOfWeek,
                };

                set(next);
                applyGeneralPreferences(next);
            },
        }),
        {
            name: 'app-general-preferences-storage',
        }
    )
);

// Apply persisted values at app boot.
if (typeof window !== 'undefined') {
    const state = useGeneralPreferencesStore.getState();
    applyGeneralPreferences({
        language: state.language,
        timezone: state.timezone,
        timeFormat: state.timeFormat,
        dateFormat: state.dateFormat,
        startOfWeek: state.startOfWeek,
    });
}
