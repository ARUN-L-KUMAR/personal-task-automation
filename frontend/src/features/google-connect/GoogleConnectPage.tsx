import React, { useEffect } from 'react';
import {
    Calendar, Mail, CheckSquare, User, Map, FileSpreadsheet,
    Check, X, Loader2, ExternalLink, RefreshCw, Wifi, WifiOff, Shield,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useGoogleStatus } from '../../hooks/useGoogleStatus';
import { cn } from '../../utils/cn';
import { usePageContextStore } from '../../store/usePageContextStore';

const SERVICES = [
    { key: 'calendar', label: 'Google Calendar', desc: 'View and manage your events, detect conflicts.', icon: Calendar, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { key: 'gmail', label: 'Gmail', desc: 'Smart inbox triage, AI email drafts.', icon: Mail, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
    { key: 'tasks', label: 'Google Tasks', desc: 'Read/write tasks and AI Agent Notes list.', icon: CheckSquare, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { key: 'contacts', label: 'Google Contacts', desc: 'People search and smart suggestions.', icon: User, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
    { key: 'sheets', label: 'Google Sheets', desc: 'Read and update spreadsheet data.', icon: FileSpreadsheet, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    { key: 'maps', label: 'Google Maps', desc: 'Route planning, travel time estimates.', icon: Map, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
];

export function GoogleConnectPage() {
    const { isGoogleConnected, isChecking, refresh } = useGoogleStatus();
    const { setHeaderContext, clearHeaderContext } = usePageContextStore();

    const connectGoogle = () => {
        window.location.href = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}/api/auth/google-connect`;
    };

    useEffect(() => {
        setHeaderContext({
            hideSearch: true,
            summary: isGoogleConnected
                ? 'Google services are connected and ready to use.'
                : 'Connect your Google account to enable all integrations.',
            actions: (
                <Button variant="outline" onClick={() => refresh()} disabled={isChecking}>
                    <RefreshCw className={cn('h-4 w-4 mr-2', isChecking && 'animate-spin')} /> Refresh Status
                </Button>
            ),
        });
        return () => clearHeaderContext();
    }, [clearHeaderContext, isChecking, isGoogleConnected, refresh, setHeaderContext]);

    return (
        <div className="space-y-4 pb-4">
            {/* Connection status banner */}
            <Card className={cn(
                'p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2',
                isGoogleConnected
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10',
            )}>
                <div className="flex items-center gap-4">
                    <div className={cn(
                        'h-12 w-12 rounded-xl flex items-center justify-center',
                        isGoogleConnected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30',
                    )}>
                        {isChecking
                            ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                            : isGoogleConnected
                                ? <Wifi className="h-5 w-5 text-emerald-600" />
                                : <WifiOff className="h-5 w-5 text-red-500" />
                        }
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {isGoogleConnected ? 'Google Services Connected' : 'Not Connected'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {isGoogleConnected
                                ? 'All Google APIs are authorized and ready to use.'
                                : 'Connect your Google account to enable all features.'}
                        </p>
                    </div>
                </div>
                {!isGoogleConnected && (
                    <Button onClick={connectGoogle} className="bg-brand-600 hover:bg-brand-700 text-white shrink-0">
                        <ExternalLink className="h-4 w-4 mr-2" /> Connect Google
                    </Button>
                )}
            </Card>

            {/* Services grid */}
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Services</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SERVICES.map(({ key, label, desc, icon: Icon, color }) => (
                        <Card key={key} className="p-5 border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-3">
                                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{label}</h4>
                                        {isChecking ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
                                        ) : isGoogleConnected ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                                <Check className="h-3 w-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                                <X className="h-3 w-3" /> Inactive
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Security note */}
            <Card className="p-5 border-slate-200 dark:border-slate-800 flex items-start gap-4">
                <div className="h-9 w-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4.5 w-4.5 text-brand-600" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Secure OAuth2 Connection</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        G-ONE uses Google's official OAuth2 protocol. Your credentials are never stored — only encrypted refresh tokens scoped to the permissions you grant. You can revoke access anytime from Google Account settings.
                    </p>
                </div>
            </Card>

            {/* Re-auth section */}
            {isGoogleConnected && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Need to re-authorize?</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">If a service stopped working, re-connect to refresh your OAuth tokens.</p>
                    </div>
                    <Button variant="outline" onClick={connectGoogle}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Re-authorize
                    </Button>
                </div>
            )}
        </div>
    );
}
