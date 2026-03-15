"use client";

import Link from "next/link";
import { useState } from "react";
import { RotateCcw, Settings as SettingsIcon, BarChart3, Trophy, Menu, HelpCircle, Book } from "lucide-react";
import HowToPlay from "@/components/games/common/HowToPlay";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Difficulty } from "@/lib/difficulty";
import Settings from "@/components/games/common/Settings";
import { useGamePreferences } from "@/lib/hooks/useGamePreferences";
import { useLanguage } from "@/lib/i18n";

// ============================================================================
// Types
// ============================================================================

interface GameShellProps {
    /** Unique game identifier */
    gameId: string;
    /** Display name for the game */
    gameName: string;
    /** Callback for starting a new game */
    onNewGame: () => void;
    /** Optional: Current difficulty (only show selector if provided) */
    difficulty?: Difficulty;
    /** Optional: Callback for difficulty change */
    onDifficultyChange?: (d: Difficulty) => void;
    /** Optional: Timer text (only show if provided) */
    timerText?: string;
    /** Optional: Stats callback */
    onOpenStats?: () => void;
    /** Optional: Word History callback (Wordle-specific) */
    onOpenWordHistory?: () => void;
    /** Optional: Leaderboard callback */
    onOpenLeaderboard?: () => void;
    /** Optional: Settings callback (overrides internal handling) */
    onOpenSettings?: () => void;
    /** Optional: Additional actions slot */
    actionsSlot?: React.ReactNode;
    /** Optional: Hint component slot (displayed between timer and difficulty) */
    hintSlot?: React.ReactNode;
    /** Optional: Use full viewport height with grid layout (for games with keyboard) */
    fullHeight?: boolean;
    /** Content */
    children: React.ReactNode;
}

// ============================================================================
// Difficulty Badge
// ============================================================================

function DifficultyBadge({
    difficulty,
    onDifficultyChange
}: {
    difficulty: Difficulty;
    onDifficultyChange: (d: Difficulty) => void;
}) {
    const { t } = useLanguage();

    const difficultyColors: Record<Difficulty, string> = {
        easy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        medium: "bg-orange-500/15 text-orange-300 border-orange-500/30",
        hard: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    };

    const difficultyLabels: Record<Difficulty, string> = {
        easy: t.settings.easy,
        medium: t.settings.medium,
        hard: t.settings.hard,
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={
                        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide transition cursor-pointer hover:opacity-80 " +
                        difficultyColors[difficulty]
                    }
                >
                    {difficultyLabels[difficulty]}
                    <span className="opacity-60">▾</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-28">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                    <DropdownMenuItem
                        key={d}
                        onClick={() => onDifficultyChange(d)}
                        className="flex items-center gap-2"
                    >
                        <span className={`inline-block w-2 h-2 rounded-full ${d === "easy" ? "bg-emerald-400" :
                            d === "medium" ? "bg-orange-400" : "bg-rose-400"
                            }`} />
                        <span>{difficultyLabels[d]}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ============================================================================
// Game Menu
// ============================================================================

function GameMenu({
    onNewGame,
    onOpenStats,
    onOpenWordHistory,
    onOpenLeaderboard,
    onOpenSettings,
    onOpenHowToPlay,
}: {
    onNewGame: () => void;
    onOpenStats?: () => void;
    onOpenWordHistory?: () => void;
    onOpenLeaderboard?: () => void;
    onOpenSettings: () => void;
    onOpenHowToPlay: () => void;
}) {
    const { t, language } = useLanguage();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                    aria-label="Menu"
                >
                    <Menu size={16} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={onNewGame} className="flex items-center gap-2">
                    <RotateCcw size={14} />
                    {t.common.newGame}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {onOpenStats && (
                    <DropdownMenuItem onClick={onOpenStats} className="flex items-center gap-2">
                        <BarChart3 size={14} />
                        {t.common.statistics}
                    </DropdownMenuItem>
                )}

                {onOpenWordHistory && (
                    <DropdownMenuItem onClick={onOpenWordHistory} className="flex items-center gap-2">
                        <Book size={14} />
                        {language === 'de' ? 'Wörter-Verlauf' : 'Word History'}
                    </DropdownMenuItem>
                )}

                {onOpenLeaderboard && (
                    <DropdownMenuItem onClick={onOpenLeaderboard} className="flex items-center gap-2">
                        <Trophy size={14} />
                        {t.common.leaderboard}
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={onOpenHowToPlay} className="flex items-center gap-2">
                    <HelpCircle size={14} />
                    {language === 'de' ? 'Anleitung' : 'How to Play'}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={onOpenSettings} className="flex items-center gap-2">
                    <SettingsIcon size={14} />
                    {t.common.settings}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ============================================================================
// Timer Badge
// ============================================================================

function TimerBadge({ text }: { text: string }) {
    return (
        <div className="inline-flex items-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--fg)]">
            <span className="tabular-nums">{text}</span>
        </div>
    );
}

// ============================================================================
// GameShell Component
// ============================================================================

export default function GameShell({
    gameId,
    gameName: _gameName,
    onNewGame,
    difficulty,
    onDifficultyChange,
    timerText,
    onOpenStats,
    onOpenWordHistory,
    onOpenLeaderboard,
    onOpenSettings,
    actionsSlot,
    hintSlot,
    fullHeight = false,
    children,
}: GameShellProps) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [howToPlayOpen, setHowToPlayOpen] = useState(false);

    // Use preferences
    const { preferences, updatePreferences } = useGamePreferences(gameId);

    const containerClasses = fullHeight
        ? "relative h-[100dvh] w-full max-w-[100vw] overflow-y-auto overflow-x-hidden text-[color:var(--fg)]"
        : "min-h-screen w-full overflow-x-hidden text-[color:var(--fg)]";

    // Always apply safe-area-inset-top for PWA mode on iOS (notch/Dynamic Island)
    const gridStyle = fullHeight
        ? { display: 'grid', gridTemplateRows: 'auto 1fr auto', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }
        : { paddingTop: 'env(safe-area-inset-top)' };

    return (
        <div className={containerClasses} style={gridStyle}>
            {/* Background - solid color from preferences */}
            <div
                className="fixed inset-0 -z-10 transition-colors duration-500"
                style={{ backgroundColor: preferences.backgroundColor || '#09090b' }}
            />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between gap-1 border-b border-[color:var(--border)] bg-[color:var(--bg)]/90 px-2 py-1.5 backdrop-blur min-w-0">
                {/* Left: Back + Timer + Hint */}
                <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                    <Link
                        href="/"
                        className="text-sm font-semibold text-[color:var(--fg)] hover:text-emerald-400 transition shrink-0 px-1"
                    >
                        ←
                    </Link>

                    {/* Timer */}
                    {timerText && <TimerBadge text={timerText} />}

                    {/* Hint slot (for Wordle) */}
                    {hintSlot}
                </div>

                {/* Center: BATAS 🦆 WORD layout */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                    {/* First part: BATAS */}
                    <span className="text-[8px] font-black tracking-wider text-[color:var(--fg)] uppercase">BATAS</span>

                    {/* Animated Mini Duck - uses smaller bob animation + smooth color transitions */}
                    <svg
                        className="w-5 h-5 shrink-0 animate-duck-bob-sm duck-transition"
                        viewBox="0 0 320 320"
                        aria-hidden="true"
                    >
                        {/* Sparkle */}
                        <g className="animate-duck-pop origin-center">
                            <path d="M252 62c6 10 6 22 0 32c-10 6-22 6-32 0c-6-10-6-22 0-32c10-6 22-6 32 0z" fill="rgba(255,255,255,0.75)" />
                        </g>
                        {/* Body */}
                        <ellipse cx="160" cy="192" rx="118" ry="88" fill={preferences.duckColor || "#FFD86B"} />
                        {/* Belly */}
                        <ellipse cx="160" cy="210" rx="68" ry="52" fill={preferences.duckBellyColor || "#FFF3C9"} />
                        {/* Head */}
                        <circle cx="160" cy="120" r="72" fill={preferences.duckColor || "#FFD86B"} />
                        {/* Wing */}
                        <g className="animate-duck-flap origin-[25%_55%]">
                            <ellipse cx="86" cy="198" rx="44" ry="34" fill="rgba(0,0,0,0.06)" />
                            <ellipse cx="92" cy="190" rx="48" ry="36" fill={preferences.duckColor || "#FFD86B"} />
                            <ellipse cx="105" cy="194" rx="28" ry="22" fill={preferences.duckBellyColor || "#FFF3C9"} />
                        </g>
                        {/* Beak */}
                        <path d="M160 140 c26 0 44 10 44 24 c0 14-18 24-44 24 c-26 0-44-10-44-24 c0-14 18-24 44-24z" fill={preferences.beakColor || "#FF8B4A"} />
                        {/* Cheeks */}
                        <circle cx="120" cy="158" r="10" fill="rgba(255,120,150,0.18)" />
                        <circle cx="200" cy="158" r="10" fill="rgba(255,120,150,0.18)" />
                        {/* Left Eye */}
                        <g className="animate-duck-blink origin-center">
                            <circle cx="136" cy="118" r="10" fill={preferences.eyeColor || "#1E2430"} />
                            <circle cx="132" cy="114" r="3.2" fill="rgba(255,255,255,0.9)" />
                        </g>
                        {/* Right Eye */}
                        <g className="animate-duck-blink origin-center">
                            <circle cx="184" cy="118" r="10" fill={preferences.eyeColor || "#1E2430"} />
                            <circle cx="180" cy="114" r="3.2" fill="rgba(255,255,255,0.9)" />
                        </g>
                    </svg>

                    {/* Second part: game-specific suffix */}
                    <span className="text-[8px] font-black tracking-wider text-[color:var(--fg)] uppercase">
                        {gameId === 'wordle' && 'WORDLE'}
                        {gameId === 'mastermind' && 'MIND'}
                        {gameId === 'wordsearch' && 'SEARCH'}
                        {gameId === 'batasblast' && 'BLAST'}
                        {gameId === 'batascolors' && 'COLORS'}
                        {gameId === 'bataspairs' && 'PAIRS'}
                        {gameId === 'batasmine' && 'MINE'}
                        {gameId === 'batasflow' && 'FLOW'}
                    </span>
                </div>

                {/* Right: Difficulty + Actions + Menu */}
                <div className="flex items-center gap-1 shrink-0">
                    {/* Difficulty selector */}
                    {difficulty && onDifficultyChange && (
                        <DifficultyBadge
                            difficulty={difficulty}
                            onDifficultyChange={onDifficultyChange}
                        />
                    )}
                    {actionsSlot}
                    <GameMenu
                        onNewGame={onNewGame}
                        onOpenStats={onOpenStats}
                        onOpenWordHistory={onOpenWordHistory}
                        onOpenLeaderboard={onOpenLeaderboard}
                        onOpenSettings={onOpenSettings ?? (() => setSettingsOpen(true))}
                        onOpenHowToPlay={() => setHowToPlayOpen(true)}
                    />
                </div>
            </header>

            {/* Game Content */}
            <main className={fullHeight ? "relative z-10 min-w-0 overflow-auto" : ""}>
                {children}
            </main>

            {/* Settings Modal (shared across all games) */}
            {settingsOpen && (
                <Settings
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    gameId={gameId}
                    difficulty={difficulty}
                    onDifficultyChange={onDifficultyChange}
                    preferences={preferences}
                    onPreferencesChange={updatePreferences}
                />
            )}

            {/* How to Play Modal (shared across all games) */}
            <HowToPlay
                gameId={gameId as "wordle" | "mastermind" | "wordsearch" | "batasblast" | "batascolors" | "bataspairs" | "batasmine" | "batasflow"}
                isOpen={howToPlayOpen}
                onClose={() => setHowToPlayOpen(false)}
            />
        </div>
    );
}
