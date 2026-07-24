import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Eye, FileText, Mail } from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { PublicFooter } from '../../components/layout/PublicFooter';
import { SpotlightCard } from '../../components/reactbits/SpotlightCard';
import { ShinyText } from '../../components/reactbits/ShinyText';
import { ParticlesBackground } from '../../components/reactbits/ParticlesBackground';
import { useLenis } from '../../hooks/useLenis';
import '../landing/LandingPage.css';

export function PrivacyPage() {
    useLenis();

    return (
        <div className="landing-pro">
            <PublicNavbar />

            {/* Header Hero Banner */}
            <section className="page-hero">
                <ParticlesBackground particleCount={25} particleColor="rgba(26, 75, 255, 0.3)" lineColor="rgba(26, 75, 255, 0.08)" />
                <div className="page-hero-inner">
                    <div className="hero-badge mb-4">
                        <ShieldCheck size={14} className="text-blue-600" />{' '}
                        <ShinyText text="Enterprise Security & Privacy" speed={4} />
                    </div>
                    <h1>
                        Privacy <em>Policy</em>
                    </h1>
                    <p className="page-hero-sub">
                        Your trust is our top priority. G-ONE is built with strict OAuth standards and enterprise-grade encryption to protect your Google data.
                    </p>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>
                        Last updated: March 2026 • Effective immediately
                    </div>
                </div>
            </section>

            {/* Main Content Container */}
            <main className="page-container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="page-grid-3"
                >
                    <SpotlightCard
                        spotlightColor="rgba(26, 75, 255, 0.12)"
                        style={{
                            padding: '24px',
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}
                    >
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Lock size={20} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>OAuth Security</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                            Official Google OAuth tokens stored encrypted. We never see or store your raw Google account password.
                        </p>
                    </SpotlightCard>

                    <SpotlightCard
                        spotlightColor="rgba(26, 75, 255, 0.12)"
                        style={{
                            padding: '24px',
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}
                    >
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Eye size={20} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Zero Data Selling</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                            Your personal files, emails, and calendar events are never sold, rented, or transferred to third parties.
                        </p>
                    </SpotlightCard>

                    <SpotlightCard
                        spotlightColor="rgba(26, 75, 255, 0.12)"
                        style={{
                            padding: '24px',
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}
                    >
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={20} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Limited Use Policy</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                            G-ONE strictly adheres to the official Google API Services User Data Policy Limited Use requirements.
                        </p>
                    </SpotlightCard>
                </motion.div>

                {/* Detailed Document Container */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '24px',
                        padding: '40px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '28px',
                    }}
                >
                    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>1. Overview & Mission</h2>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
                            G-ONE (&quot;the App&quot;) is an AI-powered workspace assistant that integrates with official Google API services (Calendar, Gmail, Tasks, Maps, Sheets, Contacts) to help prioritize, plan, and automate your workflow. We take data protection seriously and design our architecture to respect user autonomy.
                        </p>
                    </section>

                    <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

                    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>2. Information We Collect & Access</h2>
                        <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#475569', lineHeight: '1.7', listStyleType: 'disc' }}>
                            <li><strong>Account Identity:</strong> Your name and email address from Google OAuth for session management.</li>
                            <li><strong>OAuth Access Tokens:</strong> User-specific authentication tokens stored encrypted in a secure database.</li>
                            <li><strong>Initiated Sync Data:</strong> Calendar events, Gmail threads, and Tasks read only during agent workflow processing.</li>
                            <li><strong>App Configurations:</strong> Custom working hours, default travel modes, and planning preferences saved in your account.</li>
                        </ul>
                    </section>

                    <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

                    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>3. Google API Services Limited Use Compliance</h2>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
                            G-ONE&apos;s use and transfer to any other app of information received from Google APIs will adhere to{' '}
                            <a
                                href="https://developers.google.com/terms/api-services-user-data-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1a4bff', fontWeight: 600, textDecoration: 'underline' }}
                            >
                                Google API Services User Data Policy
                            </a>
                            , including the Limited Use requirements.
                        </p>
                    </section>

                    <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

                    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>4. Data Retention & Revocation</h2>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
                            You remain in complete control of your data. You may disconnect G-ONE from your Google account at any time via your account settings or directly on your{' '}
                            <a
                                href="https://myaccount.google.com/permissions"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1a4bff', fontWeight: 600, textDecoration: 'underline' }}
                            >
                                Google Security Permissions
                            </a>{' '}
                            page. You can also request complete account deletion by emailing our support team.
                        </p>
                    </section>

                    <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

                    <section style={{ background: '#f4f7ff', padding: '24px', borderRadius: '16px', border: '1px solid #c2caff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Mail size={18} style={{ color: '#1a4bff' }} />
                            Have Privacy Questions?
                        </h2>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
                            Our team is dedicated to safeguarding your privacy. Contact us directly at{' '}
                            <a href="mailto:larunkumar.co@gmail.com" style={{ color: '#1a4bff', fontWeight: 700 }}>
                                larunkumar.co@gmail.com
                            </a>.
                        </p>
                    </section>
                </motion.div>
            </main>

            <PublicFooter />
        </div>
    );
}
