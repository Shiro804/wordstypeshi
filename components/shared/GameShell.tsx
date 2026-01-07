"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { RotateCcw, Settings as SettingsIcon, BarChart3, Trophy, Menu, HelpCircle } from "lucide-react";
import HowToPlay from "@/components/games/common/HowToPlay";
import DuckBackground from "@/components/shared/DuckBackground";
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
    const difficultyColors: Record<Difficulty, string> = {
        easy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        medium: "bg-orange-500/15 text-orange-300 border-orange-500/30",
        hard: "bg-rose-500/15 text-rose-300 border-rose-500/30",
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
                    {difficulty}
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
                        <span className="capitalize">{d}</span>
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
    onOpenLeaderboard,
    onOpenSettings,
    onOpenHowToPlay,
}: {
    onNewGame: () => void;
    onOpenStats?: () => void;
    onOpenLeaderboard?: () => void;
    onOpenSettings: () => void;
    onOpenHowToPlay: () => void;
}) {
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
                    New Game
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {onOpenStats && (
                    <DropdownMenuItem onClick={onOpenStats} className="flex items-center gap-2">
                        <BarChart3 size={14} />
                        Stats
                    </DropdownMenuItem>
                )}

                {onOpenLeaderboard && (
                    <DropdownMenuItem onClick={onOpenLeaderboard} className="flex items-center gap-2">
                        <Trophy size={14} />
                        Leaderboard
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={onOpenHowToPlay} className="flex items-center gap-2">
                    <HelpCircle size={14} />
                    How to Play
                </DropdownMenuItem>

                <DropdownMenuItem onClick={onOpenSettings} className="flex items-center gap-2">
                    <SettingsIcon size={14} />
                    Settings
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
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs font-semibold text-[color:var(--fg)]">
            <span className="tabular-nums inline-block w-[2rem] text-right">{text}</span>
        </div>
    );
}

// ============================================================================
// GameShell Component
// ============================================================================

export default function GameShell({
    gameId,
    gameName,
    onNewGame,
    difficulty,
    onDifficultyChange,
    timerText,
    onOpenStats,
    onOpenLeaderboard,
    onOpenSettings,
    actionsSlot,
    hintSlot,
    fullHeight = false,
    children,
}: GameShellProps) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [howToPlayOpen, setHowToPlayOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Use preferences
    const { preferences, updatePreferences } = useGamePreferences(gameId);

    // Get the background title based on gameId
    const getBackgroundTitle = () => {
        switch (gameId) {
            case 'wordle': return 'BatasWordle';
            case 'mastermind': return 'BatasMastermind';
            case 'wordsearch': return 'BatasSearch';
            default: return 'BataGames';
        }
    };

    // Ensure client-side only rendering for background to avoid hydration mismatch
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const containerClasses = fullHeight
        ? "relative h-[100dvh] w-full max-w-[100vw] overflow-hidden text-[color:var(--fg)]"
        : "min-h-screen w-full overflow-x-hidden text-[color:var(--fg)]";

    const gridStyle = fullHeight
        ? { display: 'grid', gridTemplateRows: 'auto 1fr auto', paddingTop: 'env(safe-area-inset-top)' }
        : undefined;

    return (
        <div className={containerClasses} style={gridStyle}>
            {/* Background & Loading State */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                {/* Visual Background - only render client-side to avoid hydration mismatch */}
                {isMounted && (
                    <>
                        {preferences.backgroundImage ? (
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
                                style={{
                                    backgroundColor: preferences.backgroundColor || "#09090b",
                                    backgroundImage: `radial-gradient(1200px 700px at 20% 10%, rgba(255,255,255,0.08), transparent 55%), radial-gradient(900px 600px at 80% 20%, rgba(16,185,129,0.10), transparent 60%), url(${preferences.backgroundImage})`
                                }}
                            />
                        ) : (
                            <DuckBackground
                                title={getBackgroundTitle()}
                                bgColor={preferences.backgroundColor}
                                duckColor={preferences.duckColor}
                                duckBellyColor={preferences.duckBellyColor}
                                beakColor={preferences.beakColor}
                                eyeColor={preferences.eyeColor}
                            />
                        )}
                        {/* Overlay to ensure text readability */}
                        <div className="absolute inset-0 bg-black/35" />
                    </>
                )}

                {/* Background base color (always visible) */}
                <div className="absolute inset-0 bg-[#09090b] -z-10" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between gap-2 border-b border-[color:var(--border)] bg-[color:var(--bg)]/90 px-3 py-2 backdrop-blur min-w-0">
                {/* Left: Hub link + Timer + Hint + Difficulty */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <Link
                        href="/"
                        className="text-sm font-semibold tracking-tight text-[color:var(--fg)] hover:text-emerald-400 transition"
                    >
                        ←
                    </Link>

                    {/* Timer */}
                    {timerText && <TimerBadge text={timerText} />}

                    {/* Hint slot (for Wordle) */}
                    {hintSlot}

                    {/* Difficulty selector */}
                    {difficulty && onDifficultyChange && (
                        <DifficultyBadge
                            difficulty={difficulty}
                            onDifficultyChange={onDifficultyChange}
                        />
                    )}
                </div>

                {/* Right: Actions + Menu */}
                <div className="flex items-center gap-2">
                    {actionsSlot}
                    <GameMenu
                        onNewGame={onNewGame}
                        onOpenStats={onOpenStats}
                        onOpenLeaderboard={onOpenLeaderboard}
                        onOpenSettings={onOpenSettings ?? (() => setSettingsOpen(true))}
                        onOpenHowToPlay={() => setHowToPlayOpen(true)}
                    />
                </div>
            </header>

            {/* Game Content */}
            <main className={fullHeight ? "relative z-10 min-w-0 overflow-hidden" : ""}>
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
                gameId={gameId as "wordle" | "mastermind" | "wordsearch"}
                isOpen={howToPlayOpen}
                onClose={() => setHowToPlayOpen(false)}
            />
        </div>
    );
}
