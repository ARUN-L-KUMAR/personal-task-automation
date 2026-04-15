import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';

interface LayoutDensityState {
    density: LayoutDensity;
    setDensity: (density: LayoutDensity) => void;
}

function applyLayoutDensity(density: LayoutDensity) {
    const root = window.document.documentElement;
    root.setAttribute('data-layout-density', density);
}

export const useLayoutDensityStore = create<LayoutDensityState>()(
    persist(
        (set) => ({
            density: 'comfortable',
            setDensity: (density) => {
                set({ density });
                applyLayoutDensity(density);
            },
        }),
        {
            name: 'app-layout-density-storage',
        }
    )
);

// Apply persisted density on app boot.
if (typeof window !== 'undefined') {
    applyLayoutDensity(useLayoutDensityStore.getState().density);
}