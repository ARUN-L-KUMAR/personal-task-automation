import { create } from 'zustand';
import { PlannerResult, PlanHistoryItem } from '../types/planner.types';

interface PlannerState {
    currentResult: PlannerResult | null;
    history: PlanHistoryItem[];
    isLoading: boolean;
    error: string | null;

    // Actions
    setResult: (result: PlannerResult) => void;
    setHistory: (history: PlanHistoryItem[]) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    clearResult: () => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
    currentResult: null,
    history: [],
    isLoading: false,
    error: null,

    setResult: (result) => set({ currentResult: result, isLoading: false, error: null }),
    setHistory: (history) => set({ history }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false }),
    clearResult: () => set({ currentResult: null }),
}));
