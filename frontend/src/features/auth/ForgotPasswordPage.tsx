import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight, Loader2, ArrowLeft, EyeOff, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { forgotPassword, resetPassword } from '../../services/auth.service';
import { cn } from '../../utils/cn';

export function ForgotPasswordPage() {
    const navigate = useNavigate();
    
    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        try {
            const data = await forgotPassword(email);
            setStep('reset');
            if (data.verification_code) {
                setCode(data.verification_code);
                setSuccessMessage('Demo Mode: Email failed to send. Code auto-filled.');
            } else {
                setSuccessMessage('A reset code has been sent to your email.');
            }
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            let errorMessage = err.message || 'Failed to send reset code';
            if (typeof detail === 'string') errorMessage = detail;
            else if (detail?.message) errorMessage = detail.message;
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        
        try {
            await resetPassword({
                email,
                verification_code: code,
                new_password: newPassword,
            });
            setSuccessMessage('Password reset successfully. You can now log in.');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            let errorMessage = err.message || 'Failed to reset password';
            if (typeof detail === 'string') errorMessage = detail;
            else if (detail?.message) errorMessage = detail.message;
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

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
                            <KeyRound className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    
                    <div className="text-center mb-6">
                        <h1 className="text-xl font-bold text-slate-900">Reset Password</h1>
                        <p className="text-sm text-slate-500 mt-2">
                            {step === 'email' 
                                ? 'Enter your email address and we will send you a code to reset your password.'
                                : 'Enter the code sent to your email and your new password.'}
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

                    <AnimatePresence mode="wait">
                        {step === 'email' ? (
                            <motion.form 
                                key="email-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleSendCode} 
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        placeholder="you@example.com"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !email}
                                    className={cn(
                                        'w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-2',
                                        'hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
                                        'shadow-lg shadow-blue-500/25'
                                    )}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>Send reset code <ArrowRight className="h-4 w-4" /></>
                                    )}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.form 
                                key="reset-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleResetPassword} 
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                                        Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={code}
                                        onChange={(e) => { setCode(e.target.value); setError(null); }}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono uppercase tracking-widest"
                                        placeholder="000000"
                                        maxLength={6}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={newPassword}
                                            onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                                            className="w-full h-11 px-4 pr-11 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            placeholder="••••••••"
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !code || !newPassword}
                                    className={cn(
                                        'w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-2',
                                        'hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
                                        'shadow-lg shadow-blue-500/25'
                                    )}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>Reset Password <ArrowRight className="h-4 w-4" /></>
                                    )}
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <div className="mt-8 text-center">
                        <Link 
                            to="/login" 
                            className="text-slate-600 font-medium hover:text-slate-900 hover:underline inline-flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to login
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
