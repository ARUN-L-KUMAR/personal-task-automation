import React from 'react';
import { Link } from 'react-router-dom';

export function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-start py-16 px-6">
            <div className="max-w-2xl w-full">
                <div className="mb-8 flex items-center gap-3">
                    <span className="text-3xl">🤖</span>
                    <span className="text-xl font-bold tracking-tight text-white">G-ONE</span>
                </div>

                <h1 className="text-3xl font-black mb-2 text-white">Privacy Policy</h1>
                <p className="text-sm text-slate-400 mb-8">Last updated: March 2026</p>

                <div className="space-y-6 text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">1. Overview</h2>
                        <p>
                            G-ONE ("the App") is a personal productivity assistant that uses Google OAuth to allow
                            users to sign in and optionally connect their Google services (Calendar, Gmail, Tasks, etc.).
                            We are committed to protecting your privacy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">2. Information We Collect</h2>
                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>Name and email address from your Google account (for sign-in only)</li>
                            <li>OAuth tokens to access Google services on your behalf (stored securely in our database)</li>
                            <li>Data you explicitly create within the App (tasks, notes, plans)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">3. How We Use Your Data</h2>
                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>To authenticate you and maintain your session</li>
                            <li>To access Google services (Calendar, Gmail, Tasks) only when you initiate an action</li>
                            <li>We do <strong>not</strong> sell, share, or transfer your personal data to third parties</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">4. Google API Services</h2>
                        <p>
                            G-ONE's use of Google API Services adheres to the{' '}
                            <a
                                href="https://developers.google.com/terms/api-services-user-data-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 underline"
                            >
                                Google API Services User Data Policy
                            </a>
                            , including the Limited Use requirements.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">5. Data Retention</h2>
                        <p>
                            Your data is retained as long as your account exists. You may request deletion at any time
                            by contacting us at <span className="text-indigo-400">arunkumar582004@gmail.com</span>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">6. Security</h2>
                        <p>
                            All data is transmitted over HTTPS. OAuth tokens are stored encrypted in a secured
                            PostgreSQL database. We follow industry-standard security practices.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">7. Contact</h2>
                        <p>
                            For privacy questions, contact: <span className="text-indigo-400">arunkumar582004@gmail.com</span>
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-6 border-t border-slate-800 flex gap-6 text-sm text-slate-500">
                    <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
                    <Link to="/login" className="hover:text-slate-300 transition-colors">← Back to App</Link>
                </div>
            </div>
        </div>
    );
}
