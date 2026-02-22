import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, History, Settings, Bot,
    Mail, CheckSquare, Users, Map, FileSpreadsheet,
    MessageSquare, Mic, ChevronLeft, ChevronRight, X,
    Wifi, WifiOff
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/useAuthStore';

interface SidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onCloseMobile: () => void;
}

const navSections = [
    {
        title: 'Main',
        items: [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard },
            { name: 'AI Planner', href: '/planner', icon: Calendar },
            { name: 'History', href: '/history', icon: History },
        ]
    },
    {
        title: 'Google Services',
        items: [
            { name: 'Calendar', href: '/calendar', icon: Calendar },
            { name: 'Email', href: '/email', icon: Mail },
            { name: 'Tasks', href: '/tasks', icon: CheckSquare },
            { name: 'Contacts', href: '/contacts', icon: Users },
            { name: 'Maps', href: '/maps', icon: Map },
            { name: 'Sheets', href: '/sheets', icon: FileSpreadsheet },
        ]
    },
    {
        title: 'AI Assistant',
        items: [
            { name: 'AI Chatbot', href: '/chatbot', icon: MessageSquare },
            { name: 'Voice Chat', href: '/voice-assistant', icon: Mic },
        ]
    },
    {
        title: 'System',
        items: [
            { name: 'Settings', href: '/settings', icon: Settings },
        ]
    }
];

export function Sidebar({ isCollapsed, onToggleCollapse, onCloseMobile }: SidebarProps) {
    const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

    // ── Check auth status once on mount so the indicator is accurate ──
    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <div className={cn(
            "h-screen flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300",
            isCollapsed ? "w-20" : "w-64"
        )}>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
                {!isCollapsed && (
                    <div className="flex items-center space-x-2 animate-in fade-in duration-300">
                        <div className="bg-brand-600 p-1.5 rounded-lg shadow-sm">
                            <Bot className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Agentic AI</span>
                    </div>
                )}
                {isCollapsed && (
                    <Bot className="h-6 w-6 text-brand-600 mx-auto" />
                )}

                <button
                    onClick={onCloseMobile}
                    className="md:hidden p-1 text-slate-500 hover:bg-slate-100 rounded"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-6">
                <nav className="px-3 space-y-8">
                    {navSections.map((section) => (
                        <div key={section.title} className="space-y-1">
                            {!isCollapsed && (
                                <h3 className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    {section.title}
                                </h3>
                            )}
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    end={item.href === '/'}
                                    className={({ isActive }) => cn(
                                        "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                                        isActive
                                            ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                                    )}
                                    title={isCollapsed ? item.name : ''}
                                >
                                    <item.icon className={cn(
                                        "flex-shrink-0 h-5 w-5 transition-colors",
                                        isCollapsed ? "mx-auto" : "mr-3"
                                    )} />
                                    {!isCollapsed && <span>{item.name}</span>}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>
            </div>

            {/* Footer / Google Status */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <div className={cn(
                    "rounded-xl transition-all duration-300 overflow-hidden",
                    isAuthenticated
                        ? "bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30"
                        : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50",
                    isCollapsed ? "p-2" : "p-3"
                )}>
                    <div className="flex items-center gap-3">
                        {/* Avatar + status dot */}
                        <div className="relative flex-shrink-0">
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center border text-xs font-bold",
                                isAuthenticated
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                            )}>
                                AK
                            </div>
                            {/* Live status dot */}
                            <div className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2",
                                "border-white dark:border-slate-900",
                                isLoading
                                    ? "bg-amber-400 animate-pulse"
                                    : isAuthenticated
                                        ? "bg-emerald-500"
                                        : "bg-red-500"
                            )} />
                        </div>

                        {!isCollapsed && (
                            <div className="min-w-0 flex-1 animate-in slide-in-from-left-2 duration-300">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Arun Kumar</p>
                                <p className={cn(
                                    "text-xs truncate flex items-center gap-1 font-medium",
                                    isLoading
                                        ? "text-amber-500"
                                        : isAuthenticated
                                            ? "text-emerald-500"
                                            : "text-red-500"
                                )}>
                                    {isLoading ? (
                                        <><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse inline-block" /> Checking…</>
                                    ) : isAuthenticated ? (
                                        <><Wifi className="h-3 w-3" /> Google Connected</>
                                    ) : (
                                        <><WifiOff className="h-3 w-3" /> Not Connected</>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={onToggleCollapse}
                    className="hidden md:flex mt-3 w-full items-center justify-center p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </button>
            </div>
        </div>
    );
}
