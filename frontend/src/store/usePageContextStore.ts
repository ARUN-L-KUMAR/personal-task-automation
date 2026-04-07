/**
 * usePageContextStore — Tracks which page the user is on and what data is visible.
 *
 * Pages call `setPageContext(...)` on mount/update so the voice assistant
 * can include the current page's data in its queries to the AI.
 */
import { create } from 'zustand';
import type { ReactNode } from 'react';

export interface PageContext {
    /** Route path, e.g. '/email', '/tasks', '/calendar' */
    page: string;
    /** Human label, e.g. 'Email Inbox', 'Tasks' */
    pageLabel: string;
    /** Summary of what's currently visible on screen (sent to the LLM) */
    visibleContent: string;
}

export interface SharedHeaderContext {
    /** Optional short status/summary line rendered in the global header. */
    summary?: ReactNode;
    /** Optional page-specific action controls rendered in the global header. */
    actions?: ReactNode;
    /** Hide default global search input for pages with custom controls. */
    hideSearch?: boolean;
    /** Optional override for the search placeholder. */
    searchPlaceholder?: string;
}

interface PageContextState {
    context: PageContext | null;
    headerContext: SharedHeaderContext | null;
    setPageContext: (ctx: PageContext) => void;
    clearPageContext: () => void;
    setHeaderContext: (ctx: SharedHeaderContext) => void;
    clearHeaderContext: () => void;
}

export const usePageContextStore = create<PageContextState>((set) => ({
    context: null,
    headerContext: null,
    setPageContext: (ctx) => set({ context: ctx }),
    clearPageContext: () => set({ context: null }),
    setHeaderContext: (ctx) => set({ headerContext: ctx }),
    clearHeaderContext: () => set({ headerContext: null }),
}));
