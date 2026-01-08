"use client";

import { Trophy, X, RotateCcw, BarChart3 } from "lucide-react";

interface GameResultOverlayProps {
    /** Whether the overlay is visible */
    open: boolean;
    /** Outcome: 'win' or 'lose' */
    outcome: 'win' | 'lose';
    /** Main title (e.g., "Gewonnen!", "Game Over") */
    title: string;
    /** Optional subtitle (e.g., "Du hast den Code in 4 Versuchen gelöst") */
    subtitle?: string;
    /** Game-specific content to display (score, stats, secret code, etc.) */
    children?: React.ReactNode;
    /** Callback for Play Again button */
    onPlayAgain: () => void;
    /** Callback for Stats button */
    onOpenStats: () => void;
    /** Custom Play Again label */
    playAgainLabel?: string;
}

/**
 * Global full-screen overlay for game win/lose states.
 * Prevents layout shifts by covering the entire game area.
 */
export default function GameResultOverlay({
    open,
    outcome,
    title,
    subtitle,
    children,
    onPlayAgain,
    onOpenStats,
    playAgainLabel = "Nochmal spielen",
}: GameResultOverlayProps) {
    if (!open) return null;

    const isWin = outcome === 'win';
    const Icon = isWin ? Trophy : X;
    const iconColor = isWin ? 'text-emerald-400' : 'text-rose-400';
    const titleColor = isWin ? 'text-emerald-400' : 'text-rose-400';
    const borderColor = isWin ? 'border-emerald-500/40' : 'border-rose-500/40';
    const buttonGradient = isWin
        ? 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20'
        : 'from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-500/20';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop - lighter to show context */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

            {/* Card - Premium Glassmorphism */}
            <div className={`relative z-10 w-full max-w-sm rounded-2xl border ${borderColor} bg-zinc-950/30 backdrop-blur-2xl p-6 shadow-2xl ring-1 ring-white/10`}>
                {/* Icon */}
                <div className="flex justify-center mb-3">
                    <div className={`rounded-full p-3 ${isWin ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                        <Icon className={`w-8 h-8 ${iconColor}`} />
                    </div>
                </div>

                {/* Title */}
                <h2 className={`text-2xl font-bold text-center ${titleColor} mb-1`}>
                    {title}
                </h2>

                {/* Subtitle */}
                {subtitle && (
                    <p className="text-sm text-center text-[color:var(--muted)] mb-4">
                        {subtitle}
                    </p>
                )}

                {/* Game-specific content */}
                {children && (
                    <div className="mb-6">
                        {children}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={onPlayAgain}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r ${buttonGradient} rounded-xl font-semibold text-sm text-white transition shadow-lg`}
                    >
                        <RotateCcw size={16} />
                        {playAgainLabel}
                    </button>
                    <button
                        onClick={onOpenStats}
                        className="px-4 py-3 bg-[color:var(--surface)] hover:bg-[color:var(--surface2)] border border-[color:var(--border)] rounded-xl font-semibold text-sm text-[color:var(--fg)] transition flex items-center gap-2"
                    >
                        <BarChart3 size={16} />
                        Stats
                    </button>
                </div>
            </div>
        </div>
    );
}
