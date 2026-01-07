"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Trophy, X, CheckCircle2, RotateCcw } from "lucide-react";
import GameShell from "@/components/shared/GameShell";
import {
    mastermindEngine,
    getModeParams,
    type MastermindState,
    type MastermindAction
} from "@/lib/games/mastermind/engine";
import { mastermindUIAdapter, type MastermindRenderModel } from "@/lib/games/mastermind/ui-adapter";
import { generateDailySeed } from "@/lib/games/sdk";
import { loadActiveGame, saveActiveGame } from "@/lib/games/active-game-storage";
import { loadDifficulty, saveDifficulty } from "@/lib/settings-storage";
import type { Difficulty } from "@/lib/difficulty";
import { getCurrentUserId, upsertRemoteGameStats, syncGameStats, loadLocalStats, saveLocalStats } from "@/lib/game-stats-sync";
import Leaderboard from "@/components/Leaderboard";
import Settings from "@/components/Settings";
import StatsModal from "@/components/shared/StatsModal";
import Modal from "@/components/Modal";
import { type Stats, applyGameResult, formatDuration } from "@/lib/storage";
import { getCustomBackground } from "@/lib/background-storage";
import { useGameBackground } from "@/lib/hooks/useGameBackground";

// ============================================================================
// Constants & Mapping
// ============================================================================

const GAME_ID = "mastermind";
type MastermindModeId = keyof typeof import("@/lib/games/mastermind/ruleset").MASTERMIND_MODES;

const DIFFICULTY_TO_MODE: Record<Difficulty, MastermindModeId> = {
    easy: 'classic_4x6',
    medium: 'classic_4x8',
    hard: 'hard_5x8',
};

// ============================================================================
// Sub-components
// ============================================================================

function ColorPeg({
    color,
    colorHex,
    size = "md",
    onClick,
    selected = false,
    empty = false,
}: {
    color: number;
    colorHex: string;
    size?: "sm" | "md" | "lg";
    onClick?: () => void;
    selected?: boolean;
    empty?: boolean;
}) {
    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-10 h-10",
        lg: "w-12 h-12",
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className={`
        ${sizeClasses[size]}
        rounded-full
        border-2
        transition-all
        ${selected ? "ring-2 ring-[color:var(--fg)] ring-offset-2 ring-offset-[color:var(--bg)] scale-110" : ""}
        ${onClick ? "cursor-pointer hover:scale-105" : "cursor-default"}
        ${empty ? "bg-[color:var(--surface)] border-[color:var(--border)]" : "border-white/20"}
`}
            style={{ backgroundColor: empty ? undefined : colorHex }}
            aria-label={empty ? "Empty slot" : `Color ${color + 1} `}
        />
    );
}

function FeedbackPegs({ black, white, total }: { black: number; white: number; total: number }) {
    const pegs = [
        ...Array(black).fill("black"),
        ...Array(white).fill("white"),
        ...Array(total - black - white).fill("empty"),
    ];

    return (
        <div className="grid grid-cols-2 gap-1 w-12">
            {pegs.map((type, i) => (
                <div
                    key={i}
                    className={`
            w-4 h-4 rounded-full
            ${type === "black" ? "bg-zinc-900 border border-white/30" : ""}
            ${type === "white" ? "bg-white border border-zinc-400" : ""}
            ${type === "empty" ? "bg-[color:var(--surface)]" : ""}
`}
                />
            ))}
        </div>
    );
}

function AttemptRow({
    guess,
    feedback,
    colors,
    codeLength,
    isActive = false,
    currentInput = [],
    onSlotClick,
}: {
    guess: number[];
    feedback?: { black: number; white: number };
    colors: readonly string[];
    codeLength: number;
    isActive?: boolean;
    currentInput?: number[];
    onSlotClick?: (index: number) => void;
}) {
    const displayGuess = isActive ? currentInput : guess;

    return (
        <div className="flex items-center gap-4 p-2 rounded-lg bg-[color:var(--surface)]">
            <div className="flex gap-2">
                {Array.from({ length: codeLength }).map((_, i) => {
                    const colorIndex = displayGuess[i];
                    const isEmpty = colorIndex === undefined || colorIndex === -1;

                    return (
                        <ColorPeg
                            key={i}
                            color={isEmpty ? -1 : colorIndex}
                            colorHex={isEmpty ? "" : colors[colorIndex]}
                            empty={isEmpty}
                            onClick={isActive && onSlotClick ? () => onSlotClick(i) : undefined}
                            size="md"
                        />
                    );
                })}
            </div>

            {feedback && (
                <FeedbackPegs black={feedback.black} white={feedback.white} total={codeLength} />
            )}

            {isActive && !feedback && (
                <div className="w-12 h-8 flex items-center justify-center text-[color:var(--muted)]">
                    ?
                </div>
            )}
        </div>
    );
}

function ColorPicker({
    colors,
    selectedColor,
    onColorSelect,
}: {
    colors: readonly string[];
    selectedColor: number | null;
    onColorSelect: (color: number) => void;
}) {
    return (
        <div className="flex gap-3 justify-center flex-wrap p-4 bg-[color:var(--surface)] rounded-xl">
            {colors.map((hex, i) => (
                <ColorPeg
                    key={i}
                    color={i}
                    colorHex={hex}
                    size="lg"
                    onClick={() => onColorSelect(i)}
                    selected={selectedColor === i}
                />
            ))}
        </div>
    );
}

// ============================================================================
// Main Game Component
// ============================================================================

interface MastermindGameProps {
    initialMode?: string;
}



export default function MastermindGame({ initialMode }: MastermindGameProps) {
    // State
    const [difficulty, setDifficulty] = useState<Difficulty>(() => loadDifficulty());
    const [gameState, setGameState] = useState<MastermindState | null>(null);
    const [currentInput, setCurrentInput] = useState<number[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [selectedColor, setSelectedColor] = useState<number | null>(null);

    // Confirmation State
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);
    const [confirmDifficultyOpen, setConfirmDifficultyOpen] = useState(false);
    const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);

    // UI State
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [stats, setStats] = useState<Stats>(() => loadLocalStats(GAME_ID, difficulty));
    const [userId, setUserId] = useState<string | null>(null);
    const { background: customBackground, setBackground: setCustomBackground, isLoading: backgroundLoading } = useGameBackground(GAME_ID);

    // Timer state
    const [nowMs, setNowMs] = useState<number>(() => Date.now());

    // Derived
    const mode = (initialMode as MastermindModeId) || DIFFICULTY_TO_MODE[difficulty];
    const params = useMemo(() => {
        return getModeParams(mode) ?? getModeParams("classic_4x6");
    }, [mode]);

    // Check if game is in progress (first guess must be made)
    const isInProgress = useMemo(() => {
        return gameState && !mastermindEngine.isTerminal(gameState) && gameState.attempts.length > 0;
    }, [gameState]);

    // Initial Load
    useEffect(() => {
        getCurrentUserId().then(uid => setUserId(uid));
    }, []);

    // Load active game or init new one when params change
    const hasInitialized = useRef(false);
    useEffect(() => {
        const active = loadActiveGame<MastermindState>(GAME_ID, userId);
        const paramsMatch = active && active.config.codeLength === params.codeLength && active.config.numColors === params.numColors;

        if (paramsMatch && !mastermindEngine.isTerminal(active)) {
            // Restore existing game with matching params
            setGameState(active);
            setCurrentInput(Array(params.codeLength).fill(-1));
            setSelectedSlot(0);
        } else {
            // Start new game (params changed or no valid saved game)
            const newSeed = mode === "daily"
                ? generateDailySeed("mastermind", mode, new Date())
                : `${Date.now()} -${Math.random().toString(36).slice(2)} `;
            const state = mastermindEngine.init(newSeed, params);
            setGameState(state);
            setCurrentInput(Array(params.codeLength).fill(-1));
            setSelectedSlot(0);
            setSelectedColor(null);
            saveActiveGame(GAME_ID, state, userId);
        }
        hasInitialized.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, params, mode]);

    // Save active game
    useEffect(() => {
        if (gameState) {
            saveActiveGame(GAME_ID, mastermindEngine.isTerminal(gameState) ? null : gameState, userId);
        }
    }, [gameState, userId]);

    // Sync stats
    useEffect(() => {
        const local = loadLocalStats(GAME_ID, difficulty);
        setStats(local);

        if (userId) {
            syncGameStats(userId, GAME_ID, difficulty, local).then(synced => {
                setStats(synced);
                saveLocalStats(GAME_ID, difficulty, synced);
            });
        }
    }, [userId, difficulty]);

    // Timer tick
    useEffect(() => {
        if (!gameState || mastermindEngine.isTerminal(gameState)) return;
        const interval = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    // Timer text
    const timerText = useMemo(() => {
        if (!gameState) return "0:00";
        const elapsed = Math.max(0, Math.floor((nowMs - gameState.startedAtMs) / 1000));
        return formatDuration(elapsed);
    }, [gameState, nowMs]);

    const initGame = useCallback(() => {
        const newSeed = mode === "daily"
            ? generateDailySeed("mastermind", mode, new Date())
            : `${Date.now()} -${Math.random().toString(36).slice(2)} `;

        const state = mastermindEngine.init(newSeed, params);
        setGameState(state);
        setCurrentInput(Array(params.codeLength).fill(-1));
        setSelectedSlot(0);
        setSelectedColor(null);
        saveActiveGame(GAME_ID, state, userId);
    }, [mode, params, userId]);

    const forfeitCurrentGame = useCallback(() => {
        if (!gameState) return;
        const durationSec = Math.max(0, (Date.now() - gameState.startedAtMs) / 1000);
        const newStats = applyGameResult(stats, { outcome: "lose", durationSec });
        setStats(newStats);
        saveLocalStats(GAME_ID, difficulty, newStats);
        if (userId) {
            upsertRemoteGameStats(userId, GAME_ID, difficulty, newStats);
        }
        saveActiveGame(GAME_ID, null, userId); // Clear active game
    }, [gameState, stats, difficulty, userId]);

    const applyDifficultyChange = useCallback((d: Difficulty) => {
        setDifficulty(d);
        saveDifficulty(d);
        setSettingsOpen(false);
    }, []);

    const requestDifficultyChange = useCallback((d: Difficulty) => {
        if (d === difficulty) return;
        if (isInProgress) {
            setPendingDifficulty(d);
            setConfirmDifficultyOpen(true);
            return;
        }
        applyDifficultyChange(d);
    }, [difficulty, isInProgress, applyDifficultyChange]);

    const forfeitCurrentGameAndReset = useCallback(() => {
        forfeitCurrentGame();
        initGame();
        setConfirmResetOpen(false);
    }, [forfeitCurrentGame, initGame]);

    // Check request reset
    const requestReset = useCallback(() => {
        if (isInProgress) {
            setConfirmResetOpen(true);
            return;
        }
        initGame();
    }, [isInProgress, initGame]);

    const handleColorSelect = useCallback((color: number) => {
        setSelectedColor(color);
        if (selectedSlot !== null) {
            setCurrentInput(prev => {
                const next = [...prev];
                next[selectedSlot] = color;
                return next;
            });
            setSelectedSlot(prev => {
                if (prev === null) return null;
                const next = prev + 1;
                if (next >= params.codeLength) return null;
                return next;
            });
        }
    }, [selectedSlot, params.codeLength]);

    const isGuessComplete = useMemo(() => {
        return currentInput.every(c => c !== -1);
    }, [currentInput]);

    const handleSlotClick = useCallback((index: number) => {
        if (currentInput[index] !== -1) {
            setCurrentInput(prev => {
                const next = [...prev];
                next[index] = -1;
                return next;
            });
        }
        setSelectedSlot(index);
    }, [currentInput]);

    const renderModel = useMemo((): MastermindRenderModel | null => {
        if (!gameState) return null;
        return mastermindUIAdapter.toRenderModel(gameState) as MastermindRenderModel;
    }, [gameState]);

    const handleSubmit = useCallback(() => {
        if (!gameState || !isGuessComplete) return;

        const action: MastermindAction = {
            type: "submit_guess",
            guess: currentInput,
        };

        const result = mastermindEngine.applyAction(gameState, action);
        if (!result.invalidReason) {
            setGameState(result.state);
            setCurrentInput(Array(params.codeLength).fill(-1));
            setSelectedSlot(0);

            // Check completion
            if (mastermindEngine.isTerminal(result.state)) {
                const isWin = result.state.status === "won";
                const durationSec = (result.state.endedAtMs! - result.state.startedAtMs) / 1000;

                // Update stats
                const newStats = applyGameResult(stats, isWin
                    ? { outcome: "win", guessesUsed: result.state.attempts.length, durationSec }
                    : { outcome: "lose", durationSec }
                );

                setStats(newStats);
                saveLocalStats(GAME_ID, difficulty, newStats);

                if (userId) {
                    upsertRemoteGameStats(userId, GAME_ID, difficulty, newStats);
                    // Also generic played game tracking if we wanted
                }
            }
        }
    }, [gameState, currentInput, isGuessComplete, params.codeLength, stats, difficulty, userId]);

    const handleClear = useCallback(() => {
        setCurrentInput(Array(params.codeLength).fill(-1));
        setSelectedSlot(0);
    }, [params.codeLength]);

    if (!renderModel) {
        return (
            <GameShell gameId="mastermind" gameName="Mastermind" onNewGame={initGame}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse text-[color:var(--fg)]">Loading...</div>
                </div>
            </GameShell>
        );
    }



    const { data } = renderModel;

    return (
        <GameShell
            gameId={GAME_ID}
            gameName="Mastermind"
            isLoading={backgroundLoading}
            onNewGame={requestReset}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenStats={() => setStatsOpen(true)}
            difficulty={difficulty}
            onDifficultyChange={requestDifficultyChange}
            timerText={timerText}
            customBackground={customBackground}
            actionsSlot={
                isInProgress ? (
                    <button
                        type="button"
                        onClick={() => setConfirmResetOpen(true)}
                        title="Reset"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                    >
                        <RotateCcw size={16} />
                    </button>
                ) : null
            }
        >
            <div className="max-w-md mx-auto p-4 space-y-6">
                {/* Status Banner */}
                {renderModel.isTerminal && (
                    <div className={`
            rounded-xl p-6 text-center
            ${renderModel.status === "won"
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-rose-500/10 border border-rose-500/30"
                        }
`}>
                        {renderModel.status === "won" ? (
                            <>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Trophy className="w-8 h-8 text-emerald-400" />
                                </div>
                                <div className="text-2xl font-bold text-emerald-400 mb-1">
                                    Geknackt!
                                </div>
                                <div className="text-[color:var(--muted)]">
                                    Du hast den Code in {data.currentAttempt - 1} Versuchen gelöst
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <X className="w-8 h-8 text-rose-400" />
                                </div>
                                <div className="text-2xl font-bold text-rose-400 mb-1">
                                    Game Over
                                </div>
                                <div className="text-[color:var(--muted)] mb-4">
                                    Der Code war:
                                </div>
                            </>
                        )}

                        {data.secret && (
                            <div className="flex gap-2 justify-center mt-4">
                                {data.secret.map((c, i) => (
                                    <ColorPeg key={i} color={c} colorHex={data.colors[c]} size="md" />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Grid */}
                <div className="space-y-2">
                    {data.attempts.map((attempt, i) => (
                        <AttemptRow
                            key={i}
                            guess={attempt.guess}
                            feedback={attempt.feedback}
                            colors={data.colors}
                            codeLength={data.codeLength}
                        />
                    ))}

                    {!renderModel.isTerminal && (
                        <AttemptRow
                            guess={[]}
                            colors={data.colors}
                            codeLength={data.codeLength}
                            isActive
                            currentInput={currentInput}
                            onSlotClick={handleSlotClick}
                        />
                    )}
                </div>

                {!renderModel.isTerminal && (
                    <div className="text-center text-[color:var(--muted)]">
                        {data.remainingAttempts} Versuche übrig
                    </div>
                )}

                {!renderModel.isTerminal && (
                    <ColorPicker
                        colors={data.colors}
                        selectedColor={selectedColor}
                        onColorSelect={handleColorSelect}
                    />
                )}

                {!renderModel.isTerminal && (
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={handleClear}
                            className="px-6 py-3 bg-[color:var(--surface)] hover:bg-[color:var(--surface2)] border border-[color:var(--border)] rounded-xl transition flex items-center gap-2"
                        >
                            <X className="w-5 h-5" />
                            Löschen
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!isGuessComplete}
                            className={`
                px-6 py-3 rounded-xl transition flex items-center gap-2 font-semibold
                ${isGuessComplete
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    : "bg-[color:var(--surface)] border border-[color:var(--border)] cursor-not-allowed opacity-50"
                                }
`}
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            Raten
                        </button>
                    </div>
                )}

                {renderModel.isTerminal && (
                    <div className="flex gap-3">
                        <button
                            onClick={initGame}
                            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition text-white"
                        >
                            Nochmal spielen
                        </button>
                        <button
                            onClick={() => setStatsOpen(true)}
                            className="px-4 py-4 bg-[color:var(--surface)] hover:bg-[color:var(--surface2)] border border-[color:var(--border)] rounded-xl font-bold transition"
                        >
                            Stats
                        </button>
                    </div>
                )}
            </div>

            <StatsModal
                open={statsOpen}
                onClose={() => setStatsOpen(false)}
                stats={stats}
                onLeaderboard={() => setLeaderboardOpen(true)}
            />

            <Leaderboard
                open={leaderboardOpen}
                onClose={() => setLeaderboardOpen(false)}
                gameId={GAME_ID}
            />

            <Settings
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                gameId={GAME_ID}
                currentBackground={customBackground}
                difficulty={difficulty}
                onDifficultyChange={requestDifficultyChange}
                onBackgroundChange={(bg) => setCustomBackground(bg)}
            />

            <Modal open={confirmResetOpen} title="Reset game?" onClose={() => setConfirmResetOpen(false)} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setConfirmResetOpen(false)} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">Cancel</button>
                    <button type="button" onClick={forfeitCurrentGameAndReset} className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30">Reset (counts as loss)</button>
                </div>
            }>
                <div className="text-sm text-[color:var(--fg)]/85">You already made guesses. Resetting now will count as a loss.</div>
            </Modal>

            <Modal open={confirmDifficultyOpen} title="Change difficulty?" onClose={() => { setConfirmDifficultyOpen(false); setPendingDifficulty(null); }} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => { setConfirmDifficultyOpen(false); setPendingDifficulty(null); }} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">Cancel</button>
                    <button type="button" onClick={() => {
                        const next = pendingDifficulty;
                        setConfirmDifficultyOpen(false);
                        setPendingDifficulty(null);
                        forfeitCurrentGame();
                        if (next) applyDifficultyChange(next);
                    }} className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30">Switch (counts as loss)</button>
                </div>
            }>
                <div className="text-sm text-[color:var(--fg)]/85">You already made guesses. Switching difficulty now will forfeit this game and count as a loss.</div>
            </Modal>
        </GameShell>
    );
}
