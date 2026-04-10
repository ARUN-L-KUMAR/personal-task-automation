import React, { useMemo } from 'react';
import { Bell, Search, Menu, Moon, Sun, Command as CommandIcon } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePageContextStore } from '../../store/usePageContextStore';

const routeMeta: Array<{ path: string; title: string; subtitle: string }> = [
    { path: '/dashboard', title: 'Dashboard', subtitle: 'Overview and daily execution' },
    { path: '/planner', title: 'Plan Day', subtitle: 'AI orchestration pipeline' },
    { path: '/calendar', title: 'Calendar', subtitle: 'Meetings and schedule timeline' },
    { path: '/tasks', title: 'Tasks & Notes', subtitle: 'Work queue and action tracking' },
    { path: '/email', title: 'Email Inbox', subtitle: 'Smart inbox triage' },
    { path: '/contacts', title: 'Contacts', subtitle: 'People and relationships' },
    { path: '/maps', title: 'Maps', subtitle: 'Routes and commute planning' },
    { path: '/sheets', title: 'Sheets', subtitle: 'Spreadsheet assistant' },
    { path: '/notes', title: 'Notes', subtitle: 'Knowledge capture and recall' },
    { path: '/chatbot', title: 'Chatbot', subtitle: 'Conversational workspace assistant' },
    { path: '/voice-assistant', title: 'Voice Assistant', subtitle: 'Hands-free productivity controls' },
    { path: '/insights', title: 'Insights', subtitle: 'Trends and performance analytics' },
    { path: '/history', title: 'History', subtitle: 'Past actions and session trail' },
    { path: '/settings', title: 'Settings', subtitle: 'Account and workspace preferences' },
    { path: '/google-connect', title: 'Google Connect', subtitle: 'Service authorization status' },
];

function getRouteMeta(pathname: string): { title: string; subtitle: string } {
    const match = routeMeta.find((item) => pathname.startsWith(item.path));
    if (match) {
        return { title: match.title, subtitle: match.subtitle };
    }
    return { title: 'Workspace', subtitle: 'Productivity command center' };
}

interface HeaderProps {
    onOpenMobileMenu: () => void;
    isSidebarCollapsed: boolean;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
    const { theme, toggleTheme } = useThemeStore();
    const { context, headerContext } = usePageContextStore();
    const location = useLocation();
    const navigate = useNavigate();

    const meta = useMemo(() => getRouteMeta(location.pathname), [location.pathname]);
    const title = context?.pageLabel || meta.title;
    const subtitle = meta.subtitle;
    const searchPlaceholder = headerContext?.searchPlaceholder || 'Search for tasks, events, colleagues...';
    const showSearch = !headerContext?.hideSearch;
    const hasHeaderSummary = Boolean(headerContext?.summary);
    const hasHeaderActions = Boolean(headerContext?.actions);

    return (
        <header className="px-6 md:px-10 py-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-30 transition-all duration-300">
            <div className="flex items-center justify-between gap-4">
                {/* Left side: Mobile menu, page title, and search */}
                <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
                    <button
                        onClick={onOpenMobileMenu}
                        className="md:hidden p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <p className="truncate text-lg font-black tracking-tight text-slate-900 dark:text-white sm:hidden">
                        {title}
                    </p>

                    <div className="hidden min-w-[180px] md:block">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {subtitle}
                        </p>
                        <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            {title}
                        </h1>
                    </div>

                    {showSearch && (
                        <div className="relative group hidden sm:block w-full max-w-xl">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors">
                                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-brand-500" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-12 pr-4 py-3 bg-slate-100/50 dark:bg-slate-950/50 border border-transparent dark:border-slate-800/50 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-300"
                                placeholder={searchPlaceholder}
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
                                    <CommandIcon className="h-2.5 w-2.5" />
                                    <span>K</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right side: page actions + global controls */}
                <div className="flex items-center space-x-3 md:space-x-4">
                    {hasHeaderActions && (
                        <div className="hidden lg:flex items-center gap-2">
                            {headerContext?.actions}
                        </div>
                    )}

                    <div className="flex items-center space-x-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleTheme}
                            className="h-11 w-11 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/settings')}
                            aria-label="Open notifications settings"
                            title="Notifications"
                            className="relative h-11 w-11 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-3 right-3 block h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-white dark:ring-slate-900 animate-pulse"></span>
                        </motion.button>
                    </div>
                </div>
            </div>

            {(hasHeaderSummary || hasHeaderActions) && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        {headerContext?.summary}
                    </div>
                    {hasHeaderActions && (
                        <div className="flex lg:hidden items-center gap-2">
                            {headerContext?.actions}
                        </div>
                    )}
                </div>
            )}
        </header>
    );
}
