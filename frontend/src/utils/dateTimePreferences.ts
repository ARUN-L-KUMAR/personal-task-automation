import {
    type AppLanguage,
    type DateFormat,
    type GeneralPreferenceValues,
    type TimeFormat,
    useGeneralPreferencesStore,
} from '../store/useGeneralPreferencesStore';

type DateLike = Date | string | number;

type GeneralPreferenceOverrides = Partial<GeneralPreferenceValues>;

function toDate(value?: DateLike): Date | null {
    if (value == null) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function twoDigits(value: number): string {
    return value < 10 ? `0${value}` : String(value);
}

function languageToLocale(language: AppLanguage): string {
    if (language === 'ta') return 'ta-IN';
    if (language === 'hi') return 'hi-IN';
    return 'en-US';
}

function resolvePreferences(overrides?: GeneralPreferenceOverrides): GeneralPreferenceValues {
    const current = useGeneralPreferencesStore.getState();
    return {
        language: overrides?.language ?? current.language,
        timezone: overrides?.timezone ?? current.timezone,
        timeFormat: overrides?.timeFormat ?? current.timeFormat,
        dateFormat: overrides?.dateFormat ?? current.dateFormat,
        startOfWeek: overrides?.startOfWeek ?? current.startOfWeek,
    };
}

function datePartsInTimeZone(date: Date, timezone: string): { year: string; month: string; day: string } {
    const zonedDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const validDate = Number.isNaN(zonedDate.getTime()) ? date : zonedDate;

    return {
        year: String(validDate.getFullYear()),
        month: twoDigits(validDate.getMonth() + 1),
        day: twoDigits(validDate.getDate()),
    };
}

export function formatTimeByPreferences(value?: DateLike, fallback = 'N/A', overrides?: GeneralPreferenceOverrides): string {
    const date = toDate(value);
    if (!date) return fallback;

    const prefs = resolvePreferences(overrides);
    const locale = languageToLocale(prefs.language);

    return new Intl.DateTimeFormat(locale, {
        timeZone: prefs.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: prefs.timeFormat === '12h',
    }).format(date);
}

export function formatDateByPreferences(value?: DateLike, fallback = 'N/A', overrides?: GeneralPreferenceOverrides): string {
    const date = toDate(value);
    if (!date) return fallback;

    const prefs = resolvePreferences(overrides);
    const parts = datePartsInTimeZone(date, prefs.timezone);

    if (prefs.dateFormat === 'MM/DD/YYYY') {
        return `${parts.month}/${parts.day}/${parts.year}`;
    }
    if (prefs.dateFormat === 'YYYY-MM-DD') {
        return `${parts.year}-${parts.month}-${parts.day}`;
    }
    return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatDateTimeByPreferences(value?: DateLike, fallback = 'N/A', overrides?: GeneralPreferenceOverrides): string {
    const date = toDate(value);
    if (!date) return fallback;

    const dateText = formatDateByPreferences(date, fallback, overrides);
    const timeText = formatTimeByPreferences(date, fallback, overrides);
    if (dateText === fallback || timeText === fallback) return fallback;
    return `${dateText} ${timeText}`;
}

export function getWeekStartsOnByPreferences(overrides?: GeneralPreferenceOverrides): 0 | 1 {
    const prefs = resolvePreferences(overrides);
    return prefs.startOfWeek === 'sunday' ? 0 : 1;
}

export function getWeekdayLabelsByPreferences(
    formatType: 'short' | 'tiny' = 'short',
    overrides?: GeneralPreferenceOverrides,
): string[] {
    const prefs = resolvePreferences(overrides);

    const baseShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const baseTiny = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const base = formatType === 'tiny' ? baseTiny : baseShort;
    if (prefs.startOfWeek === 'sunday') {
        return [...base];
    }

    return [...base.slice(1), base[0]];
}

export function getDisplayLanguageLabel(language: AppLanguage): string {
    if (language === 'ta') return 'Tamil';
    if (language === 'hi') return 'Hindi';
    return 'English (US)';
}

export function toPreferenceOverrides(input: {
    language: string;
    timezone: string;
    time_format: string;
    date_format: string;
    start_of_week: string;
}): GeneralPreferenceOverrides {
    const language = input.language as AppLanguage;
    const timeFormat = input.time_format as TimeFormat;
    const dateFormat = input.date_format as DateFormat;

    return {
        language,
        timezone: input.timezone,
        timeFormat,
        dateFormat,
        startOfWeek: input.start_of_week === 'sunday' ? 'sunday' : 'monday',
    };
}
