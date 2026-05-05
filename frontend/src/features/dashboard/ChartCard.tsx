import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TaskDistribution } from '../../services/dashboard.service';

const COLORS = ['#ef4444', '#3b82f6', '#94a3b8'];

interface ChartCardProps {
    distribution: TaskDistribution;
}

export function ChartCard({ distribution }: ChartCardProps) {
    const data = [
        { name: 'Urgent', value: distribution.urgent },
        { name: 'Today', value: distribution.today },
        { name: 'Upcoming', value: distribution.upcoming },
    ];

    const total = data.reduce((sum, d) => sum + d.value, 0);

    if (total === 0) {
        return (
            <div className="py-12 text-center">
                <p className="text-sm text-slate-400 italic">No task data available.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
                {data.map((d, i) => (
                    <div key={`stat-${d.name}`} className="text-center rounded-xl bg-slate-50/60 p-3">
                        <p className="text-2xl font-black" style={{ color: COLORS[i] }}>{d.value}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{d.name}</p>
                    </div>
                ))}
            </div>
            <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                        >
                            {data.map((_, idx) => (
                                <Cell key={idx} fill={COLORS[idx]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 8px 24px rgb(0 0 0 / 0.1)',
                                fontSize: '12px',
                                backdropFilter: 'blur(8px)',
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-3">
                {data.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-xs text-slate-500 font-medium">
                            {d.name} ({d.value})
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
