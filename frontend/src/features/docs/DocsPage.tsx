import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, ChevronRight } from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { PublicFooter } from '../../components/layout/PublicFooter';
import { SpotlightCard } from '../../components/reactbits/SpotlightCard';
import { ShinyText } from '../../components/reactbits/ShinyText';
import { ParticlesBackground } from '../../components/reactbits/ParticlesBackground';
import { useLenis } from '../../hooks/useLenis';
import '../landing/LandingPage.css';

interface DocArticle {
    title: string;
    category: string;
    description: string;
    readTime: string;
}

const docArticles: DocArticle[] = [
    {
        title: 'Connecting Google Workspace via OAuth 2.0',
        category: 'Authentication',
        description: 'Step-by-step guide to authorizing G-ONE with official Google OAuth scopes for Calendar, Gmail, and Tasks.',
        readTime: '3 min read',
    },
    {
        title: 'Understanding Multi-Agent Architecture',
        category: 'Core Concepts',
        description: 'How the Coordinator, Calendar, Task, Email, Conflict, and Travel agents collaborate to resolve overlapping meetings.',
        readTime: '5 min read',
    },
    {
        title: 'Live Mode vs. Manual Sync Mode',
        category: 'Sync Engine',
        description: 'Learn when to enable background live mode for automated updates or manual mode for controlled API quota management.',
        readTime: '4 min read',
    },
    {
        title: 'Configuring Travel Buffers with Google Maps',
        category: 'Integrations',
        description: 'How the Travel Agent automatically calculates driving, walking, or transit times between event locations.',
        readTime: '3 min read',
    },
    {
        title: 'REST API Endpoints & Webhooks',
        category: 'API Reference',
        description: 'Technical reference for developers looking to integrate G-ONE schedule optimization into custom workflows.',
        readTime: '6 min read',
    },
    {
        title: 'Troubleshooting Token Expiration & Scopes',
        category: 'Troubleshooting',
        description: 'Solutions for expired Google tokens, scope re-authorization, and backend connectivity troubleshooting.',
        readTime: '4 min read',
    },
];

export function DocsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    useLenis();

    const categories = ['All', 'Authentication', 'Core Concepts', 'Sync Engine', 'Integrations', 'API Reference', 'Troubleshooting'];

    const filteredArticles = docArticles.filter((article) => {
        const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
        const matchesQuery = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesQuery;
    });

    return (
        <div className="landing-pro">
            <PublicNavbar />

            {/* Hero Section */}
            <section className="page-hero">
                <ParticlesBackground particleCount={25} particleColor="rgba(26, 75, 255, 0.35)" lineColor="rgba(26, 75, 255, 0.1)" />
                <div className="page-hero-inner">
                    <div className="hero-badge mb-4">
                        <BookOpen size={14} className="text-blue-600" />{' '}
                        <ShinyText text="Documentation & Help Center" speed={4} />
                    </div>
                    <h1>
                        Everything you need to <em>master G-ONE</em>
                    </h1>
                    <p className="page-hero-sub">
                        Explore guides, architecture documentation, API specifications, and troubleshooting steps for your AI agent workspace.
                    </p>

                    {/* Search Bar */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: '580px', margin: '0 auto' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search documentation, guides, or APIs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                paddingLeft: '48px',
                                paddingRight: '16px',
                                paddingTop: '14px',
                                paddingBottom: '14px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '16px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                                fontSize: '14px',
                                outline: 'none',
                                color: '#0f172a',
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* Main Content Container */}
            <main className="page-container">
                {/* Category Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '100px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: selectedCategory === cat ? 'none' : '1px solid #e2e8f0',
                                background: selectedCategory === cat ? '#1a4bff' : '#ffffff',
                                color: selectedCategory === cat ? '#ffffff' : '#475569',
                                boxShadow: selectedCategory === cat ? '0 4px 14px rgba(26,75,255,0.2)' : '0 1px 3px rgba(0,0,0,0.02)',
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Articles Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="page-grid-2"
                >
                    {filteredArticles.map((article) => (
                        <SpotlightCard
                            key={article.title}
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
                                        background: '#eef1ff',
                                        color: '#1a4bff',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        textTransform: 'uppercase',
                                    }}>
                                        {article.category}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{article.readTime}</span>
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', lineHeight: '1.3' }}>
                                    {article.title}
                                </h3>
                                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                                    {article.description}
                                </p>
                            </div>
                            <div style={{
                                paddingTop: '12px',
                                borderTop: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#1a4bff',
                            }}>
                                Read article <ChevronRight size={15} style={{ marginLeft: '4px' }} />
                            </div>
                        </SpotlightCard>
                    ))}
                </motion.div>
            </main>

            <PublicFooter />
        </div>
    );
}
