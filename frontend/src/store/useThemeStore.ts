import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'system',
            setTheme: (theme) => {
                set({ theme });
                updateThemeClass(theme);
            },
            toggleTheme: () => {
                const currentTheme = get().theme;
                const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
                set({ theme: nextTheme });
                updateThemeClass(nextTheme);
            },
        }),
        {
            name: 'app-theme-storage',
        }
    )
);

function updateThemeClass(theme: 'light' | 'dark' | 'system') {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
    } else {
        root.classList.add(theme);
    }
}

// Initialize theme on load
if (typeof window !== 'undefined') {
    const theme = useThemeStore.getState().theme;
    updateThemeClass(theme);
}
