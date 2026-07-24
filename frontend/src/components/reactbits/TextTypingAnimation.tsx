import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TypingTextProps {
    text: string;
    speed?: number;
    delay?: number;
    className?: string;
}

export function TextTypingAnimation({
    text = '',
    speed = 40,
    delay = 300,
    className = '',
}: TypingTextProps) {
    const [displayedLength, setDisplayedLength] = useState(0);
    const [isStarted, setIsStarted] = useState(false);

    useEffect(() => {
        const startTimer = setTimeout(() => {
            setIsStarted(true);
        }, delay);

        return () => clearTimeout(startTimer);
    }, [delay]);

    useEffect(() => {
        if (!isStarted) return;

        if (displayedLength < text.length) {
            const timer = setTimeout(() => {
                setDisplayedLength((prev) => prev + 1);
            }, speed);

            return () => clearTimeout(timer);
        }
    }, [displayedLength, isStarted, text.length, speed]);

    // Parse text to apply emphasis style to "AI-powered"
    const currentSubtext = text.slice(0, displayedLength);

    // Split text by "AI-powered" to render <em> styled span
    const parts = currentSubtext.split(/(AI-powered)/gi);

    return (
        <span className={`inline-block ${className}`}>
            {parts.map((part, i) => {
                if (part.toLowerCase() === 'ai-powered') {
                    return (
                        <em key={i} className="not-italic text-blue-600 font-serif italic">
                            {part}
                        </em>
                    );
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}

            {/* Blinking Cursor */}
            {displayedLength < text.length && (
                <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut' }}
                    className="inline-block ml-1 font-sans text-blue-600 font-light"
                >
                    |
                </motion.span>
            )}
        </span>
    );
}
