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
            {/* Numeric Breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                {data.map((d, i) => (
                    <div key={`stat-${d.name}`} className="text-center">
                        <p className="text-2xl font-bold" style={{ color: COLORS[i] }}>{d.value}</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{d.name}</p>
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
