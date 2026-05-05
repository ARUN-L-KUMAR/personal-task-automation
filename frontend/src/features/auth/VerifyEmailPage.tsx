import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { verifyRegistrationEmail, resendVerification } from '../../services/auth.service';
import { cn } from '../../utils/cn';

export function VerifyEmailPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { unverifiedEmail, setUnverifiedEmail, setUser } = useAuthStore();
    
    // Check URL or store for email
    const emailToVerify = searchParams.get('email') || unverifiedEmail;
    
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!emailToVerify) {
            navigate('/login');
        }
    }, [emailToVerify, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailToVerify) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const data = await verifyRegistrationEmail({
                email: emailToVerify,
                verification_code: code,
            });
            setUser(data.user);
            setUnverifiedEmail(null);
            navigate('/dashboard');
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            let errorMessage = err.message || 'Verification failed';
            if (typeof detail === 'string') errorMessage = detail;
            else if (detail?.message) errorMessage = detail.message;
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!emailToVerify) return;
        
        setIsResending(true);
        setError(null);
        setSuccessMessage(null);
        
        try {
            await resendVerification(emailToVerify);
            setSuccessMessage('A new verification code has been sent to your email.');
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            let errorMessage = err.message || 'Failed to resend code';
            if (typeof detail === 'string') errorMessage = detail;
            else if (detail?.message) errorMessage = detail.message;
            setError(errorMessage);
        } finally {
            setIsResending(false);
        }
    };

    if (!emailToVerify) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[420px]"
            >
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
                    <div className="flex justify-center mb-6">
                        <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center">
                            <Mail className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    
                    <div className="text-center mb-6">
                        <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
                        <p className="text-sm text-slate-500 mt-2">
                            We sent a verification code to <br/>
                            <span className="font-medium text-slate-900">{emailToVerify}</span>
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                            {error}
                        </div>
                    )}
                    
                    {successMessage && (
                        <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium">
                            {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 text-center">
                                Verification Code
                            </label>
                            <input
                                type="text"
                                required
                                value={code}
                                onChange={(e) => { setCode(e.target.value); setError(null); setSuccessMessage(null); }}
                                className="w-full h-12 text-center text-xl tracking-[0.25em] rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono uppercase"
                                placeholder="000000"
                                maxLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || code.length < 4}
                            className={cn(
                                'w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-6',
                                'hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
                                'shadow-lg shadow-blue-500/25'
                            )}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>Verify & Continue <ArrowRight className="h-4 w-4" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center space-y-4">
                        <p className="text-sm text-slate-500">
                            Didn't receive the code?{' '}
                            <button 
                                onClick={handleResend}
                                disabled={isResending}
                                className="text-blue-600 font-semibold hover:underline disabled:opacity-60 inline-flex items-center gap-1"
                            >
                                {isResending && <RefreshCw className="h-3 w-3 animate-spin" />}
                                Resend code
                            </button>
                        </p>
                        
                        <p className="text-sm text-slate-500">
                            <Link 
                                to="/login" 
                                className="text-slate-600 font-medium hover:text-slate-900 hover:underline"
                                onClick={() => setUnverifiedEmail(null)}
                            >
                                Back to login
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
