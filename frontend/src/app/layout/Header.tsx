import React from 'react';
import { Bell, Search, Menu, Moon, Sun } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useThemeStore } from '../../store/useThemeStore';


interface HeaderProps {
    onOpenMobileMenu: () => void;
    isSidebarCollapsed: boolean;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
    const { theme, toggleTheme } = useThemeStore();

    return (
        <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300">
            {/* Left side: Mobile menu & search */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={onOpenMobileMenu}
                    className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <Menu className="h-6 w-6" />
                </button>

                <div className="relative group hidden sm:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors">
                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-brand-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-64 md:w-80 pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        placeholder="Search anything..."
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[10px] font-medium text-slate-400 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded-md">
                            Ctrl K
                        </span>
                    </div>
                </div>
            </div>

            {/* Right side: Actions & Profile */}
            <div className="flex items-center space-x-2 md:space-x-4">
                <div className="flex items-center space-x-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="h-10 w-10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>

                    <Button variant="ghost" size="icon" className="relative h-10 w-10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2.5 right-2.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>
                    </Button>
                </div>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

                <div className="flex items-center space-x-3 pl-2">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">Arun Kumar</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Pro Plan</p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 cursor-pointer overflow-hidden p-0.5">
                        <div className="h-full w-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">AK</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
