import React from 'react';

interface LoadingSkeletonProps {
    className?: string;
}

function Shimmer({ className }: LoadingSkeletonProps) {
    return (
        <div className={`animate-pulse rounded-xl bg-gradient-to-r from-slate-200/60 via-slate-100/60 to-slate-200/60 dark:from-slate-800/70 dark:via-slate-700/70 dark:to-slate-800/70 ${className || ''}`} />
    );
}

export function DashboardSkeleton() {
    return (
        <div className="px-4 py-4 pb-10 md:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/60 dark:shadow-none">
                <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 md:px-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                            <Shimmer className="h-11 w-11 rounded-2xl" />
                            <Shimmer className="h-8 w-72 rounded-xl" />
                        </div>
                        <div className="flex gap-3">
                            <Shimmer className="h-10 w-24 rounded-xl" />
                            <Shimmer className="h-10 w-32 rounded-xl" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 p-4 md:p-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-5">
                                <div className="mb-6 flex items-center justify-between">
                                    <Shimmer className="h-11 w-11 rounded-2xl" />
                                    <Shimmer className="h-6 w-20 rounded-full" />
                                </div>
                                <Shimmer className="mb-3 h-10 w-20 rounded-xl" />
                                <Shimmer className="h-4 w-32 rounded-xl" />
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-5">
                                <div className="mb-5 flex items-center justify-between">
                                    <Shimmer className="h-7 w-28 rounded-xl" />
                                    <Shimmer className="h-6 w-10 rounded-full" />
                                </div>
                                <div className="space-y-3">
                                    {Array.from({ length: i === 2 ? 1 : 3 }).map((__, cardIndex) => (
                                        <Shimmer key={cardIndex} className="h-24 rounded-2xl" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-4">
                        <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Shimmer key={i} className="h-8 w-24 rounded-full" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
