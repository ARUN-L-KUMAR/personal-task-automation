import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLenis } from '../../hooks/useLenis';
import {
    ArrowRight,
    Bot,
    Calendar,
    CheckSquare,
    Mail,
    MapPin,
    MessageSquare,
    PlayCircle,
    AlertTriangle,
    RefreshCw,
    XCircle,
    CheckCircle2,
    Lock,
    Shield,
    Github,
    Twitter,
    Linkedin,
    type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { SpotlightCard } from '../../components/reactbits/SpotlightCard';
import { ShinyText } from '../../components/reactbits/ShinyText';
import { TiltCard } from '../../components/reactbits/TiltCard';
import { ParticlesBackground } from '../../components/reactbits/ParticlesBackground';
import { AgentPipelineAnimation } from '../../components/reactbits/AgentPipelineAnimation';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { PublicFooter } from '../../components/layout/PublicFooter';
import { TextTypingAnimation } from '../../components/reactbits/TextTypingAnimation';
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

const GmailIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M1.5 19V6.2C1.5 5.2 2.3 4.4 3.3 4.4H4.5L12 10.1L19.5 4.4H20.7C21.7 4.4 22.5 5.2 22.5 6.2V19C22.5 20 21.7 20.8 20.7 20.8H18V9.5L12 14L6 9.5V20.8H3.3C2.3 20.8 1.5 20 1.5 19Z" fill="#EA4335" />
        <path d="M18 9.5V20.8H20.7C21.7 20.8 22.5 20 22.5 19V6.2L18 9.5Z" fill="#4285F4" />
        <path d="M1.5 6.2V19C1.5 20 2.3 20.8 3.3 20.8H6V9.5L1.5 6.2Z" fill="#FBBC04" />
        <path d="M6 9.5L12 14L18 9.5V4.4H4.5L6 9.5Z" fill="#34A853" />
    </svg>
);

const CalendarIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3 4.9 3 6V20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20Z" fill="#4285F4"/>
        <path d="M7 11H12V16H7V11Z" fill="#1A73E8"/>
        <path d="M16 11H14V13H16V11Z" fill="#EA4335"/>
    </svg>
);

const TasksIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#1A73E8"/>
        <path d="M9.5 15.5L6.5 12.5L7.91 11.09L9.5 12.67L16.09 6.08L17.5 7.5L9.5 15.5Z" fill="#FFFFFF"/>
    </svg>
);

const MapsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#EA4335"/>
        <circle cx="12" cy="9" r="3.5" fill="#FFFFFF"/>
        <circle cx="12" cy="9" r="2" fill="#4285F4"/>
    </svg>
);

const SheetsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#0F9D58"/>
        <path d="M19 11H13V7H19V11ZM11 7V11H5V7H11ZM5 13H11V17H5V13ZM13 17V13H19V17H13Z" fill="#FFFFFF"/>
    </svg>
);

const ContactsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="12" fill="#1A73E8"/>
        <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="#FFFFFF"/>
        <path d="M12 13.5C9.33 13.5 4 14.84 4 17.5V19H20V17.5C20 14.84 14.67 13.5 12 13.5Z" fill="#FFFFFF"/>
    </svg>
);

const tools = [
    { name: 'Gmail', icon: GmailIcon, bg: '#fff0ee' },
    { name: 'Calendar', icon: CalendarIcon, bg: '#eef4fe' },
    { name: 'Tasks', icon: TasksIcon, bg: '#eef4fe' },
    { name: 'Maps', icon: MapsIcon, bg: '#fff0ee' },
    { name: 'Sheets', icon: SheetsIcon, bg: '#e8f8f0' },
    { name: 'Contacts', icon: ContactsIcon, bg: '#eef4fe' },
];

const features: Feature[] = [
    {
        icon: AlertTriangle,
        title: 'Detect meeting conflicts',
        description: 'Automatically scans your schedule and warns you about overlapping events and impossible back-to-backs before they happen.',
        outcome: 'Conflict-free scheduling',
    },
    {
        icon: Mail,
        title: 'Extract action items from Gmail',
        description: 'Triages your inbox to find requests and questions, converting them directly into prioritized tasks on your board.',
        outcome: 'Never drop the ball',
    },
    {
        icon: MapPin,
        title: 'Plan travel between locations',
        description: 'Reads physical meeting locations and adds intelligent transit or driving buffers directly to your calendar.',
        outcome: 'Always arrive on time',
    },
    {
        icon: Calendar,
        title: 'Generate optimized daily schedule',
        description: 'Takes your scattered tasks, meetings, and habits to build a realistic, conflict-free itinerary for the entire day.',
        outcome: 'Focus on execution',
    },
    {
        icon: MessageSquare,
        title: 'Explain why each task is prioritized',
        description: 'Ask the chatbot why it scheduled something. Agents explain their reasoning based on deadlines, context, and importance.',
        outcome: 'Transparent AI reasoning',
    },
    {
        icon: RefreshCw,
        title: 'Sync live Google data',
        description: 'Live two-way sync keeps G-ONE updated the second your Google Calendar or Gmail changes in the background.',
        outcome: 'Always up to date',
    },
];

const testimonials = [
    {
        initials: 'AS',
        name: 'Ananya Sharma',
        role: 'VP of Operations, Zeta Corp',
        bg: '#e3f2fd',
        color: '#1a73e8',
        quote: 'The multi-agent system caught a conflict between my flight and a board meeting that I had completely missed.',
    },
    {
        initials: 'RK',
        name: 'Rohan Krishnamurthy',
        role: 'Founder, Lumio Studio',
        bg: '#e8f5e9',
        color: '#0F9D58',
        quote: 'My favorite part is asking the chatbot to reorganize my afternoon. It talks to all the agents and outputs a perfect new plan.',
        featured: true,
    },
    {
        initials: 'PM',
        name: 'Priya Mehta',
        role: 'Head of Strategy, BuildFast',
        bg: '#f3e5f5',
        color: '#A142F4',
        quote: 'I used to spend an hour every morning planning my day. Now I just approve the plan generated by the AI pipeline.',
    },
];

const pricingPlans = [
    {
        name: 'Free',
        price: '0',
        period: 'forever free',
        button: 'Get started free',
        featured: false,
        features: ['Manual mode planner', '3 Google integrations', 'Basic task management', 'Standard AI models'],
    },
    {
        name: 'Pro',
        price: '19',
        period: 'per month, billed monthly',
        button: 'Start free 14-day trial',
        featured: true,
        features: ['Live mode auto-sync', 'Full multi-agent pipeline', 'Advanced conflict detection', 'Smart travel routing', 'Premium AI models'],
    },
    {
        name: 'Team',
        price: '49',
        period: 'per seat/month, billed annually',
        button: 'Contact sales',
        featured: false,
        features: ['Everything in Pro', 'Cross-team conflict resolution', 'Shared team dashboard', 'SSO & 2FA', 'Dedicated support'],
    },
];

const faqs: FaqItem[] = [
    {
        question: 'Is my Google data private and secure?',
        answer: 'Yes. G-ONE uses standard OAuth-based Google connections. Your password is never seen. Tokens are user-specific, stored securely, and protected by JWT authentication. You can disconnect your account at any time.',
    },
    {
        question: 'How does the multi-agent system work?',
        answer: 'When you request a plan, the Coordinator Agent breaks it down. The Calendar Agent reads events, the Task Agent checks deadlines, the Email Agent extracts actions, and the Travel Agent adds buffers. Finally, the Conflict Agent ensures everything fits before presenting the result.',
    },
    {
        question: 'What is the difference between Live Mode and Manual Mode?',
        answer: 'Live Mode continuously syncs with your Google account in the background. Manual Mode allows you to import data only when you explicitly click a button, giving you more control over API usage.',
    },
    {
        question: 'Does it work with non-Google tools?',
        answer: 'Currently, the agent architecture is heavily optimized for Google Workspace. Microsoft 365 and Notion support are planned for future versions.',
    },
];

function PlusIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2 5h6M5 2v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}

export function LandingPage() {
    const [openFaq, setOpenFaq] = useState(0);
    useLenis();

    return (
        <div className="landing-pro">
            <PublicNavbar />

            <section className="hero-section relative">
                <ParticlesBackground particleCount={35} particleColor="rgba(26, 75, 255, 0.4)" lineColor="rgba(26, 75, 255, 0.12)" />
                <div className="hero relative z-10">
                    <div>
                        <div className="hero-badge">
                            <span /> <ShinyText text="Multi-Agent Workspace Automation" speed={4} />
                        </div>
                        <h1>
                            <TextTypingAnimation text="Save 2+ hours daily with your AI-powered Google Workspace" speed={40} />
                        </h1>
                        <p className="hero-sub">
                            G-ONE connects your Calendar, Gmail, Tasks, and Maps, then helps prioritize,
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
                        <TiltCard intensity={10}>
                            <div className="mockup-frame dashboard-mockup">
                                <div className="mockup-bar">
                                    <div className="mockup-dot" style={{ background: '#ff5f57' }} />
                                    <div className="mockup-dot" style={{ background: '#febc2e' }} />
                                    <div className="mockup-dot" style={{ background: '#28c840' }} />
                                    <div className="mockup-url">g-one.app/dashboard</div>
                                </div>
                                <div className="mockup-app-body">
                                    <div className="mockup-sidebar">
                                        <div className="mockup-nav-item active"><Calendar size={14} /> Planner</div>
                                        <div className="mockup-nav-item"><Mail size={14} /> Inbox</div>
                                        <div className="mockup-nav-item"><CheckSquare size={14} /> Tasks</div>
                                    </div>
                                    <div className="mockup-main">
                                        <div className="mockup-header">
                                            <div className="mockup-title">Today&apos;s Optimized Plan</div>
                                            <div className="mockup-chip"><RefreshCw size={10} /> Live Mode</div>
                                        </div>

                                        <div className="mockup-stats-row">
                                            <div className="mockup-stat-box">
                                                <span>Focus Time</span>
                                                <strong>4h 30m</strong>
                                            </div>
                                            <div className="mockup-stat-box alert">
                                                <span>Conflicts</span>
                                                <strong>1 Resolved</strong>
                                            </div>
                                        </div>

                                        <div className="mockup-timeline">
                                            <div className="timeline-item meeting">
                                                <div className="time">10:00 AM</div>
                                                <div className="content">
                                                    <strong>Design Sync</strong>
                                                    <span>Zoom Room A</span>
                                                </div>
                                            </div>
                                            <div className="timeline-item travel">
                                                <div className="time">11:00 AM</div>
                                                <div className="content">
                                                    <strong><MapPin size={10} style={{ display: 'inline', marginRight: 4 }} />Travel Buffer</strong>
                                                    <span>Added by Travel Agent (25 mins)</span>
                                                </div>
                                            </div>
                                            <div className="timeline-item task active-task" style={{ position: 'relative' }}>
                                                <div className="time">11:30 AM</div>
                                                <div className="content">
                                                    <strong>Review Q3 budget report</strong>
                                                    <span>Extracted from Gmail</span>
                                                </div>
                                                <div className="ai-badge"><Bot size={10} /> High Priority</div>
                                            </div>
                                            <div className="timeline-item task">
                                                <div className="time">1:00 PM</div>
                                                <div className="content">
                                                    <strong>Prepare board slides</strong>
                                                    <span>Google Tasks</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TiltCard>
                    </div>
                </div>
            </section>

            <section className="pipeline-section">
                <div className="section-center">
                    <h2 className="pipeline-heading">One request. <em>Multiple agents</em> working together.</h2>
                    <p className="pipeline-sub">Behind the scenes, specialized AI agents collaborate to organize your life.</p>
                </div>
                <AgentPipelineAnimation />
            </section>

            <section className="problem-statement">
                <div className="section-center">
                    <div className="problem-grid">
                        <div className="problem-card old-way">
                            <div className="card-badge">The Old Way</div>
                            <ul className="problem-list">
                                <li><XCircle size={18} className="icon-red" /> Tasks are scattered across 4 different apps</li>
                                <li><XCircle size={18} className="icon-red" /> Meetings conflict constantly</li>
                                <li><XCircle size={18} className="icon-red" /> Emails hide critical action items</li>
                                <li><XCircle size={18} className="icon-red" /> Travel time is completely ignored</li>
                                <li><XCircle size={18} className="icon-red" /> You manually plan everything every morning</li>
                            </ul>
                        </div>
                        <div className="problem-card new-way">
                            <div className="card-badge">The G-ONE Way</div>
                            <ul className="problem-list">
                                <li><CheckCircle2 size={18} className="icon-green" /> Everything unified in one smart dashboard</li>
                                <li><CheckCircle2 size={18} className="icon-green" /> AI detects and resolves conflicts before they happen</li>
                                <li><CheckCircle2 size={18} className="icon-green" /> Action items extracted instantly from Gmail</li>
                                <li><CheckCircle2 size={18} className="icon-green" /> Commute times automatically added to your calendar</li>
                                <li><CheckCircle2 size={18} className="icon-green" /> Agents generate your perfect day in 2 seconds</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <section className="integrations-section">
                <div className="section-center">
                    <h2 className="section-heading">Deep Google Workspace Integration</h2>
                    <p className="section-sub">Choose between <strong className="mode-badge live-mode">Live Mode</strong> for instant background syncing or <strong className="mode-badge manual-mode">Manual Mode</strong> for total control.</p>
                </div>
                <div className="integrations-grid">
                    {tools.map((tool) => {
                        const IconComponent = tool.icon;
                        return (
                            <SpotlightCard className="integration-card" key={tool.name} spotlightColor="rgba(26, 75, 255, 0.12)">
                                <div className="integration-icon" style={{ background: tool.bg }}>
                                    <IconComponent />
                                </div>
                                <div className="integration-name">Google {tool.name}</div>
                                <div className="integration-status">Connected</div>
                            </SpotlightCard>
                        );
                    })}
                </div>
                <div className="security-note">
                    <Shield size={16} />
                    <span><strong>Enterprise-grade security:</strong> OAuth-based connection, user-specific tokens, protected JWT authentication. You can disconnect anytime.</span>
                    <Lock size={16} />
                </div>
            </section>

            <section className="how" id="how">
                <div className="how-inner">
                    <div className="section-center">
                        <div className="section-tag">How it works</div>
                        <h2 className="section-heading">Up and running in 3 simple steps</h2>
                    </div>
                    <div className="steps">
                        <div className="step">
                            <div className="step-num">1</div>
                            <h4>Connect your Google account</h4>
                            <p>G-ONE securely fetches your Calendar, Gmail, Tasks, Maps, and Sheets using official OAuth.</p>
                        </div>
                        <div className="step">
                            <div className="step-num">2</div>
                            <h4>Set your preferences</h4>
                            <p>Tell G-ONE your working hours, default travel modes, and personal planning style.</p>
                        </div>
                        <div className="step">
                            <div className="step-num">3</div>
                            <h4>Let agents generate the plan</h4>
                            <p>A conflict-aware, fully optimized schedule is created instantly, balancing your meetings and tasks.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features" id="features">
                <div className="section-center">
                    <div className="section-tag">Backend Capabilities</div>
                    <h2 className="section-heading">Advanced AI architecture, simple UI</h2>
                </div>
                <div className="features-grid">
                    {features.map(({ icon: Icon, title, description, outcome }) => (
                        <SpotlightCard className="feat-card" key={title} spotlightColor="rgba(26, 75, 255, 0.12)">
                            <div className="feat-icon"><Icon size={18} strokeWidth={1.7} /></div>
                            <h3>{title}</h3>
                            <p>{description}</p>
                            <div className="feat-outcome">&#10003; {outcome}</div>
                        </SpotlightCard>
                    ))}
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
                        <SpotlightCard className="testi-card" key={item.name} spotlightColor="rgba(26, 75, 255, 0.1)">
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
                        </SpotlightCard>
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
                            <SpotlightCard className={`plan ${plan.featured ? 'featured' : ''}`} key={plan.name} spotlightColor={plan.featured ? "rgba(26, 75, 255, 0.2)" : "rgba(26, 75, 255, 0.08)"}>
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
                            </SpotlightCard>
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
                                <span className="faq-icon"><PlusIcon /></span>
                            </button>
                            <div className="faq-a">
                                <p>{item.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <PublicFooter />
        </div>
    );
}
