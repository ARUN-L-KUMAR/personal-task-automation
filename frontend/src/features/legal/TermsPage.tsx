import React from 'react';
import { Link } from 'react-router-dom';

export function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-start py-16 px-6">
            <div className="max-w-2xl w-full">
                <div className="mb-8 flex items-center gap-3">
                    <span className="text-3xl">🤖</span>
                    <span className="text-xl font-bold tracking-tight text-white">G-ONE</span>
                </div>

                <h1 className="text-3xl font-black mb-2 text-white">Terms of Service</h1>
                <p className="text-sm text-slate-400 mb-8">Last updated: March 2026</p>

                <div className="space-y-6 text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using G-ONE ("the App"), you agree to be bound by these Terms of Service.
                            If you do not agree, please do not use the App.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">2. Description of Service</h2>
                        <p>
                            G-ONE is a personal productivity assistant that integrates with Google services to help
                            manage tasks, calendar events, emails, and more. The App is provided as-is for personal use.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">3. Google Account Access</h2>
                        <p>
                            By signing in with Google, you grant G-ONE permission to access your Google account data
                            (name, email, and optionally Calendar, Gmail, Tasks, Contacts, and Sheets) solely to
                            provide the App's features. You may revoke this access at any time via your{' '}
                            <a
                                href="https://myaccount.google.com/permissions"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 underline"
                            >
                                Google Account permissions
                            </a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">4. User Responsibilities</h2>
                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>You are responsible for maintaining the security of your account</li>
                            <li>You agree not to use the App for any unlawful purpose</li>
                            <li>You agree not to attempt to reverse-engineer or disrupt the service</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">5. Limitation of Liability</h2>
                        <p>
                            The App is provided "as is" without warranties of any kind. We shall not be liable for
                            any indirect, incidental, or consequential damages arising from use of the App.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">6. Changes to Terms</h2>
                        <p>
                            We may update these terms from time to time. Continued use of the App after changes
                            constitutes acceptance of the revised terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-2">7. Contact</h2>
                        <p>
                            For any questions about these terms, contact:{' '}
                            <span className="text-indigo-400">arunkumar582004@gmail.com</span>
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-6 border-t border-slate-800 flex gap-6 text-sm text-slate-500">
                    <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
                    <Link to="/login" className="hover:text-slate-300 transition-colors">← Back to App</Link>
                </div>
            </div>
        </div>
    );
}
