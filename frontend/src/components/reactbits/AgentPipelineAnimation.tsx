import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    CheckSquare,
    Mail,
    AlertTriangle,
    MapPin,
    Bot,
    Sparkles,
    CheckCircle2,
} from 'lucide-react';

interface AgentStep {
    id: string;
    label: string;
    agentName: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    log: string;
}

const pipelineSteps: AgentStep[] = [
    {
        id: 'calendar',
        label: 'Calendar',
        agentName: 'Calendar Agent',
        icon: Calendar,
        color: '#2563eb',
        bgColor: '#dbeafe',
        log: 'Reading events, meeting links & attendee status...',
    },
    {
        id: 'tasks',
        label: 'Tasks',
        agentName: 'Task Agent',
        icon: CheckSquare,
        color: '#7c3aed',
        bgColor: '#ede9fe',
        log: 'Analyzing deadlines, tags & task urgency...',
    },
    {
        id: 'email',
        label: 'Email',
        agentName: 'Email Agent',
        icon: Mail,
        color: '#dc2626',
        bgColor: '#fee2e2',
        log: 'Extracting action items & follow-ups from Gmail...',
    },
    {
        id: 'conflicts',
        label: 'Conflicts',
        agentName: 'Conflict Agent',
        icon: AlertTriangle,
        color: '#d97706',
        bgColor: '#fef3c7',
        log: 'Checking overlaps & inserting focus time buffers...',
    },
    {
        id: 'travel',
        label: 'Travel',
        agentName: 'Travel Agent',
        icon: MapPin,
        color: '#059669',
        bgColor: '#d1fae5',
        log: 'Calculating transit duration & route buffer via Maps...',
    },
];

const STEP_DELAY = 2000;   // ms per step
const DONE_PAUSE = 2500;   // ms to show "complete" before restarting

export function AgentPipelineAnimation() {
    const [currentStep, setCurrentStep] = useState(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const schedule = (step: number) => {
        if (timerRef.current) clearTimeout(timerRef.current);

        if (step < pipelineSteps.length) {
            // Advance to next agent step
            timerRef.current = setTimeout(() => {
                setCurrentStep(step + 1);
                schedule(step + 1);
            }, STEP_DELAY);
        } else {
            // All done — pause, then restart from 0
            timerRef.current = setTimeout(() => {
                setCurrentStep(0);
                schedule(0);
            }, DONE_PAUSE);
        }
    };

    useEffect(() => {
        schedule(0);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isComplete = currentStep === pipelineSteps.length;

    return (
        <div style={{
            width: '100%',
            maxWidth: '840px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: '0 24px',
            boxSizing: 'border-box',
        }}>

            {/* ── Step nodes row ─────────────────────────────────── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
            }}>
                {pipelineSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = currentStep === index;
                    const isPassed = currentStep > index;

                    return (
                        <React.Fragment key={step.id}>
                            {/* Node card — fixed 130px width so they're always equal */}
                            <motion.div
                                animate={{
                                    y: isActive ? -4 : 0,
                                    boxShadow: isActive
                                        ? '0 8px 24px rgba(59,130,246,0.14), 0 0 0 3px rgba(59,130,246,0.14)'
                                        : isPassed
                                        ? '0 2px 8px rgba(0,0,0,0.04)'
                                        : '0 1px 4px rgba(0,0,0,0.03)',
                                }}
                                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                                style={{
                                    width: '130px',
                                    flexShrink: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    padding: '16px 12px',
                                    borderRadius: '16px',
                                    border: isActive
                                        ? '2px solid #3b82f6'
                                        : '1.5px solid #e2e8f0',
                                    background: '#ffffff',
                                    cursor: 'default',
                                    opacity: isPassed || isActive ? 1 : 0.55,
                                    overflow: 'hidden',
                                    position: 'relative',
                                    transition: 'border-color 0.4s, opacity 0.4s',
                                    boxSizing: 'border-box',
                                }}
                            >
                                {/* Active indicator bar at top */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            key="bar"
                                            initial={{ scaleX: 0 }}
                                            animate={{ scaleX: 1 }}
                                            exit={{ scaleX: 0 }}
                                            transition={{ duration: 0.35, ease: 'easeOut' }}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: '3px',
                                                background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                                                transformOrigin: 'left',
                                            }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Progress fill (sweep bottom border) */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            key="sweep"
                                            initial={{ scaleX: 0 }}
                                            animate={{ scaleX: 1 }}
                                            transition={{ duration: STEP_DELAY / 1000, ease: 'linear' }}
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                height: '2px',
                                                background: '#3b82f6',
                                                transformOrigin: 'left',
                                                opacity: 0.5,
                                            }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Icon circle */}
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isActive || isPassed ? step.bgColor : '#f1f5f9',
                                    color: isActive || isPassed ? step.color : '#94a3b8',
                                    position: 'relative',
                                    transition: 'background-color 0.4s, color 0.4s',
                                }}>
                                    <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />

                                    {isPassed && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-4px',
                                            right: '-4px',
                                            background: '#10b981',
                                            color: '#fff',
                                            borderRadius: '50%',
                                            padding: '2px',
                                            display: 'flex',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                                        }}>
                                            <CheckCircle2 size={11} />
                                        </div>
                                    )}
                                </div>

                                {/* Label */}
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? '#1e293b' : '#64748b',
                                    letterSpacing: '0.01em',
                                    fontFamily: 'inherit',
                                }}>
                                    {step.label}
                                </span>
                            </motion.div>

                            {/* Arrow connector */}
                            {index < pipelineSteps.length - 1 && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    width: '18px',
                                    position: 'relative',
                                }}>
                                    <svg
                                        width="18" height="14" viewBox="0 0 18 14" fill="none"
                                        style={{ transition: 'opacity 0.4s' }}
                                    >
                                        <path
                                            d="M1 7 H16 M10 2 L16 7 L10 12"
                                            stroke={currentStep > index ? '#3b82f6' : '#cbd5e1'}
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ transition: 'stroke 0.4s' }}
                                        />
                                    </svg>

                                    {/* Traveling dot on active arrow */}
                                    {currentStep === index && (
                                        <motion.div
                                            animate={{ x: [-7, 7], opacity: [0, 1, 0] }}
                                            transition={{ repeat: Infinity, duration: 1.0, ease: 'easeInOut' }}
                                            style={{
                                                position: 'absolute',
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: '#3b82f6',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* ── Vertical connector ─────────────────────────────── */}
            <div style={{
                width: '2px',
                height: '22px',
                background: 'linear-gradient(to bottom, #e2e8f0, #3b82f6)',
                marginTop: '-8px',
                marginBottom: '-8px',
            }} />

            {/* ── Output node ────────────────────────────────────── */}
            <motion.div
                animate={{
                    scale: isComplete ? 1.04 : 1,
                    boxShadow: isComplete
                        ? '0 8px 32px rgba(59,130,246,0.28), 0 0 0 4px rgba(59,130,246,0.12)'
                        : '0 4px 16px rgba(0,0,0,0.16)',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 28px',
                    borderRadius: '100px',
                    background: isComplete
                        ? 'linear-gradient(135deg, #1d4ed8, #4338ca)'
                        : '#0f172a',
                    color: '#fff',
                    border: 'none',
                    transition: 'background 0.5s',
                }}
            >
                <Bot size={18} style={{ color: isComplete ? '#fde68a' : '#60a5fa' }} />
                <strong style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    fontFamily: 'inherit',
                }}>
                    {isComplete ? 'Optimized Schedule Ready ✓' : 'Optimized Plan'}
                </strong>
                {isComplete && (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    >
                        <Sparkles size={14} style={{ color: '#fde68a' }} />
                    </motion.div>
                )}
            </motion.div>

            {/* ── Status log bar ─────────────────────────────────── */}
            <div style={{
                width: '100%',
                maxWidth: '540px',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                boxSizing: 'border-box',
            }}>
                {/* Animated pulse dot */}
                <span style={{ position: 'relative', display: 'flex', width: '10px', height: '10px', flexShrink: 0 }}>
                    <motion.span
                        animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
                        transition={{ repeat: Infinity, duration: 1.6 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            background: isComplete ? '#10b981' : '#3b82f6',
                            display: 'block',
                        }}
                    />
                    <span style={{
                        position: 'relative',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: isComplete ? '#10b981' : '#3b82f6',
                        display: 'block',
                    }} />
                </span>

                {/* Log text */}
                <div style={{ flex: 1, overflow: 'hidden', textAlign: 'center' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                fontSize: '12.5px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {isComplete ? (
                                <span style={{ color: '#059669', fontWeight: 600 }}>
                                    ✓ All 5 agents done — schedule optimized in 0.4s!
                                </span>
                            ) : (
                                <span style={{ color: '#475569' }}>
                                    <strong style={{ color: '#2563eb' }}>
                                        {pipelineSteps[currentStep].agentName}:
                                    </strong>{' '}
                                    {pipelineSteps[currentStep].log}
                                </span>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
