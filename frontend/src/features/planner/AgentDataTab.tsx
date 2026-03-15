import React, { useState } from 'react';
import { Database, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props {
    rawData: Record<string, unknown>;
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const json = JSON.stringify(data, null, 2) ?? 'undefined';
    const preview = json.length > 120 ? json.slice(0, 120) + '…' : json;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(json);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                    <span className="text-xs font-bold text-slate-700">{label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                        {typeof data === 'object' && data !== null
                            ? Array.isArray(data)
                                ? `[${(data as unknown[]).length} items]`
                                : `{${Object.keys(data).length} keys}`
                            : typeof data}
                    </span>
                </div>
                <button onClick={handleCopy} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded">
                    {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
            </button>

            {open ? (
                <pre className="p-4 text-[11px] text-slate-600 font-mono overflow-x-auto bg-white max-h-80 overflow-y-auto leading-relaxed">
                    {json}
                </pre>
            ) : (
                <div className="px-4 py-2 bg-white">
                    <code className="text-[10px] text-slate-400 font-mono line-clamp-1">{preview}</code>
                </div>
            )}
        </div>
    );
}

export function AgentDataTab({ rawData }: Props) {
    const keys = Object.keys(rawData);

    if (!keys.length) {
        return (
            <div className="text-center py-12 text-slate-400">
                <Database className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No raw agent data available.</p>
            </div>
        );
    }

    const validKeys = keys.filter(k => rawData[k] !== undefined);

    return (
        <div className="space-y-2">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-3">
                Raw pipeline output — {validKeys.length} sections
            </p>
            {validKeys.map(k => (
                <JsonBlock key={k} label={k} data={rawData[k]} />
            ))}
        </div>
    );
}
