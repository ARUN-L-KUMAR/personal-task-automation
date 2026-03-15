import React from 'react';
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
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white flex flex-col">
            {/* ── Nav ── */}
            <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter">G-ONE</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/login"
                        className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2"
                    >
                        Sign In
                    </Link>
                    <Link
                        to="/register"
                        className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/25"
                    >
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* ── Hero ── */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 font-medium mb-6">
                        <Bot className="h-3.5 w-3.5" />
                        AI-Powered Productivity
                    </div>

                    <h1 className="text-5xl sm:text-6xl font-black leading-tight tracking-tight mb-6">
                        Your personal{' '}
                        <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            AI assistant
                        </span>
                        <br />
                        for everything
                    </h1>

                    <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
                        G-ONE connects your Google Calendar, Gmail, Tasks, Sheets, and more — and lets an AI
                        manage them on your behalf so you can focus on what matters.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/register"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-blue-500/30 text-sm"
                        >
                            Start for free <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            to="/login"
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold px-8 py-3.5 rounded-xl transition-all text-sm"
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
                    className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-20 w-full"
                >
                    {features.map(({ icon: Icon, label, desc }) => (
                        <div
                            key={label}
                            className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left hover:bg-white/8 transition-colors"
                        >
                            <div className="h-9 w-9 bg-blue-500/15 rounded-xl flex items-center justify-center mb-3">
                                <Icon className="h-5 w-5 text-blue-400" />
                            </div>
                            <p className="font-semibold text-sm text-white mb-1">{label}</p>
                            <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </motion.div>
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-white/8 py-6 px-6">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-slate-400">G-ONE</span>
                        <span>— AI Personal Task Automation</span>
                    </div>
                    <div className="flex items-center gap-5">
                        <Link
                            to="/privacy"
                            className="flex items-center gap-1.5 hover:text-slate-300 transition-colors"
                        >
                            <Shield className="h-3.5 w-3.5" />
                            Privacy Policy
                        </Link>
                        <Link to="/terms" className="hover:text-slate-300 transition-colors">
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
