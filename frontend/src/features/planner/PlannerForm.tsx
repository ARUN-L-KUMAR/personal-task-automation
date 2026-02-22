import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Calendar, Clock, Tag, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { calendarService } from '../../services/calendar.service';
import { tasksService } from '../../services/tasks.service';
import { format, startOfDay, endOfDay } from 'date-fns';
// No unused type imports needed here if they are not used in the code

const plannerSchema = z.object({
    date: z.string().min(1, 'Date is required'),
    meetings: z.array(z.object({
        title: z.string().min(1, 'Title is required'),
        startTime: z.string().min(1, 'Start time is required'),
        endTime: z.string().min(1, 'End time is required'),
        priority: z.enum(['low', 'medium', 'high']),
    })),
    tasks: z.array(z.object({
        title: z.string().min(1, 'Title is required'),
        duration: z.number().min(5, 'Duration must be at least 5 minutes'),
        priority: z.enum(['low', 'medium', 'high']),
    })),
});

type PlannerFormData = z.infer<typeof plannerSchema>;

interface PlannerFormProps {
    onSubmit: (data: PlannerFormData) => void;
    isLoading: boolean;
}

export function PlannerForm({ onSubmit, isLoading }: PlannerFormProps) {
    const { register, control, handleSubmit, formState: { errors } } = useForm<PlannerFormData>({
        resolver: zodResolver(plannerSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            meetings: [],
            tasks: [],
        },
    });

    const [isAutoFilling, setIsAutoFilling] = useState(false);

    const handleAutoFill = async () => {
        setIsAutoFilling(true);
        try {
            const date = control._getWatch('date');
            const targetDate = date ? new Date(date) : new Date();

            const timeMin = startOfDay(targetDate).toISOString();
            const timeMax = endOfDay(targetDate).toISOString();

            const [eventsRes, tasksRes] = await Promise.all([
                calendarService.getEventsRange(timeMin, timeMax),
                tasksService.getTasks()
            ]);

            const events = eventsRes.data.events || [];
            const tasksList = tasksRes.data.tasks || [];

            // Clear existing and append new
            meetingFields.forEach((_, i) => removeMeeting(i));
            taskFields.forEach((_, i) => removeTask(i));

            events.forEach((event: any) => {
                const start = event.start?.dateTime || event.start?.date;
                const end = event.end?.dateTime || event.end?.date;
                if (start && end) {
                    appendMeeting({
                        title: event.summary,
                        startTime: format(new Date(start), 'HH:mm'),
                        endTime: format(new Date(end), 'HH:mm'),
                        priority: 'medium'
                    });
                }
            });

            tasksList.filter((t: any) => t.status !== 'completed').forEach((task: any) => {
                appendTask({
                    title: task.title,
                    duration: 30, // Default duration
                    priority: 'medium'
                });
            });

        } catch (error) {
            console.error('Auto-fill failed:', error);
        } finally {
            setIsAutoFilling(false);
        }
    };

    const { fields: meetingFields, append: appendMeeting, remove: removeMeeting } = useFieldArray({
        control,
        name: 'meetings',
    });

    const { fields: taskFields, append: appendTask, remove: removeTask } = useFieldArray({
        control,
        name: 'tasks',
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Calendar className="mr-2 h-5 w-5 text-blue-600" />
                        Basic Info
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex-1">
                        <Input
                            type="date"
                            label="Plan Date"
                            {...register('date')}
                            error={errors.date?.message}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleAutoFill}
                        isLoading={isAutoFilling}
                        className="h-[42px] border-brand-200 text-brand-700 hover:bg-brand-50"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isAutoFilling ? 'animate-spin' : ''}`} />
                        Auto-fill from Google
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center">
                        <Clock className="mr-2 h-5 w-5 text-blue-600" />
                        Meetings
                    </CardTitle>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendMeeting({ title: '', startTime: '', endTime: '', priority: 'medium' })}
                    >
                        <Plus className="h-4 w-4 mr-1" /> Add Meeting
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {meetingFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                            <div className="md:col-span-5">
                                <Input
                                    label="Meeting Title"
                                    placeholder="e.g. Sync Session"
                                    {...register(`meetings.${index}.title` as const)}
                                    error={errors.meetings?.[index]?.title?.message}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Input
                                    type="time"
                                    label="Start"
                                    {...register(`meetings.${index}.startTime` as const)}
                                    error={errors.meetings?.[index]?.startTime?.message}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Input
                                    type="time"
                                    label="End"
                                    {...register(`meetings.${index}.endTime` as const)}
                                    error={errors.meetings?.[index]?.endTime?.message}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Priority</label>
                                <select
                                    {...register(`meetings.${index}.priority` as const)}
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <Button variant="ghost" size="icon" onClick={() => removeMeeting(index)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {meetingFields.length === 0 && (
                        <p className="text-center py-4 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                            No meetings added yet.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center">
                        <Tag className="mr-2 h-5 w-5 text-blue-600" />
                        Tasks
                    </CardTitle>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendTask({ title: '', duration: 30, priority: 'medium' })}
                    >
                        <Plus className="h-4 w-4 mr-1" /> Add Task
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {taskFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                            <div className="md:col-span-6">
                                <Input
                                    label="Task Title"
                                    placeholder="e.g. Write Documentation"
                                    {...register(`tasks.${index}.title` as const)}
                                    error={errors.tasks?.[index]?.title?.message}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Input
                                    type="number"
                                    label="Duration (min)"
                                    {...register(`tasks.${index}.duration` as const, { valueAsNumber: true })}
                                    error={errors.tasks?.[index]?.duration?.message}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Priority</label>
                                <select
                                    {...register(`tasks.${index}.priority` as const)}
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <Button variant="ghost" size="icon" onClick={() => removeTask(index)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {taskFields.length === 0 && (
                        <p className="text-center py-4 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                            No tasks added yet.
                        </p>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                <Button size="lg" className="w-full md:w-auto px-12" isLoading={isLoading} type="submit">
                    Generate Optimized Plan
                </Button>
            </div>
        </form>
    );
}
