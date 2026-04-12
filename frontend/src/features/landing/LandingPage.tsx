import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Bot,
    Calendar,
    Mail,
    CheckSquare,
    MessageSquare,
    MapPin,
    FileSpreadsheet,
    ArrowRight,
    Shield,
    Phone,
    Facebook,
    Instagram,
    Twitter,
    Linkedin,
} from 'lucide-react';

const features = [
    { icon: CheckSquare, label: 'Task Management', desc: 'Organise and track all your tasks in one place.' },
    { icon: Calendar, label: 'Smart Calendar', desc: 'AI-assisted scheduling and event management.' },
    { icon: Mail, label: 'Smart Inbox', desc: 'Prioritise and manage emails intelligently.' },
    { icon: MessageSquare, label: 'AI Chatbot', desc: 'Chat with your personal AI assistant.' },
    { icon: MapPin, label: 'Maps & Travel', desc: 'Plan routes and discover places effortlessly.' },
    { icon: FileSpreadsheet, label: 'Google Sheets', desc: 'View and manage your spreadsheets directly.' },
];

export function LandingPage() {
    const [contactEmail, setContactEmail] = useState('');
    const [contactMessage, setContactMessage] = useState('');
    const [contactStatus, setContactStatus] = useState<string | null>(null);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();

        const email = contactEmail.trim();
        const message = contactMessage.trim();

        if (!email || !message) {
            setContactStatus('Please enter your email and message.');
            return;
        }

        const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!emailIsValid) {
            setContactStatus('Please enter a valid email address.');
            return;
        }

        const subject = encodeURIComponent('Landing Page Contact - G-ONE');
        const body = encodeURIComponent(`From: ${email}\n\n${message}`);
        window.location.href = `mailto:support@g-one.app?subject=${subject}&body=${body}`;

        setContactStatus('Opening your email app to send the message.');
        setContactMessage('');
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-surface-50 via-white to-brand-50/40 dark:from-surface-950 dark:via-surface-950 dark:to-brand-950/30 text-foreground flex flex-col">
            <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-500/15" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-brand-100/50 blur-3xl dark:bg-brand-700/20" />
            {/* ── Nav ── */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/25">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">G-ONE</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/login"
                        className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2"
                    >
                        Sign In
                    </Link>
                    <Link
                        to="/register"
                        className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-brand-500/25"
                    >
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* ── Hero ── */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-6xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-4xl"
                >
                    <div className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700/40 rounded-full px-4 py-1.5 text-sm text-brand-700 dark:text-brand-300 font-medium mb-6">
                        <Bot className="h-3.5 w-3.5" />
                        AI-Powered Productivity
                    </div>

                    <h1 className="text-5xl sm:text-6xl font-black leading-tight tracking-tight mb-6 text-slate-900 dark:text-white">
                        Your personal{' '}
                        <span className="bg-gradient-to-r from-brand-500 to-brand-700 dark:from-brand-300 dark:to-brand-500 bg-clip-text text-transparent">
                            AI assistant
                        </span>
                        <br />
                        for everything
                    </h1>

                    <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto mb-10 leading-relaxed">
                        G-ONE connects your Google Calendar, Gmail, Tasks, Sheets, and more — and lets an AI
                        manage them on your behalf so you can focus on what matters.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/register"
                            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-brand-500/25 text-sm"
                        >
                            Start for free <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            to="/login"
                            className="flex items-center gap-2 bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold px-8 py-3.5 rounded-xl transition-all text-sm"
                        >
                            Sign in to your account
                        </Link>
                    </div>
                </motion.div>

                {/* ── Features Grid ── */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-20 w-full"
                >
                    {features.map(({ icon: Icon, label, desc }) => (
                        <div
                            key={label}
                            className="group relative overflow-hidden bg-white/90 dark:bg-white/5 border border-slate-300 dark:border-slate-600/70 rounded-2xl p-7 sm:p-8 min-h-[210px] text-left transition-all duration-300 shadow-[0_10px_28px_-16px_rgba(15,23,42,0.22)] hover:shadow-[0_18px_40px_-18px_rgba(37,53,229,0.30)] dark:shadow-[0_10px_28px_-16px_rgba(2,6,23,0.75)] dark:hover:shadow-[0_20px_42px_-18px_rgba(59,81,239,0.35)] dark:hover:bg-white/10"
                        >
                            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-100/70 blur-2xl dark:bg-brand-500/10" />
                            <div className="relative h-11 w-11 bg-brand-100 dark:bg-brand-500/15 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105">
                                <Icon className="h-5.5 w-5.5 text-brand-600 dark:text-brand-300" />
                            </div>
                            <p className="relative font-semibold text-base text-slate-900 dark:text-white mb-2">{label}</p>
                            <p className="relative text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-[32ch]">{desc}</p>
                        </div>
                    ))}
                </motion.div>
            </main>

            {/* ── Footer ── */}
            <footer className="relative z-10 mt-auto border-t border-slate-800/80 bg-slate-950 text-slate-200 px-6 pt-12 pb-5">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
                    <div>
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="h-9 w-9 rounded-xl bg-brand-600/90 flex items-center justify-center shadow-lg shadow-brand-500/30">
                                <Bot className="h-4.5 w-4.5 text-white" />
                            </div>
                            <span className="font-black tracking-tight text-white text-lg">G-ONE</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-[34ch]">
                            AI-powered personal task automation for calendar, email, tasks, travel, and planning in one unified workspace.
                        </p>
                        <div className="mt-5 space-y-2.5 text-sm text-slate-300">
                            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-400" /> +91 98765 43210</p>
                            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-400" /> support@g-one.app</p>
                        </div>
                        <div className="mt-5 flex items-center gap-2.5">
                            <button type="button" className="h-9 w-9 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 transition-colors flex items-center justify-center">
                                <Facebook className="h-4 w-4 text-slate-300" />
                            </button>
                            <button type="button" className="h-9 w-9 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 transition-colors flex items-center justify-center">
                                <Instagram className="h-4 w-4 text-slate-300" />
                            </button>
                            <button type="button" className="h-9 w-9 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 transition-colors flex items-center justify-center">
                                <Twitter className="h-4 w-4 text-slate-300" />
                            </button>
                            <button type="button" className="h-9 w-9 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 transition-colors flex items-center justify-center">
                                <Linkedin className="h-4 w-4 text-slate-300" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold tracking-[0.12em] uppercase text-slate-100 mb-4">Quick Links</h3>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                            <Link to="/register" className="text-slate-400 hover:text-white transition-colors">Get Started</Link>
                            <Link to="/login" className="text-slate-400 hover:text-white transition-colors">Sign In</Link>
                            <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</Link>
                            <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">Terms of Service</Link>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold tracking-[0.12em] uppercase text-slate-100 mb-4">Contact Us</h3>
                        <form className="space-y-3" onSubmit={handleSendMessage}>
                            <input
                                type="email"
                                placeholder="Your email address"
                                value={contactEmail}
                                onChange={(e) => {
                                    setContactEmail(e.target.value);
                                    if (contactStatus) setContactStatus(null);
                                }}
                                className="w-full h-10 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                            />
                            <textarea
                                rows={3}
                                placeholder="Write your message"
                                value={contactMessage}
                                onChange={(e) => {
                                    setContactMessage(e.target.value);
                                    if (contactStatus) setContactStatus(null);
                                }}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
                            />
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors shadow-md shadow-brand-500/20"
                            >
                                Send Message
                                <ArrowRight className="h-4 w-4" />
                            </button>
                            {contactStatus && (
                                <p className="text-xs text-slate-400">{contactStatus}</p>
                            )}
                        </form>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto mt-8 pt-4 border-t border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <p>© {new Date().getFullYear()} G-ONE. AI Personal Task Automation.</p>
                    <div className="flex items-center gap-5">
                        <Link
                            to="/privacy"
                            className="flex items-center gap-1.5 hover:text-slate-300 transition-colors"
                        >
                            <Shield className="h-3.5 w-3.5" />
                            Privacy
                        </Link>
                        <Link to="/terms" className="hover:text-slate-300 transition-colors">
                            Terms
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
