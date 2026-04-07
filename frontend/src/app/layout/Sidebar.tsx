import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, History, Settings, Bot,
    Mail, CheckSquare, Map,
    MessageSquare, Mic, ChevronLeft, ChevronRight, X,
    Wifi, WifiOff, Zap, BarChart3, LayoutGrid,
    LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/useAuthStore';
import { useGoogleStatus } from '../../hooks/useGoogleStatus';

interface SidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onCloseMobile: () => void;
}

const navSections = [
    {
        title: 'Core',
        items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'Plan Day', href: '/planner', icon: Zap },
            { name: 'Chatbot', href: '/chatbot', icon: MessageSquare },
        ]
    },
    {
        title: 'Intelligence',
        items: [
            { name: 'Productivity Insights', href: '/insights', icon: BarChart3 },
            { name: 'History', href: '/history', icon: History },
            { name: 'Voice Assistant', href: '/voice-assistant', icon: Mic },
        ]
    },
    {
        title: 'Google Services',
        items: [
             { name: 'Email', href: '/email', icon: Mail },
            { name: 'Tasks', href: '/tasks', icon: CheckSquare },
            { name: 'Calendar', href: '/calendar', icon: Calendar },
            
           
            { name: 'Maps', href: '/maps', icon: Map },
            { name: 'ALL', href: '/all', icon: LayoutGrid }
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
    const { user, isAuthenticated, logout } = useAuthStore();
    const { isGoogleConnected, isChecking } = useGoogleStatus();
    const navigate = useNavigate();

    // Build initials from user name
    const initials = user?.name
        ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className={cn(
            "h-screen flex flex-col bg-[#F1F5F9] dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800/60 transition-all duration-500 ease-in-out relative z-50",
            isCollapsed ? "w-20" : "w-60"
        )}>
            {/* Logo Section */}
            <div className="h-20 flex items-center px-6 mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                        <Bot className="h-6 w-6 text-white" />
                    </div>
                    {!isCollapsed && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-xl font-black text-slate-900 dark:text-white tracking-tighter"
                        >
                            G-ONE
                        </motion.span>
                    )}
                </div>

                <button
                    onClick={onCloseMobile}
                    className="md:hidden ml-auto p-2 text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            {/* Navigation Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-10">
                <nav className="space-y-6">
                    {navSections.map((section, sectionIdx) => (
                        <div key={section.title} className={sectionIdx > 0 ? 'pt-2' : ''}>
                            {!isCollapsed && (
                                <h3 className="px-4 text-[8.5px] font-medium text-slate-400/60 dark:text-slate-500/50 uppercase tracking-[0.3em] mb-3">
                                    {section.title}
                                </h3>
                            )}
                            {isCollapsed && sectionIdx > 0 && (
                                <div className="mx-3 mb-3 border-t border-slate-200/60 dark:border-slate-700/40" />
                            )}
                            <div className="space-y-0.5">
                                {section.items.map((item) => (
                                    <NavLink
                                        key={item.name}
                                        to={item.href}
                                        end={item.href === '/'}
                                        className={({ isActive }) => cn(
                                            "group flex items-center py-2.5 text-[13px] font-medium rounded-xl transition-all duration-150 relative overflow-hidden",
                                            isCollapsed ? "px-0 justify-center" : "px-4",
                                            isActive
                                                ? "bg-[#EEF2FF] dark:bg-brand-500/10 text-blue-700 dark:text-brand-400 border-l-[3px] border-blue-600 dark:border-brand-400 [&_.nav-icon]:text-blue-600 dark:[&_.nav-icon]:text-brand-400"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border-l-[3px] border-transparent [&_.nav-icon]:text-slate-400 dark:[&_.nav-icon]:text-slate-500"
                                        )}
                                        title={isCollapsed ? item.name : ''}
                                    >
                                        <item.icon className={cn(
                                            "nav-icon flex-shrink-0 h-[18px] w-[18px] transition-all duration-150 group-hover:scale-105 group-hover:text-blue-600 dark:group-hover:text-brand-400",
                                            isCollapsed ? "mx-auto" : "mr-3"
                                        )} />
                                        {!isCollapsed && (
                                            <span className="truncate">{item.name}</span>
                                        )}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Status Footer */}
            <div className={cn("transition-all duration-300", isCollapsed ? "px-2 pb-3 pt-2" : "p-4")}>
                <div className={cn(
                    "transition-all duration-500 relative overflow-hidden group/card shadow-sm",
                    isCollapsed ? "rounded-xl" : "rounded-2xl",
                    isGoogleConnected
                        ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
                        : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50",
                    isCollapsed ? "p-2" : "p-4"
                )}>
                    <div className={cn("flex items-center relative z-10", isCollapsed ? "justify-center" : "gap-4")}>
                        <div className="relative flex-shrink-0">
                            <div className={cn(
                                "rounded-xl flex items-center justify-center font-black",
                                isCollapsed ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs",
                                isGoogleConnected
                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
                                    : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                            )}>
                                {initials}
                            </div>
                            <div className={cn(
                                "absolute rounded-full border-[2px]",
                                isCollapsed
                                    ? "-bottom-0.5 -right-0.5 h-2.5 w-2.5 border-white dark:border-slate-900"
                                    : "-bottom-1 -right-1 h-3.5 w-3.5 border-white dark:border-slate-900",
                                isChecking ? "bg-amber-400 animate-pulse" : isGoogleConnected ? "bg-emerald-400" : "bg-rose-500"
                            )} />
                        </div>

                        {!isCollapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {user?.name || 'User'}
                                </p>
                                <div className={cn(
                                    "text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5",
                                    isGoogleConnected ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                                )}>
                                    {isChecking ? (
                                        <><Wifi className="h-3 w-3 animate-pulse" /> Checking…</>
                                    ) : isGoogleConnected ? (
                                        <><Wifi className="h-3 w-3" /> Google Connected</>
                                    ) : (
                                        <><WifiOff className="h-3 w-3" /> Google Disconnected</>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Logout button */}
                        {!isCollapsed && isAuthenticated && (
                            <button
                                onClick={handleLogout}
                                title="Sign out"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <button
                    onClick={onToggleCollapse}
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className={cn(
                        "mt-2 w-full flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-brand-400 transition-all duration-150 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow",
                        isCollapsed ? "h-8" : "h-9 mt-3"
                    )}
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}
