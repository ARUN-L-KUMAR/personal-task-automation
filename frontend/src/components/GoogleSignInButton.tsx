import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../utils/cn';

export function GoogleSignInButton() {
    const { googleLogin } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const login = useGoogleLogin({
        flow: 'auth-code',  // Gets authorization code → backend exchanges for access+refresh tokens
        scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/contacts.readonly',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/tasks',
            'https://www.googleapis.com/auth/drive.readonly',
        ].join(' '),
        // Note: offline access + refresh_token is handled by backend via credentials.json flow
        onSuccess: async (codeResponse) => {
            setLoading(true);
            setError('');
            try {
                await googleLogin(codeResponse.code);
                navigate('/');
            } catch {
                setError('Google sign-in failed. Please try again.');
            } finally {
                setLoading(false);
            }
        },
        onError: () => {
            setError('Google sign-in was cancelled or failed.');
        },
    });

    return (
        <div className="w-full">
            <button
                type="button"
                onClick={() => login()}
                disabled={loading}
                className={cn(
                    'w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold',
                    'flex items-center justify-center gap-3 transition-all',
                    'hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    'shadow-sm'
                )}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                ) : (
                    <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        width={18}
                        height={18}
                    />
                )}
                {loading ? 'Signing in...' : 'Sign in with Google'}
            </button>
            {error && (
                <p className="mt-2 text-xs text-red-600 font-medium text-center">{error}</p>
            )}
        </div>
    );
}
