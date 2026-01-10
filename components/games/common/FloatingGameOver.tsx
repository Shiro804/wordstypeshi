"use client";

import { useState, useEffect } from "react";

interface FloatingGameOverProps {
    /** Whether to show the animation */
    active: boolean;
    /** Text to display (e.g., "Game Over", "You Win!") */
    text: string;
    /** Whether this is a win or lose state */
    outcome: 'win' | 'lose';
    /** Duration of the entire animation in ms (default: 1500) */
    duration?: number;
    /** Callback when animation completes */
    onComplete: () => void;
}

/**
 * Animated floating text that appears when game ends.
 * Animation stages:
 * 1. Zoom in + fade in (0-300ms)
 * 2. Hold visible (300-1200ms)
 * 3. Fade out + drift up (1200-1500ms)
 * Then calls onComplete to trigger the result overlay
 */
export default function FloatingGameOver({
    active,
    text,
    outcome,
    duration = 1500,
    onComplete,
}: FloatingGameOverProps) {
    const [stage, setStage] = useState<'hidden' | 'entering' | 'visible' | 'exiting'>('hidden');

    useEffect(() => {
        if (!active) {
            setStage('hidden');
            return;
        }

        // Start animation
        setStage('entering');

        // Stage transitions
        const enterTimer = setTimeout(() => setStage('visible'), 300);
        const exitTimer = setTimeout(() => setStage('exiting'), duration - 300);
        const completeTimer = setTimeout(() => {
            setStage('hidden');
            onComplete();
        }, duration);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(exitTimer);
            clearTimeout(completeTimer);
        };
    }, [active, duration, onComplete]);

    if (stage === 'hidden') return null;

    const isWin = outcome === 'win';

    // Dynamic classes based on animation stage
    const getAnimationClasses = () => {
        switch (stage) {
            case 'entering':
                return 'scale-50 opacity-0';
            case 'visible':
                return 'scale-100 opacity-100';
            case 'exiting':
                return 'scale-110 opacity-0 -translate-y-8';
            default:
                return 'scale-50 opacity-0';
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
            {/* Subtle backdrop pulse */}
            <div
                className={`absolute inset-0 transition-opacity duration-300 ${stage === 'visible' ? 'opacity-100' : 'opacity-0'
                    }`}
                style={{
                    background: isWin
                        ? 'radial-gradient(circle at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%)'
                        : 'radial-gradient(circle at center, rgba(244, 63, 94, 0.15) 0%, transparent 70%)'
                }}
            />

            {/* Animated text */}
            <div
                className={`
                    text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-wider
                    transition-all duration-300 ease-out
                    ${getAnimationClasses()}
                    ${isWin ? 'text-emerald-400' : 'text-rose-400'}
                `}
                style={{
                    textShadow: isWin
                        ? '0 0 40px rgba(16, 185, 129, 0.6), 0 0 80px rgba(16, 185, 129, 0.3)'
                        : '0 0 40px rgba(244, 63, 94, 0.6), 0 0 80px rgba(244, 63, 94, 0.3)',
                }}
            >
                {text}
            </div>
        </div>
    );
}
