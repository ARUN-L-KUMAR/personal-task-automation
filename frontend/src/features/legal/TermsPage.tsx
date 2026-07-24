import React from 'react';
import { motion } from 'framer-motion';
import { FileCheck, ShieldAlert, UserCheck, Scale, Mail } from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { PublicFooter } from '../../components/layout/PublicFooter';
import { SpotlightCard } from '../../components/reactbits/SpotlightCard';
import { ShinyText } from '../../components/reactbits/ShinyText';
import { ParticlesBackground } from '../../components/reactbits/ParticlesBackground';
import { useLenis } from '../../hooks/useLenis';
import '../landing/LandingPage.css';

export function TermsPage() {
    useLenis();

    return (
        <div className="landing-pro">
            <PublicNavbar />

            {/* Header Hero Banner */}
            <section className="page-hero">
                <ParticlesBackground particleCount={25} particleColor="rgba(26, 75, 255, 0.3)" lineColor="rgba(26, 75, 255, 0.08)" />
                <div className="page-hero-inner">
                    <div className="hero-badge mb-4">
                        <FileCheck size={14} className="text-blue-600" />{' '}
                        <ShinyText text="Terms of Agreement" speed={4} />
                    </div>
                    <h1>
                        Terms of <em>Service</em>
                    </h1>
                    <p className="page-hero-sub">
                        Clear, fair, and transparent guidelines governing your use of G-ONE workspace automation platform.
                    </p>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>
                        Last updated: March 2026 • Version 2.4
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
                            <UserCheck size={20} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>User Conduct</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                            You maintain responsibility for account security and agree to use the service for lawful personal or business tasks.
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
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Scale size={20} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Fair Usage</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                            Designed for high efficiency with fair API rate limits to ensure reliable uptime across all active users.
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
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShieldAlert size={20} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Service Terms</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                            Continuous background sync or manual sync options with no mandatory lock-in or hidden subscription traps.
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
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>1. Acceptance of Terms</h2>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
                            By accessing or using G-ONE (&quot;the App&quot;), creating an account, or authorizing Google OAuth connections, you agree to be bound by these Terms of Service. If you do not agree to all terms, please refrain from using the platform.
                        </p>
                    </section>

                    <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

                    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>2. Description of Service & Multi-Agent Engine</h2>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
                            G-ONE provides specialized AI agent assistance for schedule optimization, task prioritization, email action extraction, transit buffer calculation, and conflict resolution across Google Workspace. The platform is offered to enhance individual and team productivity.
                        </p>
                    </section>

                    <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

                    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>3. Google Account Permissions & Revocation</h2>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
                            By enabling Google Workspace integrations, you grant G-ONE permission to read and manage selected Google services (Calendar, Gmail, Tasks, Maps, Sheets, Contacts) solely for executing requested workflow tasks. You can modify or revoke permissions at any time via your{' '}
                            <a
                                href="https://myaccount.google.com/permissions"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1a4bff', fontWeight: 600, textDecoration: 'underline' }}
                            >
                                Google Security Permissions
                            </a>{' '}
                            dashboard.
                        </p>
                    </section>

                    <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

                    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>4. Limitation of Liability</h2>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
                            G-ONE is provided on an &quot;as is&quot; and &quot;as available&quot; basis. While we maintain high availability and accurate AI agent planning algorithms, G-ONE shall not be held liable for indirect, incidental, or consequential damages resulting from third-party Google API downtime or missed user schedule commitments.
                        </p>
                    </section>

                    <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

                    <section style={{ background: '#f4f7ff', padding: '24px', borderRadius: '16px', border: '1px solid #c2caff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Mail size={18} style={{ color: '#1a4bff' }} />
                            Questions About Our Terms?
                        </h2>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
                            If you have questions or feedback regarding these terms, please contact our legal support team at{' '}
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
