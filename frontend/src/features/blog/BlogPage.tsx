import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, ArrowRight, Tag } from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { PublicFooter } from '../../components/layout/PublicFooter';
import { SpotlightCard } from '../../components/reactbits/SpotlightCard';
import { ShinyText } from '../../components/reactbits/ShinyText';
import { ParticlesBackground } from '../../components/reactbits/ParticlesBackground';
import { useLenis } from '../../hooks/useLenis';
import '../landing/LandingPage.css';

interface BlogPost {
    title: string;
    tag: string;
    date: string;
    readTime: string;
    excerpt: string;
    author: string;
}

const blogPosts: BlogPost[] = [
    {
        title: 'Introducing G-ONE v2.4: Real-time Multi-Agent Conflict Resolution',
        tag: 'Release Notes',
        date: 'March 20, 2026',
        readTime: '4 min read',
        excerpt: 'Our latest engine release introduces zero-latency background conflict resolution, live Google Maps travel buffer calculations, and automated Gmail priority tagging.',
        author: 'Arun Kumar',
    },
    {
        title: 'How Multi-Agent Systems Beat Single-Prompt LLMs in Schedule Planning',
        tag: 'Engineering',
        date: 'March 12, 2026',
        readTime: '6 min read',
        excerpt: 'Why splitting complex daily planning into specialized agents (Calendar, Task, Email, Conflict, Travel) leads to 99.4% conflict-free schedules.',
        author: 'AI Engineering Team',
    },
    {
        title: '5 Productivity Hacks for Google Workspace Power Users',
        tag: 'Guides',
        date: 'February 28, 2026',
        readTime: '5 min read',
        excerpt: 'Discover how top founders and executives save over 2 hours every day by pairing Live Mode background sync with custom focus time buffers.',
        author: 'Product Team',
    },
    {
        title: 'Enterprise Security: How We Encrypt & Isolate Google OAuth Tokens',
        tag: 'Security',
        date: 'February 15, 2026',
        readTime: '5 min read',
        excerpt: 'A deep dive into G-ONE’s security architecture, JWT session guards, PostgreSQL token encryption, and Google API Limited Use compliance.',
        author: 'Security Lead',
    },
];

export function BlogPage() {
    useLenis();

    return (
        <div className="landing-pro">
            <PublicNavbar />

            {/* Hero Section */}
            <section className="page-hero">
                <ParticlesBackground particleCount={25} particleColor="rgba(26, 75, 255, 0.35)" lineColor="rgba(26, 75, 255, 0.1)" />
                <div className="page-hero-inner">
                    <div className="hero-badge mb-4">
                        <Sparkles size={14} className="text-blue-600" />{' '}
                        <ShinyText text="Updates & Insights" speed={4} />
                    </div>
                    <h1>
                        Product <em>Blog & Changelog</em>
                    </h1>
                    <p className="page-hero-sub">
                        Stay up to date with the latest G-ONE releases, multi-agent AI research, workspace productivity tips, and security updates.
                    </p>
                </div>
            </section>

            {/* Main Content Container */}
            <main className="page-container">
                {/* Featured Post Card */}
                <SpotlightCard
                    spotlightColor="rgba(26, 75, 255, 0.15)"
                    style={{
                        padding: '36px',
                        borderRadius: '24px',
                        border: '1px solid #c2caff',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f4f6ff 100%)',
                        boxShadow: '0 4px 20px rgba(26,75,255,0.06)',
                        cursor: 'pointer',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: '100px',
                                background: '#1a4bff',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                            }}>
                                Featured Release
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={12} /> {blogPosts[0].date}
                            </span>
                        </div>
                        <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: '1.25' }}>
                            {blogPosts[0].title}
                        </h2>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65' }}>
                            {blogPosts[0].excerpt}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#1a4bff', marginTop: '4px' }}>
                            Read release story <ArrowRight size={16} />
                        </div>
                    </div>
                </SpotlightCard>

                {/* Posts Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="page-grid-3"
                >
                    {blogPosts.slice(1).map((post) => (
                        <SpotlightCard
                            key={post.title}
                            spotlightColor="rgba(26, 75, 255, 0.12)"
                            style={{
                                padding: '24px',
                                borderRadius: '20px',
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '16px',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        background: '#f1f5f9',
                                        color: '#334155',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        textTransform: 'uppercase',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}>
                                        <Tag size={10} /> {post.tag}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{post.readTime}</span>
                                </div>
                                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', lineHeight: '1.35' }}>
                                    {post.title}
                                </h3>
                                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                                    {post.excerpt}
                                </p>
                            </div>
                            <div style={{
                                paddingTop: '12px',
                                borderTop: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#64748b',
                            }}>
                                <span>By {post.author}</span>
                                <ArrowRight size={14} style={{ color: '#1a4bff' }} />
                            </div>
                        </SpotlightCard>
                    ))}
                </motion.div>
            </main>

            <PublicFooter />
        </div>
    );
}
