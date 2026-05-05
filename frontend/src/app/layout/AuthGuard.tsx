import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Loader2 } from 'lucide-react';

const OAUTH_NOTICE_STORAGE_KEY = 'g1_oauth_notice';
const OAUTH_QUERY_KEYS = ['auth', 'mismatch_type', 'registered_email', 'expected_email', 'google_email', 'reason'] as const;

function buildOAuthNotice(params: URLSearchParams): { title: string; message: string } | null {
    const authState = params.get('auth');
    if (authState === 'account_mismatch' || authState === 'email_mismatch') {
        const mismatchType = params.get('mismatch_type');
        const connectedEmail = params.get('google_email') || 'another Google account';
        const registeredEmail = params.get('registered_email') || params.get('expected_email') || 'your registered email';

        const message = mismatchType === 'google_account_mismatch'
            ? `You already connected a different Google account earlier. Please reconnect using that same Google account. If you want to use ${connectedEmail}, create/login a new app account and connect it there.`
            : mismatchType === 'google_email_already_registered'
                ? `This Google account (${connectedEmail}) is already registered as another user. Please login with ${connectedEmail}, or connect a different Google account for ${registeredEmail}.`
                : `This Google account (${connectedEmail}) does not match your registered account (${registeredEmail}). Please connect using ${registeredEmail}, or create/login a separate account with ${connectedEmail}.`;

        return {
            title: 'Google Account Mismatch',
            message,
        };
    }

    if (authState === 'failed') {
        const reason = params.get('reason');
        const message = reason === 'existing_google_identity_unavailable'
            ? 'Unable to verify your previously connected Google account right now. Please try again with the same account after a moment.'
            : 'Unable to connect Google right now. Please try again.';
        return {
            title: 'Google Connection Failed',
            message,
        };
    }

    return null;
}

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
    const location = useLocation();
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            checkAuth();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const callbackParams = new URLSearchParams(location.search);
    const authState = callbackParams.get('auth');

    if (authState) {
        const notice = buildOAuthNotice(callbackParams);
        if (typeof window !== 'undefined') {
            if (notice) {
                window.sessionStorage.setItem(OAUTH_NOTICE_STORAGE_KEY, JSON.stringify(notice));
            } else if (authState === 'success') {
                window.sessionStorage.removeItem(OAUTH_NOTICE_STORAGE_KEY);
            }
        }

        OAUTH_QUERY_KEYS.forEach((key) => callbackParams.delete(key));
        const nextQuery = callbackParams.toString();
        const cleanSettingsPath = `/settings${nextQuery ? `?${nextQuery}` : ''}`;

        if (location.pathname !== '/settings' || location.search !== (nextQuery ? `?${nextQuery}` : '')) {
            return <Navigate to={cleanSettingsPath} replace />;
        }
    }

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Loading workspace...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
