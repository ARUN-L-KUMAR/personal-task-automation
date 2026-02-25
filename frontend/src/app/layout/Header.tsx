import React from 'react';
import { Bell, Search, Menu, Moon, Sun, Command as CommandIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useThemeStore } from '../../store/useThemeStore';
import { motion } from 'framer-motion';

interface HeaderProps {
    onOpenMobileMenu: () => void;
    isSidebarCollapsed: boolean;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
    const { theme, toggleTheme } = useThemeStore();

    return (
        <header className="h-20 flex items-center justify-between px-6 md:px-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-30 transition-all duration-300">
            {/* Left side: Mobile menu & search */}
            <div className="flex items-center space-x-6">
                <button
                    onClick={onOpenMobileMenu}
                    className="md:hidden p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                >
                    <Menu className="h-6 w-6" />
                </button>

                <div className="relative group hidden sm:block">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors">
                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-brand-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-72 md:w-96 pl-12 pr-4 py-3 bg-slate-100/50 dark:bg-slate-950/50 border border-transparent dark:border-slate-800/50 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-300"
                        placeholder="Search for tasks, events, colleagues..."
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
                            <CommandIcon className="h-2.5 w-2.5" />
                            <span>K</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side: Actions & Profile */}
            <div className="flex items-center space-x-3 md:space-x-6">
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
                        className="relative h-11 w-11 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-3 right-3 block h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-white dark:ring-slate-900 animate-pulse"></span>
                    </motion.button>
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block opacity-50"></div>

                <div className="flex items-center space-x-4 pl-2 group cursor-pointer">
                    <div className="hidden lg:block text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-tight transition-colors group-hover:text-brand-600">Arun Kumar</p>
                        <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Strategic Planner</p>
                    </div>
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 p-0.5 shadow-lg shadow-brand-500/20 group-hover:rotate-3 transition-transform">
                        <div className="h-full w-full rounded-[0.9rem] bg-white dark:bg-slate-900 flex items-center justify-center">
                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase">AK</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
