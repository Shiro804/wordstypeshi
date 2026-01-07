"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { RotateCcw, Settings as SettingsIcon, BarChart3, Trophy, Menu } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Difficulty } from "@/lib/difficulty";
import Settings from "@/components/Settings";
import { getCustomBackground } from "@/lib/background-storage";

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
    /** Optional: Callback when background changes (from Settings) */
    onBackgroundChange?: (bg: string | null) => void;
    /** Optional: Is loading preferences? */
    isLoading?: boolean;
    /** Game content */
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
}: {
    onNewGame: () => void;
    onOpenStats?: () => void;
    onOpenLeaderboard?: () => void;
    onOpenSettings: () => void;
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
    onBackgroundChange,
    customBackground: externalBackground,
    isLoading = false,
    children,
}: GameShellProps & { customBackground?: string | null }) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [internalBackground, setInternalBackground] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Get the correct background URL based on gameId
    const getBackgroundUrl = () => {
        switch (gameId) {
            case 'wordle': return '/BatasWordle.html';
            case 'mastermind': return '/BatasMastermind.html';
            case 'wordsearch': return '/BatasSearch.html';
            default: return '/BatasWordle.html';
        }
    };

    // Ensure client-side only rendering for background to avoid hydration mismatch
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Use external background if provided, otherwise internal
    const customBackground = externalBackground !== undefined ? externalBackground : internalBackground;

    // Load background on mount if not provided externally (or to init internal)
    useEffect(() => {
        if (externalBackground === undefined) {
            setInternalBackground(getCustomBackground(gameId));
        }
    }, [gameId, externalBackground]);

    const handleBackgroundChange = (bg: string | null) => {
        if (externalBackground === undefined) {
            setInternalBackground(bg);
        }
        onBackgroundChange?.(bg);
    };

    const containerClasses = fullHeight
        ? "relative h-[100dvh] w-full max-w-[100vw] overflow-hidden text-[color:var(--fg)]"
        : "min-h-screen w-full overflow-x-hidden text-[color:var(--fg)]";

    const gridStyle = fullHeight
        ? { display: 'grid', gridTemplateRows: 'auto 1fr auto', paddingTop: 'env(safe-area-inset-top)' }
        : undefined;

    return (
        <div className={containerClasses} style={gridStyle}>
            {/* Background & Loading State */}
            {/* Background & Loading State */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                {/* Visual Background - only render client-side to avoid hydration mismatch */}
                {isMounted && !isLoading && (
                    <>
                        {customBackground ? (
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
                                style={{
                                    backgroundColor: "#09090b",
                                    backgroundImage: `radial-gradient(1200px 700px at 20% 10%, rgba(255,255,255,0.08), transparent 55%), radial-gradient(900px 600px at 80% 20%, rgba(16,185,129,0.10), transparent 60%), url(${customBackground})`
                                }}
                            />
                        ) : (
                            <iframe
                                src={getBackgroundUrl()}
                                className="absolute inset-0 border-none pointer-events-none opacity-80 transition-opacity duration-500"
                                style={{ width: '100%', height: '100%', overflow: 'hidden' }}
                                scrolling="no"
                                title="Background"
                            />
                        )}
                        {/* Overlay to ensure text readability */}
                        <div className="absolute inset-0 bg-black/35" />
                    </>
                )}

                {/* Background base color (always visible) */}
                <div className="absolute inset-0 bg-[#09090b] -z-10" />

                {/* Background Loader (visible only when isLoading is true) */}
                <div
                    className={`absolute inset-0 flex items-center justify-center bg-[#09090b] transition-opacity duration-300 ${isLoading ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                >
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500/30 border-t-emerald-500" />
                </div>
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between gap-2 border-b border-[color:var(--border)] bg-[color:var(--bg)]/90 px-3 py-2 backdrop-blur min-w-0">
                {/* Left: Hub link + Timer + Hint + Difficulty */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <Link
                        href="/"
                        className="text-sm font-semibold tracking-tight text-[color:var(--fg)] hover:text-emerald-400 transition"
                    >
                        ← Hub
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

                {/* Center: Game name */}
                <h1 className="text-sm font-semibold tracking-tight text-[color:var(--fg)]">
                    {gameName}
                </h1>

                {/* Right: Actions + Menu */}
                <div className="flex items-center gap-2">
                    {actionsSlot}
                    <GameMenu
                        onNewGame={onNewGame}
                        onOpenStats={onOpenStats}
                        onOpenLeaderboard={onOpenLeaderboard}
                        onOpenSettings={onOpenSettings ?? (() => setSettingsOpen(true))}
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
                    onBackgroundChange={handleBackgroundChange}
                />
            )}
        </div>
    );
}
