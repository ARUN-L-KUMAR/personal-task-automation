import React, { useEffect, useRef, useState } from 'react';
import {
    Calendar, Mail, CheckSquare, User, Map, FileSpreadsheet,
    Check, X, Loader2, ExternalLink, RefreshCw, Wifi, WifiOff, Shield, AlertCircle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { NoticeDialog } from '../../components/ui/NoticeDialog';
import { useGoogleStatus } from '../../hooks/useGoogleStatus';
import { cn } from '../../utils/cn';
import { usePageContextStore } from '../../store/usePageContextStore';
import { getGoogleConnectUrl } from '../../services/auth.service';

const SERVICES = [
    { key: 'calendar', label: 'Google Calendar', desc: 'View and manage your events, detect conflicts.', icon: Calendar, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { key: 'gmail', label: 'Gmail', desc: 'Smart inbox triage, AI email drafts.', icon: Mail, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
    { key: 'tasks', label: 'Google Tasks', desc: 'Read/write tasks and AI Agent Notes list.', icon: CheckSquare, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { key: 'contacts', label: 'Google Contacts', desc: 'People search and smart suggestions.', icon: User, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
    { key: 'sheets', label: 'Google Sheets', desc: 'Read and update spreadsheet data.', icon: FileSpreadsheet, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    { key: 'maps', label: 'Google Maps', desc: 'Route planning, travel time estimates.', icon: Map, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
];
const OAUTH_NOTICE_STORAGE_KEY = 'g1_oauth_notice';

export function GoogleConnectPage() {
    const { isGoogleConnected, isChecking, refresh } = useGoogleStatus();
    const { setHeaderContext, clearHeaderContext } = usePageContextStore();
    const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
    const [connectError, setConnectError] = useState<string | null>(null);
    const [oauthDialog, setOauthDialog] = useState<{ title: string; message: string } | null>(null);
    const oauthRedirectHandledRef = useRef(false);

    const closeOauthDialog = () => {
        setOauthDialog(null);
        if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(OAUTH_NOTICE_STORAGE_KEY);
        }
    };

    const connectGoogle = async () => {
        setConnectError(null);
        setIsConnectingGoogle(true);
        try {
            const authUrl = await getGoogleConnectUrl();
            window.location.assign(authUrl);
        } catch (err: any) {
            setConnectError(err?.message || 'Unable to start Google connection. Please sign in again and retry.');
            setIsConnectingGoogle(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!oauthRedirectHandledRef.current) {
            const params = new URLSearchParams(window.location.search);
            const authState = params.get('auth');

            if (authState) {
                oauthRedirectHandledRef.current = true;

                let notice: { title: string; message: string } | null = null;

                if (authState === 'account_mismatch' || authState === 'email_mismatch') {
                    const mismatchType = params.get('mismatch_type');
                    const connectedEmail = params.get('google_email') || 'another Google account';
                    const registeredEmail = params.get('registered_email') || params.get('expected_email') || 'your registered email';

                    const message = mismatchType === 'google_account_mismatch'
                        ? `You already connected a different Google account earlier. Please reconnect using that same Google account. If you want to use ${connectedEmail}, create/login a new app account and connect it there.`
                        : mismatchType === 'google_email_already_registered'
                            ? `This Google account (${connectedEmail}) is already registered as another user. Please login with ${connectedEmail}, or connect a different Google account for ${registeredEmail}.`
                            : `This Google account (${connectedEmail}) does not match your registered account (${registeredEmail}). Please connect using ${registeredEmail}, or create/login a separate account with ${connectedEmail}.`;

                    setConnectError(message);
                    notice = {
                        title: 'Google Account Mismatch',
                        message,
                    };
                } else if (authState === 'failed') {
                    const reason = params.get('reason');
                    const message = reason === 'existing_google_identity_unavailable'
                        ? 'Unable to verify your previously connected Google account right now. Please try again with the same account after a moment.'
                        : 'Unable to connect Google right now. Please try again.';
                    setConnectError(message);
                    notice = {
                        title: 'Google Connection Failed',
                        message,
                    };
                } else if (authState === 'success') {
                    setConnectError(null);
                    void refresh(true);
                }

                if (notice) {
                    setOauthDialog(notice);
                    window.sessionStorage.setItem(OAUTH_NOTICE_STORAGE_KEY, JSON.stringify(notice));
                } else if (authState === 'success') {
                    window.sessionStorage.removeItem(OAUTH_NOTICE_STORAGE_KEY);
                }

                params.delete('auth');
                params.delete('mismatch_type');
                params.delete('registered_email');
                params.delete('expected_email');
                params.delete('google_email');
                params.delete('reason');
                const nextQuery = params.toString();
                const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
                window.history.replaceState({}, '', nextUrl);
                return;
            }
        }

        const storedNoticeRaw = window.sessionStorage.getItem(OAUTH_NOTICE_STORAGE_KEY);
        if (!storedNoticeRaw || oauthDialog) return;

        try {
            const storedNotice = JSON.parse(storedNoticeRaw) as { title?: string; message?: string };
            if (storedNotice?.message) {
                setConnectError(storedNotice.message);
                setOauthDialog({
                    title: storedNotice.title || 'Notice',
                    message: storedNotice.message,
                });
            }
        } catch {
            // ignore malformed session payload
            window.sessionStorage.removeItem(OAUTH_NOTICE_STORAGE_KEY);
        }
    }, [oauthDialog, refresh]);

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
        <>
            <NoticeDialog
                isOpen={Boolean(oauthDialog)}
                onClose={closeOauthDialog}
                title={oauthDialog?.title || 'Notice'}
                message={oauthDialog?.message || ''}
            />

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
                    <Button onClick={connectGoogle} disabled={isConnectingGoogle} className="bg-brand-600 hover:bg-brand-700 text-white shrink-0 disabled:opacity-70">
                        {isConnectingGoogle ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening Google...
                            </>
                        ) : (
                            <>
                                <ExternalLink className="h-4 w-4 mr-2" /> Connect Google
                            </>
                        )}
                    </Button>
                )}
            </Card>

            {connectError && (
                <div className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400 px-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {connectError}
                </div>
            )}

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
                    <Button variant="outline" onClick={connectGoogle} disabled={isConnectingGoogle}>
                        {isConnectingGoogle ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        {isConnectingGoogle ? 'Opening Google...' : 'Re-authorize'}
                    </Button>
                </div>
            )}
            </div>
        </>
    );
}
