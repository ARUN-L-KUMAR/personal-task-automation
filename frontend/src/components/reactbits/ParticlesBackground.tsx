import React, { useEffect, useRef } from 'react';

interface ParticlesProps {
    particleCount?: number;
    particleColor?: string;
    lineColor?: string;
    className?: string;
}

export function ParticlesBackground({
    particleCount = 40,
    particleColor = 'rgba(59, 130, 246, 0.4)',
    lineColor = 'rgba(59, 130, 246, 0.12)',
    className = '',
}: ParticlesProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
        let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
            height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
        };

        window.addEventListener('resize', handleResize);

        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
        }

        const particles: Particle[] = Array.from({ length: particleCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 2 + 1.5,
        }));

        let mouseX = -1000;
        let mouseY = -1000;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };

        window.addEventListener('mousemove', handleMouseMove);

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // Update and draw particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = particleColor;
                ctx.fill();

                // Connect particles near each other
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = lineColor;
                        ctx.lineWidth = 1 - dist / 120;
                        ctx.stroke();
                    }
                }

                // Connect to mouse cursor
                const mdx = p.x - mouseX;
                const mdy = p.y - mouseY;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < 140) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouseX, mouseY);
                    ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, [particleCount, particleColor, lineColor]);

    return (
        <canvas
            ref={canvasRef}
            className={`pointer-events-none absolute inset-0 z-0 ${className}`}
        />
    );
}
