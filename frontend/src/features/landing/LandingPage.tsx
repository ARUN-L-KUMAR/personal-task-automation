import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Bot,
    Calendar,
    CheckSquare,
    FileSpreadsheet,
    Mail,
    MapPin,
    MessageSquare,
    PlayCircle,
    type LucideIcon,
} from 'lucide-react';
import './LandingPage.css';

type Feature = {
    icon: LucideIcon;
    title: string;
    description: string;
    outcome: string;
};

type FaqItem = {
    question: string;
    answer: string;
};

const tools = [
    { name: 'Gmail', color: '#EA4335', bg: '#fff3e0' },
    { name: 'Calendar', color: '#1a73e8', bg: '#e3f2fd' },
    { name: 'Sheets', color: '#0F9D58', bg: '#e8f5e9' },
    { name: 'Tasks', color: '#A142F4', bg: '#f3e5f5' },
    { name: 'Drive', color: '#00BCD4', bg: '#e0f7fa' },
    { name: 'Maps', color: '#FBBC04', bg: '#fff8e1' },
];

const features: Feature[] = [
    {
        icon: Calendar,
        title: 'Smart Calendar',
        description: 'AI detects scheduling conflicts, suggests optimal meeting slots, and highlights low-priority events based on your day.',
        outcome: 'Save 45 min/day on scheduling',
    },
    {
        icon: Mail,
        title: 'Smart Inbox',
        description: 'Triages Gmail automatically. Drafts replies, surfaces action items, and flags only what needs your attention.',
        outcome: 'Reach inbox zero faster',
    },
    {
        icon: CheckSquare,
        title: 'Task Management',
        description: 'Tasks are prioritized from deadlines, meetings, and email context so your next action is always clear.',
        outcome: 'Never miss a deadline again',
    },
    {
        icon: FileSpreadsheet,
        title: 'Google Sheets AI',
        description: 'Ask plain-English questions about spreadsheet data and turn raw rows into summaries and useful insights.',
        outcome: 'Reports in seconds, not hours',
    },
    {
        icon: MessageSquare,
        title: 'AI Chatbot',
        description: 'Chat naturally to manage your workspace: plan your day, draft follow-ups, and explain agent decisions.',
        outcome: 'One command for multiple tasks',
    },
    {
        icon: MapPin,
        title: 'Maps & Travel',
        description: 'Adds travel buffers between meetings, checks routes, and helps protect your schedule from commute surprises.',
        outcome: 'Never be late to a meeting',
    },
];

const testimonials = [
    {
        initials: 'AS',
        name: 'Ananya Sharma',
        role: 'VP of Operations, Zeta Corp',
        bg: '#e3f2fd',
        color: '#1a73e8',
        quote: 'G-ONE handles my inbox while I am in back-to-back meetings. I come out and everything critical has already been triaged.',
    },
    {
        initials: 'RK',
        name: 'Rohan Krishnamurthy',
        role: 'Founder, Lumio Studio',
        bg: '#e8f5e9',
        color: '#0F9D58',
        quote: 'The calendar AI is genuinely impressive. It caught three double-bookings in my first week and suggested better times.',
        featured: true,
    },
    {
        initials: 'PM',
        name: 'Priya Mehta',
        role: 'Head of Strategy, BuildFast',
        bg: '#f3e5f5',
        color: '#A142F4',
        quote: 'Our whole team uses G-ONE now. The Sheets AI alone replaced hours of weekly reporting work.',
    },
];

const pricingPlans = [
    {
        name: 'Free',
        price: '0',
        period: 'forever free',
        button: 'Get started free',
        featured: false,
        features: ['3 Google integrations', '50 AI actions/month', 'Basic task management', 'Email support'],
    },
    {
        name: 'Pro',
        price: '19',
        period: 'per month, billed monthly',
        button: 'Start free 14-day trial',
        featured: true,
        features: ['All Google integrations', 'Unlimited AI actions', 'Smart inbox triage', 'Calendar AI + travel time', 'Priority support'],
    },
    {
        name: 'Team',
        price: '49',
        period: 'per seat/month, billed annually',
        button: 'Contact sales',
        featured: false,
        features: ['Everything in Pro', 'Shared team dashboard', 'Admin controls & audit logs', 'SSO & 2FA', 'Dedicated account manager'],
    },
];

const faqs: FaqItem[] = [
    {
        question: 'Is my Google data private and secure?',
        answer: 'Yes. G-ONE uses Google OAuth, so your Google password is never handled by the app. Tokens are stored per user and protected by authentication.',
    },
    {
        question: 'Does it work with non-Google tools?',
        answer: 'This project currently focuses on Google Workspace integrations. Microsoft 365, Notion, and Slack can be added later through the same agent-oriented architecture.',
    },
    {
        question: 'Can I cancel or downgrade anytime?',
        answer: 'Yes. The pricing section is a product-facing plan model; account changes can be handled from settings when billing is connected.',
    },
    {
        question: 'What makes this different from Zapier or Make?',
        answer: 'Workflow tools need predefined automations. G-ONE reasons across calendar, tasks, email, travel, sheets, and notes to produce an explainable daily plan.',
    },
    {
        question: 'Is there a free trial for the Pro plan?',
        answer: 'The page presents a 14-day trial offer. You can wire this to your billing provider when paid plans are enabled.',
    },
];

function LogoMark({ small = false }: { small?: boolean }) {
    const size = small ? 14 : 16;
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
            <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity=".6" />
            <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity=".6" />
            <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2 5h6M5 2v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}

export function LandingPage() {
    const [openFaq, setOpenFaq] = useState(0);

    return (
        <div className="landing-pro">
            <nav>
                <Link to="/" className="nav-logo">
                    <div className="nav-logo-icon">
                        <LogoMark />
                    </div>
                    G-ONE
                </Link>
                <ul className="nav-links">
                    <li><a href="#features">Features</a></li>
                    <li><a href="#how">How it works</a></li>
                    <li><a href="#pricing">Pricing</a></li>
                    <li><a href="#faq">FAQ</a></li>
                </ul>
                <Link to="/login" className="nav-cta-ghost">Sign in</Link>
                <Link to="/register" className="nav-cta">Get started free</Link>
            </nav>

            <section className="hero-section">
                <div className="hero">
                    <div>
                        <div className="hero-badge"><span /> AI-Powered Workspace Automation</div>
                        <h1>Save 2+ hours daily with your <em>AI-powered</em> Google Workspace</h1>
                        <p className="hero-sub">
                            G-ONE connects your Calendar, Gmail, Tasks, Sheets, and more, then helps prioritize,
                            plan, and automate your day so you can focus on work that matters.
                        </p>
                        <div className="hero-actions">
                            <Link to="/register" className="btn-primary">
                                Start for free <ArrowRight size={14} />
                            </Link>
                            <a href="#how" className="btn-ghost">
                                <PlayCircle size={14} /> Watch demo
                            </a>
                        </div>
                        <div className="hero-stats">
                            <div className="hero-stat"><strong>12,000+</strong><span>Active users</span></div>
                            <div className="hero-stat-divider" />
                            <div className="hero-stat"><strong>2.4 hrs</strong><span>Avg time saved/day</span></div>
                            <div className="hero-stat-divider" />
                            <div className="hero-stat"><strong>4.9</strong><span>User rating</span></div>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="mockup-frame">
                            <div className="mockup-bar">
                                <div className="mockup-dot" style={{ background: '#ff5f57' }} />
                                <div className="mockup-dot" style={{ background: '#febc2e' }} />
                                <div className="mockup-dot" style={{ background: '#28c840' }} />
                                <div className="mockup-url">g-one.app/dashboard</div>
                            </div>
                            <div className="mockup-screen">
                                <div className="mockup-header">
                                    <div className="mockup-title">Today&apos;s tasks - Wednesday</div>
                                    <div className="mockup-chip">AI sorted</div>
                                </div>

                                {[
                                    ['Review Q3 budget report', 'Done', true],
                                    ["Reply to Sarah's proposal email", 'Done', true],
                                    ['Prepare board meeting slides', 'In progress', false],
                                    ['Schedule team retrospective', '2:00 PM', false],
                                ].map(([task, tag, done], index) => (
                                    <div key={task as string} className="task-row" style={index === 2 ? { border: '1px solid #1a4bff44' } : undefined}>
                                        <div className={`task-check ${done ? 'done' : ''}`} style={!done && index === 2 ? { borderColor: '#1a4bff' } : undefined}>
                                            {done && <span className="task-checkmark">&#10003;</span>}
                                        </div>
                                        <span className={`task-text ${done ? 'done' : ''}`}>{task}</span>
                                        <span
                                            className="task-tag"
                                            style={done ? { background: '#0fa96822', color: '#0fa968' } : index === 2 ? { background: '#1a4bff22', color: '#6e90ff' } : { background: '#ffffff11', color: '#666688' }}
                                        >
                                            {tag}
                                        </span>
                                    </div>
                                ))}

                                <div className="ai-bubble">
                                    <div className="ai-label">
                                        <LogoMark small />
                                        G-ONE suggests
                                    </div>
                                    <div className="ai-text">
                                        You have a <strong>3:00 PM call</strong> with the design team. I drafted an agenda
                                        from your last meeting notes. <strong>Review it?</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="logos-strip">
                <p className="logos-label">Connects seamlessly with your existing tools</p>
                <div className="logos-row">
                    {tools.map((tool) => (
                        <div className="logo-item" key={tool.name}>
                            <div className="logo-icon" style={{ background: tool.bg }}>
                                <span style={{ width: 14, height: 14, borderRadius: 2, background: tool.color, display: 'block' }} />
                            </div>
                            {tool.name}
                        </div>
                    ))}
                </div>
            </div>

            <section className="features" id="features">
                <div className="section-center">
                    <div className="section-tag">What G-ONE does</div>
                    <h2 className="section-heading">Every tool you use, now working <em>together</em></h2>
                    <p className="section-sub">
                        Not just integrations. G-ONE actively coordinates your tools through specialized agents so planning
                        happens with less manual work.
                    </p>
                </div>
                <div className="features-grid">
                    {features.map(({ icon: Icon, title, description, outcome }) => (
                        <div className="feat-card" key={title}>
                            <div className="feat-icon"><Icon size={18} strokeWidth={1.7} /></div>
                            <h3>{title}</h3>
                            <p>{description}</p>
                            <div className="feat-outcome">&#10003; {outcome}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="how" id="how">
                <div className="how-inner">
                    <div className="section-center">
                        <div className="section-tag">How it works</div>
                        <h2 className="section-heading">Up and running in under 3 minutes</h2>
                        <p className="section-sub">
                            No complex setup. Connect Google or use manual mode, set preferences, and generate your first
                            optimized plan immediately.
                        </p>
                    </div>
                    <div className="steps">
                        <div className="step">
                            <div className="step-num">1</div>
                            <h4>Connect your Google account</h4>
                            <p>OAuth connection gives G-ONE access only to the services you approve. No Google passwords are stored.</p>
                        </div>
                        <div className="step">
                            <div className="step-num">2</div>
                            <h4>Set your preferences</h4>
                            <p>Tell G-ONE your working hours, priorities, and planning style so the planner fits your routine.</p>
                        </div>
                        <div className="step">
                            <div className="step-num">3</div>
                            <h4>Let G-ONE handle the rest</h4>
                            <p>Review conflicts, travel buffers, task priorities, and an explainable plan from the agent pipeline.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="testimonials">
                <div className="section-center">
                    <div className="section-tag">Customer stories</div>
                    <h2 className="section-heading">Loved by professionals who move fast</h2>
                    <p className="section-sub">From solo founders to busy teams, G-ONE gives hours back to people who need momentum.</p>
                </div>
                <div className="testi-grid">
                    {testimonials.map((item) => (
                        <div className="testi-card" key={item.name} style={item.featured ? { border: '1px solid var(--blue-mid)' } : undefined}>
                            <div className="testi-stars">
                                {Array.from({ length: 5 }).map((_, index) => <span className="star" key={index}>&#9733;</span>)}
                            </div>
                            <p className="testi-quote">&quot;{item.quote}&quot;</p>
                            <div className="testi-author">
                                <div className="testi-avatar" style={{ background: item.bg, color: item.color }}>{item.initials}</div>
                                <div>
                                    <div className="testi-name">{item.name}</div>
                                    <div className="testi-role">{item.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="pricing" id="pricing">
                <div className="pricing-inner">
                    <div className="section-center">
                        <div className="section-tag">Pricing</div>
                        <h2 className="section-heading">Simple, transparent pricing</h2>
                        <p className="section-sub">Start free. Upgrade when you are ready. No hidden fees, no lock-in.</p>
                    </div>
                    <div className="pricing-grid">
                        {pricingPlans.map((plan) => (
                            <div className={`plan ${plan.featured ? 'featured' : ''}`} key={plan.name}>
                                {plan.featured && <div className="plan-badge">Most popular</div>}
                                <div className="plan-name">{plan.name}</div>
                                <div className="plan-price"><sup>$</sup>{plan.price}</div>
                                <div className="plan-period">{plan.period}</div>
                                <hr className="plan-divider" />
                                {plan.features.map((feature) => (
                                    <div className="plan-feature" key={feature}>
                                        <span className="plan-check">&#10003;</span>{feature}
                                    </div>
                                ))}
                                <Link to="/register" className={`plan-btn ${plan.featured ? 'plan-btn-solid' : 'plan-btn-outline'}`}>
                                    {plan.button}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="faq" id="faq">
                <div className="section-center">
                    <div className="section-tag">FAQ</div>
                    <h2 className="section-heading">Common questions</h2>
                </div>
                <div className="faq-list">
                    {faqs.map((item, index) => (
                        <div className={`faq-item ${openFaq === index ? 'open' : ''}`} key={item.question}>
                            <button className="faq-q" type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                                {item.question}
                                <div className="faq-icon"><PlusIcon /></div>
                            </button>
                            <div className="faq-a">{item.answer}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="cta-banner">
                <h2>Ready to reclaim your <em>day?</em></h2>
                <p>Join professionals who are cutting admin work with G-ONE.</p>
                <div className="cta-banner-actions">
                    <Link to="/register" className="btn-white">
                        Start free - no card needed <ArrowRight size={14} />
                    </Link>
                </div>
                <p className="cta-no-card">14-day Pro trial - No credit card - Cancel anytime</p>
            </section>

            <footer>
                <div className="footer-inner">
                    <div className="footer-top">
                        <div className="footer-brand">
                            <div className="footer-logo">
                                <div className="footer-logo-icon"><LogoMark small /></div>
                                G-ONE
                            </div>
                            <p>AI-powered personal task automation for calendar, email, tasks, travel, and planning in one unified workspace.</p>
                            <div className="footer-socials">
                                <a href="https://twitter.com" aria-label="Twitter">tw</a>
                                <a href="https://linkedin.com" aria-label="LinkedIn">in</a>
                                <a href="https://github.com" aria-label="GitHub">gh</a>
                            </div>
                        </div>
                        <div className="footer-col">
                            <h4>Product</h4>
                            <a href="#features">Features</a>
                            <a href="#features">Integrations</a>
                            <a href="#pricing">Pricing</a>
                            <a href="#how">Changelog</a>
                            <a href="#how">Roadmap</a>
                        </div>
                        <div className="footer-col">
                            <h4>Company</h4>
                            <a href="#features">About</a>
                            <a href="#how">Blog</a>
                            <a href="#pricing">Careers</a>
                            <a href="#faq">Press</a>
                        </div>
                        <div className="footer-col">
                            <h4>Resources</h4>
                            <a href="#how">Documentation</a>
                            <a href="#features">API</a>
                            <a href="#faq">Status</a>
                            <a href="#faq">Community</a>
                        </div>
                        <div className="footer-col">
                            <h4>Legal</h4>
                            <Link to="/privacy">Privacy Policy</Link>
                            <Link to="/terms">Terms of Service</Link>
                            <a href="#faq">Security</a>
                            <a href="#faq">Cookie Policy</a>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; {new Date().getFullYear()} G-ONE. AI Personal Task Automation. Built in India.</p>
                        <p>+91 98765 43210 - support@g-one.app</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
