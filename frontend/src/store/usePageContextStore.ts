/**
 * usePageContextStore — Tracks which page the user is on and what data is visible.
 *
 * Pages call `setPageContext(...)` on mount/update so the voice assistant
 * can include the current page's data in its queries to the AI.
 */
import { create } from 'zustand';

export interface PageContext {
    /** Route path, e.g. '/email', '/tasks', '/calendar' */
    page: string;
    /** Human label, e.g. 'Email Inbox', 'Tasks' */
    pageLabel: string;
    /** Summary of what's currently visible on screen (sent to the LLM) */
    visibleContent: string;
}

interface PageContextState {
    context: PageContext | null;
    setPageContext: (ctx: PageContext) => void;
    clearPageContext: () => void;
}

export const usePageContextStore = create<PageContextState>((set) => ({
    context: null,
    setPageContext: (ctx) => set({ context: ctx }),
    clearPageContext: () => set({ context: null }),
}));
