import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DbStats } from '../../services/dashboard.service';

const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#22c55e']; // high, medium, low

interface ProjectAnalyticsProps {
    dbStats: DbStats;
}

export function ProjectBarChart({ dbStats }: ProjectAnalyticsProps) {
    const data = dbStats.tasks_per_project;

    if (!data || data.length === 0) {
        return (
            <div className="py-12 text-center">
                <p className="text-sm text-slate-400 italic">No projects yet.</p>
            </div>
        );
    }

    return (
        <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                    <XAxis
                        dataKey="project"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '10px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                            fontSize: '12px',
                        }}
                    />
                    <Bar dataKey="tasks" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function PriorityPieChart({ dbStats }: ProjectAnalyticsProps) {
    const dist = dbStats.priority_distribution;
    const data = [
        { name: 'High', value: dist.high },
        { name: 'Medium', value: dist.medium },
        { name: 'Low', value: dist.low },
    ];

    const total = data.reduce((s, d) => s + d.value, 0);

    if (total === 0) {
        return (
            <div className="py-12 text-center">
                <p className="text-sm text-slate-400 italic">No active tasks.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Numeric breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                {data.map((d, i) => (
                    <div key={d.name} className="text-center">
                        <p className="text-2xl font-bold" style={{ color: PRIORITY_COLORS[i] }}>{d.value}</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{d.name}</p>
                    </div>
                ))}
            </div>
            <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                        >
                            {data.map((_, idx) => (
                                <Cell key={idx} fill={PRIORITY_COLORS[idx]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                borderRadius: '10px',
                                border: 'none',
                                boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                                fontSize: '12px',
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
                {data.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[i] }} />
                        <span className="text-xs text-slate-500 font-medium">{d.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
