import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Calendar, Briefcase, AlertTriangle, MapPin, ListChecks, Bot } from 'lucide-react';
import { PlannerResult } from '../../types/planner.types';

interface PlannerResultsProps {
    result: PlannerResult;
}

export function PlannerResults({ result }: PlannerResultsProps) {
    const sections = [
        {
            title: 'Calendar Analysis',
            content: result.calendar_analysis,
            icon: Calendar,
            color: 'text-blue-600',
        },
        {
            title: 'Task Analysis',
            content: result.task_analysis,
            icon: Briefcase,
            color: 'text-indigo-600',
        },
        {
            title: 'Conflict Analysis',
            content: result.conflict_analysis,
            icon: AlertTriangle,
            color: 'text-amber-600',
        },
        {
            title: 'Travel Reminders',
            content: result.travel_reminders,
            icon: MapPin,
            color: 'text-emerald-600',
        },
        {
            title: 'Rule-Based Plan',
            content: result.rule_based_plan,
            icon: ListChecks,
            color: 'text-slate-700',
        },
        {
            title: 'AI Insights',
            content: result.ai_explanation,
            icon: Bot,
            color: 'text-purple-600',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Optimization Result</h2>
                    <p className="text-sm text-slate-500">Generated on {new Date(result.generated_at).toLocaleString()}</p>
                </div>
                <Badge variant="success" className="px-4 py-1 text-sm">Success</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sections.map((section, index) => (
                    <Card key={index} className="flex flex-col">
                        <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                            <section.icon className={`h-6 w-6 ${section.color}`} />
                            <CardTitle className="text-base">{section.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
                                {section.content}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
