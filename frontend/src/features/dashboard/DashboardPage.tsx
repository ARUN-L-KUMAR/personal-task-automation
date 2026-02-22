import React from 'react';
import {
    Calendar, CheckCircle2, Mail, Sparkles,
    Plus, Send, ListPlus, ArrowUpRight
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../utils/cn';

export function DashboardPage() {
    const { isAuthenticated } = useAuthStore();

    const stats = [
        { label: "Today's Events", value: "4", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
        { label: "Pending Tasks", value: "12", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
        { label: "Unread Emails", value: "7", icon: Mail, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
        { label: "AI Recommendations", value: "3", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Greeting */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Good Morning, Arun</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Here is what's happening with your schedule today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="hidden sm:flex dark:border-slate-800">
                        Customize
                    </Button>
                    <Button className="bg-brand-600 hover:bg-brand-700 text-white shadow-soft">
                        <Plus className="h-4 w-4 mr-2" />
                        Quick Plan
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat) => (
                    <Card key={stat.label} className="p-6 border-slate-200 dark:border-slate-800 shadow-soft hover:border-brand-300 dark:hover:border-brand-700 transition-all group">
                        <div className="flex items-center justify-between">
                            <div className={cn("p-2.5 rounded-xl transition-colors", stat.bg)}>
                                <stat.icon className={cn("h-6 w-6", stat.color)} />
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="mt-4">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Left: Schedule & Tasks */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    <Card className="p-0 border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Today's Timeline</h2>
                            <Button variant="ghost" size="sm" className="text-brand-600 dark:text-brand-400">View Calendar</Button>
                        </div>
                        <div className="p-6">
                            {!isAuthenticated ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center">
                                    <Calendar className="h-12 w-12 text-slate-300 mb-4" />
                                    <h3 className="font-semibold text-slate-900 dark:text-white">Google Calendar not connected</h3>
                                    <p className="text-sm text-slate-500 max-w-xs mt-1">Connect your Google account to see your real-time schedule and events.</p>
                                    <Button className="mt-4 bg-brand-600 hover:bg-brand-700 text-white">Connect Now</Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex gap-4 group cursor-pointer">
                                            <div className="w-16 flex-shrink-0 text-xs font-semibold text-slate-400 pt-1 uppercase">
                                                {9 + i}:00 AM
                                            </div>
                                            <div className="flex-1 pb-6 border-l-2 border-slate-200 dark:border-slate-800 pl-6 relative">
                                                <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-brand-500 border-2 border-white dark:border-slate-900"></div>
                                                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover:border-brand-300 dark:group-hover:border-brand-700 group-hover:shadow-soft transition-all">
                                                    <h4 className="font-semibold text-slate-900 dark:text-white">Design Sync with Team</h4>
                                                    <p className="text-xs text-slate-500 mt-1">Google Meet • Zoom Interaction</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-soft">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Upcoming Tasks</h2>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-5 w-5 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-brand-500"></div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">Review project documentation</p>
                                            <p className="text-xs text-slate-500">Due {i === 1 ? 'Today' : 'Tomorrow'}</p>
                                        </div>
                                    </div>
                                    <Badge variant={i === 1 ? "danger" : "default"} className="px-2 py-0 text-[10px]">
                                        {i === 1 ? 'High' : 'Medium'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Right: Quick Actions & Inbox */}
                <div className="space-y-6 md:space-y-8">
                    <Card className="p-6 bg-brand-600 text-white border-0 shadow-lg shadow-brand-500/20">
                        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-center">
                                <Plus className="h-5 w-5 mb-2" />
                                <span className="text-xs font-semibold">New Task</span>
                            </button>
                            <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-center">
                                <Send className="h-5 w-5 mb-2" />
                                <span className="text-xs font-semibold">Message AI</span>
                            </button>
                            <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-center">
                                <Calendar className="h-5 w-5 mb-2" />
                                <span className="text-xs font-semibold">Add Event</span>
                            </button>
                            <button className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-center">
                                <ListPlus className="h-5 w-5 mb-2" />
                                <span className="text-xs font-semibold">Plan Day</span>
                            </button>
                        </div>
                    </Card>

                    <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-soft">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Emails</h2>
                            <Button variant="ghost" size="sm" className="text-brand-600 dark:text-brand-400">Box</Button>
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0 group cursor-pointer">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 transition-colors">
                                        <Mail className="h-5 w-5 text-slate-500 dark:text-slate-400 group-hover:text-brand-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Google Cloud</p>
                                            <span className="text-[10px] text-slate-400">12:30</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">Your monthly billing statement is ready</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

