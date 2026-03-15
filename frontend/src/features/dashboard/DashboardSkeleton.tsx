import React from 'react';

interface LoadingSkeletonProps {
    className?: string;
}

function Shimmer({ className }: LoadingSkeletonProps) {
    return (
        <div className={`animate-pulse rounded-lg bg-slate-200/60 dark:bg-slate-700/40 ${className || ''}`} />
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 pb-12">
            {/* Greeting skeleton */}
            <div>
                <Shimmer className="h-8 w-72 mb-2" />
                <Shimmer className="h-4 w-48" />
            </div>

            {/* Agent status strip */}
            <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Shimmer key={i} className="h-7 w-20 rounded-full" />
                ))}
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 p-5 space-y-3">
                        <div className="flex justify-between">
                            <Shimmer className="h-9 w-9 rounded-lg" />
                            <Shimmer className="h-4 w-16 rounded-full" />
                        </div>
                        <Shimmer className="h-8 w-16" />
                        <Shimmer className="h-3 w-24" />
                    </div>
                ))}
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div className="rounded-xl border border-slate-100 p-6 space-y-3">
                        <Shimmer className="h-5 w-48 mb-4" />
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Shimmer key={i} className="h-14 w-full rounded-lg" />
                        ))}
                    </div>
                    <Shimmer className="h-28 w-full rounded-xl" />
                </div>
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="rounded-xl border border-slate-100 p-6">
                        <Shimmer className="h-5 w-36 mb-4" />
                        <Shimmer className="h-[180px] w-full rounded-lg" />
                    </div>
                    <div className="rounded-xl border border-slate-100 p-6 space-y-3">
                        <Shimmer className="h-5 w-32 mb-2" />
                        <Shimmer className="h-12 w-full" />
                        <Shimmer className="h-12 w-full" />
                    </div>
                </div>
            </div>

            {/* Insight panel */}
            <Shimmer className="h-36 w-full rounded-xl" />
        </div>
    );
}
