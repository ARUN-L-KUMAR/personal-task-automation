import React from 'react';
import { Brain, AlertCircle, Lightbulb, Clock } from 'lucide-react';
import { AIExplanation } from '../../types/planner.types';

interface Props {
    explanation: AIExplanation;
}

export function ExplanationTab({ explanation }: Props) {
    const hasContent =
        explanation.summary ||
        explanation.issues.length > 0 ||
        explanation.recommendations.length > 0 ||
        explanation.timeManagement;

    if (!hasContent) {
        return (
            <div className="text-center py-12 text-slate-400">
                <Brain className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No AI explanation available yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Summary */}
            {explanation.summary && (
                <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-indigo-600" />
                        <h3 className="text-sm font-bold text-indigo-700">AI Summary</h3>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{explanation.summary}</p>
                </div>
            )}

            {/* Issues */}
            {explanation.issues.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <h3 className="text-sm font-bold text-slate-700">Issues Found</h3>
                    </div>
                    <ul className="space-y-1.5">
                        {explanation.issues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                                <span className="text-red-500 font-bold mt-0.5">•</span>
                                {issue}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recommendations */}
            {explanation.recommendations.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <h3 className="text-sm font-bold text-slate-700">Recommendations</h3>
                    </div>
                    <ul className="space-y-1.5">
                        {explanation.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                                <span className="text-amber-500 font-bold mt-0.5">💡</span>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Time management */}
            {explanation.timeManagement && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-sm font-bold text-emerald-700">Time Management</h3>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{explanation.timeManagement}</p>
                </div>
            )}
        </div>
    );
}
