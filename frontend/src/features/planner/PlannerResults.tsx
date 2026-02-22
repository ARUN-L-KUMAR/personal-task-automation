import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
    Briefcase, AlertTriangle,
    MapPin, ListChecks, Bot, Sparkles,
    Clock, CheckCircle2, ChevronRight, Info
} from 'lucide-react';
import { PlannerResult } from '../../types/planner.types';
import { cn } from '../../utils/cn';

interface PlannerResultsProps {
    result: PlannerResult;
}

export function PlannerResults({ result }: PlannerResultsProps) {
    const sections = [
        {
            title: 'Conflict Analysis',
            content: result.conflict_analysis,
            icon: AlertTriangle,
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/10',
            border: 'border-amber-200 dark:border-amber-800'
        },
        {
            title: 'Travel Reminders',
            content: result.travel_reminders,
            icon: MapPin,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/10',
            border: 'border-emerald-200 dark:border-emerald-800'
        },
        {
            title: 'AI Insights & Strategy',
            content: result.ai_explanation,
            icon: Bot,
            color: 'text-brand-600',
            bg: 'bg-brand-50 dark:bg-brand-900/10',
            border: 'border-brand-200 dark:border-brand-800'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Status */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden">
                <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Sparkles className="h-6 w-6 text-brand-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Optimization Complete</h2>
                            <p className="text-sm text-slate-400">AI Engine has generated your ideal schedule.</p>
                        </div>
                    </div>
                    <Badge className="bg-emerald-500 text-white border-none px-4 py-1">Optimal Found</Badge>
                </div>
                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Generated: {new Date(result.generated_at).toLocaleString()}</span>
                    <span className="flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Latency: 1.2s
                    </span>
                </div>
            </Card>

            {/* AI Reasoning Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sections.map((section, index) => (
                    <Card key={index} className={cn("border shadow-sm", section.border, section.bg)}>
                        <CardHeader className="flex flex-row items-center space-x-3 pb-2 pt-4 px-4">
                            <section.icon className={cn("h-5 w-5", section.color)} />
                            <CardTitle className="text-sm font-bold">{section.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {section.content}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Optimized Plan Timeline */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-soft">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-lg font-bold">
                            <ListChecks className="mr-3 h-5 w-5 text-brand-600" />
                            Optimized Day Plan
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold dark:border-slate-800">
                                Export to Calendar
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {/* We'll parse the rule_based_plan or assume a structured layout here */}
                        {/* For this sprint, we'll display the text content but in a professional box */}
                        <div className="p-8">
                            <div className="relative pl-8 border-l-2 border-slate-200 dark:border-slate-800 space-y-12">
                                <div className="absolute -left-[11px] top-0 h-5 w-5 rounded-full bg-brand-600 border-4 border-white dark:border-slate-900" />

                                <div className="prose prose-sm max-w-none text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed font-mono text-sm bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    {result.rule_based_plan}
                                </div>

                                <div className="absolute -left-[11px] bottom-0 h-5 w-5 rounded-full bg-slate-300 dark:bg-slate-600 border-4 border-white dark:border-slate-900" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Final Summary Card */}
            <Card className="bg-brand-600 text-white p-6 border-none shadow-soft flex items-center justify-between overflow-hidden relative">
                <div className="relative z-10 flex items-center gap-6">
                    <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                        <Bot className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black italic">"Go get 'em, Arun!"</h3>
                        <p className="text-brand-100 text-sm opacity-90">Plan optimized for maximum productivity and travel efficiency.</p>
                    </div>
                </div>
                <div className="absolute right-[-20px] top-[-20px] h-32 w-32 bg-white/5 rounded-full blur-3xl" />
                <Button className="relative z-10 bg-white text-brand-600 hover:bg-brand-50 font-bold">
                    Mark as Read
                </Button>
            </Card>
        </div>
    );
}
