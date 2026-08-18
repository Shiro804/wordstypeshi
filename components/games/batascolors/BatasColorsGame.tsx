"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { RotateCcw, Droplets, X } from "lucide-react";
import GameShell from "@/components/shared/GameShell";
import GameResultOverlay from "@/components/games/common/GameResultOverlay";
import FloatingGameOver from "@/components/games/common/FloatingGameOver";
import {
    batascolorsEngine,
    getModeParams,
    type BatasColorsState,
    type BatasColorsAction
} from "@/lib/games/batascolors/engine";
import { batascolorsUIAdapter, type BatasColorsRenderModel } from "@/lib/games/batascolors/ui-adapter";
import { rgbToHex } from "@/lib/games/batascolors/ruleset";
import { loadActiveGame, saveActiveGame } from "@/lib/storage/active-game-storage";
import { loadDifficulty, saveDifficulty } from "@/lib/storage/settings-storage";
import type { Difficulty } from "@/lib/difficulty";
import { getCurrentUserId, upsertRemoteGameStats, syncGameStats, loadLocalStats, saveLocalStats } from "@/lib/sync/game-stats-sync";
import { createOrReuseActiveSession, endSession } from "@/lib/sync/sessions-sync";
import { trackGuess } from "@/lib/sync/game-guesses-sync";
import Leaderboard from "@/components/games/common/Leaderboard";
import StatsModal from "@/components/shared/StatsModal";
import { type Stats, applyGameResult } from "@/lib/storage/storage";
import { playDurationSec, useGameTimer } from "@/lib/hooks/useGameTimer";
import Modal from "../common/Modal";
import { useLanguage } from "@/lib/i18n";

// ============================================================================
// Constants & Mapping
// ============================================================================

const GAME_ID = "batascolors";
type BatasColorsModeId = keyof typeof import("@/lib/games/batascolors/ruleset").BATASCOLORS_MODES;

const DIFFICULTY_TO_MODE: Record<Difficulty, BatasColorsModeId> = {
    easy: 'easy',
    medium: 'medium',
    hard: 'hard',
};

// ============================================================================
// Sub-components
// ============================================================================

interface PieChartProps {
    segmentPercentages: number[];
    segmentColors: (string | null)[];
    selectedSegment: number | null;
    onSegmentClick: (index: number) => void;
    disabled?: boolean;
}

function PieChart({
    segmentPercentages,
    segmentColors,
    selectedSegment,
    onSegmentClick,
    disabled = false,
}: PieChartProps) {
    const size = 220;
    const center = size / 2;
    const radius = size / 2 - 8;

    // Calculate pie segments
    const segments = useMemo(() => {
        let currentAngle = -90; // Start from top
        return segmentPercentages.map((percentage, index) => {
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            // Convert angles to radians
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            // Calculate arc path
            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);

            const largeArcFlag = angle > 180 ? 1 : 0;

            const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            // Calculate label position (middle of arc)
            const midAngle = startAngle + angle / 2;
            const midRad = (midAngle * Math.PI) / 180;
            const labelRadius = radius * 0.6;
            const labelX = center + labelRadius * Math.cos(midRad);
            const labelY = center + labelRadius * Math.sin(midRad);

            return {
                path,
                percentage,
                labelX,
                labelY,
                color: segmentColors[index],
                isSelected: selectedSegment === index,
            };
        });
    }, [segmentPercentages, segmentColors, selectedSegment, center, radius]);

    return (
        <svg
            width={size}
            height={size}
            className="drop-shadow-xl"
            style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))' }}
        >
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {segments.map((seg, i) => (
                <g key={i}>
                    <path
                        d={seg.path}
                        fill={seg.color || 'var(--surface2)'}
                        stroke={seg.isSelected ? '#fff' : 'rgba(255,255,255,0.3)'}
                        strokeWidth={seg.isSelected ? 4 : 2}
                        onClick={() => !disabled && onSegmentClick(i)}
                        className={`
                            transition-all duration-200
                            ${!disabled ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}
                            ${seg.isSelected ? 'brightness-110' : ''}
                        `}
                        style={{
                            filter: seg.isSelected ? 'url(#glow)' : undefined,
                        }}
                    />
                    <text
                        x={seg.labelX}
                        y={seg.labelY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-sm font-bold fill-white pointer-events-none select-none"
                        style={{
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                        }}
                    >
                        {seg.percentage}%
                    </text>
                </g>
            ))}
        </svg>
    );
}

interface ColorPaletteProps {
    colors: string[];
    selectedColor: number | null;
    onColorSelect: (index: number) => void;
    disabled?: boolean;
}

function ColorPalette({
    colors,
    selectedColor,
    onColorSelect,
    disabled = false,
}: ColorPaletteProps) {
    return (
        <div className="flex gap-3 justify-center flex-wrap p-4 bg-[color:var(--surface)] rounded-xl">
            {colors.map((hex, i) => (
                <button
                    key={i}
                    type="button"
                    onClick={() => !disabled && onColorSelect(i)}
                    disabled={disabled}
                    className={`
                        w-12 h-12
                        rounded-full
                        border-2
                        transition-all
                        ${selectedColor === i ? 'ring-2 ring-[color:var(--fg)] ring-offset-2 ring-offset-[color:var(--bg)] scale-110' : ''}
                        ${!disabled ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-60'}
                        border-white/20
                    `}
                    style={{ backgroundColor: hex }}
                    aria-label={`Color ${i + 1}`}
                />
            ))}
        </div>
    );
}

interface AccuracyDisplayProps {
    accuracy: number;
    animate?: boolean;
    labels: { perfect: string; almostThere: string; accuracy: string };
}

function AccuracyDisplay({ accuracy, animate = false, labels }: AccuracyDisplayProps) {
    const getColor = () => {
        if (accuracy === 100) return 'text-emerald-400';
        if (accuracy >= 90) return 'text-lime-400';
        if (accuracy >= 75) return 'text-yellow-400';
        if (accuracy >= 50) return 'text-orange-400';
        return 'text-rose-400';
    };

    const caption =
        accuracy === 100 ? labels.perfect : accuracy >= 90 ? labels.almostThere : labels.accuracy;

    return (
        <div className={`text-center ${animate ? 'animate-pulse' : ''}`}>
            <span className={`text-4xl font-black ${getColor()}`}>
                {accuracy}%
            </span>
            <p className="text-sm text-[color:var(--muted)] mt-1">
                {caption}
            </p>
        </div>
    );
}

// ============================================================================
// Attempt History Component
// ============================================================================

interface AttemptHistoryProps {
    attempts: Array<{
        segmentColors: number[];
        mixedColor: string;
        accuracy: number;
    }>;
    palette: string[];
}

function AttemptHistory({ attempts, palette }: AttemptHistoryProps) {
    if (attempts.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center justify-center gap-3 py-1 px-3 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/5 max-w-full overflow-x-auto">
            {attempts.map((attempt, idx) => {
                const ringColor = attempt.accuracy >= 90
                    ? 'ring-emerald-400'
                    : attempt.accuracy >= 70
                        ? 'ring-yellow-400'
                        : 'ring-rose-400';

                return (
                    <div
                        key={idx}
                        className="flex items-center gap-1"
                        title={`Attempt ${idx + 1}`}
                    >
                        {/* Compact color dots */}
                        <div className="flex -space-x-0.5">
                            {attempt.segmentColors.map((colorIdx, i) => (
                                <div
                                    key={i}
                                    className="w-2.5 h-2.5 rounded-full border border-black/30"
                                    style={{ backgroundColor: palette[colorIdx] }}
                                />
                            ))}
                        </div>
                        {/* Arrow */}
                        <span className="text-[8px] text-white/40">→</span>
                        {/* Result with accuracy inside */}
                        <div
                            className={`relative flex items-center justify-center w-5 h-5 rounded-full ring-1 ${ringColor}`}
                            style={{ backgroundColor: attempt.mixedColor }}
                        >
                            <span className="text-[8px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                                {attempt.accuracy}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// Main Game Component
// ============================================================================

interface BatasColorsGameProps {
    initialMode?: string;
}

export default function BatasColorsGame({ initialMode }: BatasColorsGameProps) {
    // State
    const [difficulty, setDifficulty] = useState<Difficulty>(() => loadDifficulty());
    const [gameState, setGameState] = useState<BatasColorsState | null>(null);
    const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
    const [selectedColor, setSelectedColor] = useState<number | null>(null);
    const [segmentColors, setSegmentColors] = useState<number[]>([]);

    // Confirmation State
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);
    const [confirmDifficultyOpen, setConfirmDifficultyOpen] = useState(false);
    const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);

    // UI State
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [stats, setStats] = useState<Stats>(() => loadLocalStats(GAME_ID, difficulty));
    const [userId, setUserId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);

    // Game over animation states
    const [showFloatingText, setShowFloatingText] = useState(false);
    const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);

    // Language
    const { t } = useLanguage();

    // Timer state
    const timer = useGameTimer();

    // Derived
    const mode = (initialMode as BatasColorsModeId) || DIFFICULTY_TO_MODE[difficulty];
    const params = useMemo(() => {
        return getModeParams(mode) ?? getModeParams("easy");
    }, [mode]);

    // Check if game is in progress (first guess must be made)
    const isInProgress = useMemo(() => {
        return gameState && !batascolorsEngine.isTerminal(gameState) && gameState.attempts.length > 0;
    }, [gameState]);

    // Initial Load
    useEffect(() => {
        getCurrentUserId().then(uid => setUserId(uid));
    }, []);

    // Load active game or init new one when params change
    useEffect(() => {
        const loadGame = async () => {
            const active = loadActiveGame<BatasColorsState>(GAME_ID, userId);
            const paramsMatch = active && active.config.numSegments === params.numSegments;

            if (paramsMatch && !batascolorsEngine.isTerminal(active)) {
                // Restore existing game with matching params
                setGameState(active);
                setSegmentColors(Array(params.numSegments).fill(-1));

                // Only restore timer if game has actual attempts (was started)
                if (active.attempts.length > 0) {
                    timer.setStartedAt(active.startedAtMs);
                    if (active.endedAtMs) {
                        timer.setEndedAt(active.endedAtMs);
                    }
                } else {
                    timer.reset();
                }

                // Restore session
                if (userId) {
                    const session = await createOrReuseActiveSession({
                        userId,
                        gameId: GAME_ID,
                        difficulty,
                        answer: rgbToHex(active.targetColor),
                        startedAtMs: active.startedAtMs,
                    });
                    setSessionId(session?.id ?? null);
                }
            } else {
                // Start new game
                const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const state = batascolorsEngine.init(newSeed, params);
                setGameState(state);
                setSegmentColors(Array(params.numSegments).fill(-1));
                setSelectedSegment(null);
                setLastAccuracy(null);
                saveActiveGame(GAME_ID, state, userId);

                timer.reset();

                // Create new session
                if (userId) {
                    const session = await createOrReuseActiveSession({
                        userId,
                        gameId: GAME_ID,
                        difficulty,
                        answer: rgbToHex(state.targetColor),
                        startedAtMs: state.startedAtMs,
                    });
                    setSessionId(session?.id ?? null);
                }
            }
        };

        loadGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, params, mode]);

    // Save active game
    useEffect(() => {
        if (gameState) {
            saveActiveGame(GAME_ID, batascolorsEngine.isTerminal(gameState) ? null : gameState, userId);
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

    const initGame = useCallback(async () => {
        const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const state = batascolorsEngine.init(newSeed, params);
        setGameState(state);
        setSegmentColors(Array(params.numSegments).fill(-1));
        setSelectedSegment(null);
        setSelectedColor(null);
        setLastAccuracy(null);
        saveActiveGame(GAME_ID, state, userId);
        timer.reset();

        // Create session for logged-in users
        if (userId) {
            const session = await createOrReuseActiveSession({
                userId,
                gameId: GAME_ID,
                difficulty,
                answer: rgbToHex(state.targetColor),
                startedAtMs: state.startedAtMs,
            });
            setSessionId(session?.id ?? null);
        }
    }, [params, userId, difficulty, timer]);

    const forfeitCurrentGame = useCallback(async () => {
        if (!gameState) return;
        timer.stop();
        const durationSec = playDurationSec(timer);
        const newStats = applyGameResult(stats, { outcome: "lose", durationSec });
        setStats(newStats);
        saveLocalStats(GAME_ID, difficulty, newStats);
        if (userId) {
            upsertRemoteGameStats(userId, GAME_ID, difficulty, newStats);
        }

        // End session as forfeit
        if (sessionId) {
            await endSession({
                sessionId,
                outcome: "forfeit",
                guessesUsed: gameState.attempts.length,
                durationSec,
                endedAtMs: Date.now(),
            });
            setSessionId(null);
        }

        saveActiveGame(GAME_ID, null, userId);
    }, [gameState, stats, difficulty, userId, sessionId, timer]);

    const applyDifficultyChange = useCallback((d: Difficulty) => {
        setDifficulty(d);
        saveDifficulty(d);
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

    const requestReset = useCallback(() => {
        if (isInProgress) {
            setConfirmResetOpen(true);
            return;
        }
        initGame();
    }, [isInProgress, initGame]);

    const handleSegmentClick = useCallback((index: number) => {
        if (selectedSegment === index) {
            // Clicking on already selected segment clears its color
            setSegmentColors(prev => {
                const next = [...prev];
                next[index] = -1;
                return next;
            });
            setSelectedSegment(null);
        } else {
            setSelectedSegment(index);
        }
    }, [selectedSegment]);

    const handleColorSelect = useCallback((colorIndex: number) => {
        setSelectedColor(colorIndex);
        if (selectedSegment === null) {
            // If no segment selected, select first empty one
            const firstEmpty = segmentColors.indexOf(-1);
            if (firstEmpty !== -1) {
                setSelectedSegment(firstEmpty);
                setSegmentColors(prev => {
                    const next = [...prev];
                    next[firstEmpty] = colorIndex;
                    return next;
                });
                // Auto-advance to next empty segment
                const nextEmpty = segmentColors.findIndex((c, i) => i > firstEmpty && c === -1);
                setSelectedSegment(nextEmpty !== -1 ? nextEmpty : null);
            }
        } else {
            setSegmentColors(prev => {
                const next = [...prev];
                next[selectedSegment] = colorIndex;
                return next;
            });
            // Auto-advance to next empty segment
            const nextEmpty = segmentColors.findIndex((c, i) => i > selectedSegment && c === -1);
            if (nextEmpty !== -1) {
                setSelectedSegment(nextEmpty);
            } else {
                // Check if there's any empty segment before current
                const anyEmpty = segmentColors.findIndex((c, i) => i !== selectedSegment && c === -1);
                setSelectedSegment(anyEmpty !== -1 ? anyEmpty : null);
            }
        }
    }, [selectedSegment, segmentColors]);

    const isGuessComplete = useMemo(() => {
        return segmentColors.every(c => c !== -1);
    }, [segmentColors]);

    const renderModel = useMemo((): BatasColorsRenderModel | null => {
        if (!gameState) return null;
        return batascolorsUIAdapter.toRenderModel(gameState) as BatasColorsRenderModel;
    }, [gameState]);

    const handleSubmit = useCallback(async () => {
        if (!gameState || !isGuessComplete) return;

        const action: BatasColorsAction = {
            type: "submit_guess",
            segmentColors,
        };

        const result = batascolorsEngine.applyAction(gameState, action);
        if (!result.invalidReason) {
            // Start timer on first guess
            if (!timer.startedAtMs) {
                timer.start();
            }

            setGameState(result.state);

            // Get accuracy from last attempt
            const lastAttempt = result.state.attempts[result.state.attempts.length - 1];
            setLastAccuracy(lastAttempt.accuracy);

            // Reset for next guess
            setSegmentColors(Array(params.numSegments).fill(-1));
            setSelectedSegment(null);

            // Track guess in database
            if (sessionId) {
                void trackGuess({
                    sessionId,
                    guessNumber: result.state.attempts.length,
                    guessData: { colors: lastAttempt.segmentColors },
                    feedback: { black: lastAttempt.accuracy, white: 0 },
                });
            }

            // Check completion
            if (batascolorsEngine.isTerminal(result.state)) {
                timer.stop();
                const isWin = result.state.status === "won";
                const durationSec = playDurationSec(timer);

                // Update stats
                const newStats = applyGameResult(stats, isWin
                    ? { outcome: "win", guessesUsed: result.state.attempts.length, durationSec }
                    : { outcome: "lose", durationSec }
                );

                setStats(newStats);
                saveLocalStats(GAME_ID, difficulty, newStats);

                if (userId) {
                    upsertRemoteGameStats(userId, GAME_ID, difficulty, newStats);
                }

                // End session
                if (sessionId) {
                    await endSession({
                        sessionId,
                        outcome: isWin ? "win" : "lose",
                        guessesUsed: result.state.attempts.length,
                        durationSec,
                        endedAtMs: result.state.endedAtMs!,
                    });
                    setSessionId(null);
                }
            }
        }
    }, [gameState, segmentColors, isGuessComplete, params.numSegments, stats, difficulty, userId, sessionId, timer]);

    const handleClear = useCallback(() => {
        setSegmentColors(Array(params.numSegments).fill(-1));
        setSelectedSegment(null);
    }, [params.numSegments]);

    // Trigger floating game over animation when game ends
    useEffect(() => {
        if (renderModel?.isTerminal) {
            setShowFloatingText(true);
        } else {
            setShowFloatingText(false);
            setShowGameOverOverlay(false);
        }
    }, [renderModel?.isTerminal]);

    // Callback when floating animation completes
    const handleFloatingComplete = useCallback(() => {
        setShowFloatingText(false);
        setShowGameOverOverlay(true);
    }, []);

    if (!renderModel) {
        return (
            <GameShell gameId="batascolors" gameName="BatasColors" onNewGame={initGame}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse text-[color:var(--fg)]">{t.common.loading}</div>
                </div>
            </GameShell>
        );
    }

    const { data } = renderModel;

    // Convert segment colors to hex for display
    const segmentColorHexes = segmentColors.map(idx =>
        idx === -1 ? null : data.palette[idx]
    );

    return (
        <GameShell
            gameId={GAME_ID}
            gameName="BatasColors"
            onNewGame={requestReset}
            onOpenLeaderboard={() => { setShowGameOverOverlay(false); setLeaderboardOpen(true); }}
            onOpenStats={() => { setShowGameOverOverlay(false); setStatsOpen(true); }}
            difficulty={difficulty}
            onDifficultyChange={requestDifficultyChange}
            timerText={timer.timerText}
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
            <div className="max-w-md mx-auto p-4 space-y-6 flex flex-col items-center">
                {/* Target + last mix */}
                <div className="flex items-end justify-center gap-6">
                    <div className="text-center">
                        <p className="text-sm text-[color:var(--muted)] mb-2">{t.batascolors?.targetColor || 'Target Color'}</p>
                        <div
                            className="w-20 h-20 rounded-2xl mx-auto border-4 border-white/20 shadow-lg"
                            style={{
                                backgroundColor: data.targetColor,
                                boxShadow: `0 8px 32px ${data.targetColor}40`,
                            }}
                        />
                    </div>
                    {data.mixedColor && (
                        <div className="text-center">
                            <p className="text-sm text-[color:var(--muted)] mb-2">{t.batascolors?.mix || 'Mix'}</p>
                            <div
                                className="w-20 h-20 rounded-2xl mx-auto border-4 border-white/20 shadow-lg"
                                style={{
                                    backgroundColor: data.mixedColor,
                                    boxShadow: `0 8px 32px ${data.mixedColor}40`,
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Pie Chart */}
                <div className="relative">
                    <PieChart
                        segmentPercentages={data.segmentPercentages}
                        segmentColors={segmentColorHexes}
                        selectedSegment={selectedSegment}
                        onSegmentClick={handleSegmentClick}
                        disabled={renderModel.isTerminal}
                    />
                </div>

                {/* Last Accuracy Display */}
                {lastAccuracy !== null && !renderModel.isTerminal && (
                    <AccuracyDisplay
                        accuracy={lastAccuracy}
                        animate
                        labels={{
                            perfect: t.batascolors?.perfect || 'Perfect match!',
                            almostThere: t.batascolors?.almostThere || 'Almost there!',
                            accuracy: t.batascolors?.accuracy || 'Accuracy',
                        }}
                    />
                )}

                {/* Attempts Counter */}
                {!renderModel.isTerminal && (
                    <div className="text-center text-[color:var(--muted)]">
                        {data.remainingAttempts} {t.batascolors?.attemptsRemaining || 'attempts remaining'}
                    </div>
                )}

                {/* Previous Attempts History — keep last mix visible when terminal */}
                {data.attempts.length > 0 && (
                    <AttemptHistory
                        attempts={data.attempts}
                        palette={data.palette}
                    />
                )}

                {/* Color Palette */}
                {!renderModel.isTerminal && (
                    <ColorPalette
                        colors={data.palette}
                        selectedColor={selectedColor}
                        onColorSelect={handleColorSelect}
                    />
                )}

                {/* Action Buttons */}
                {!renderModel.isTerminal && (
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={handleClear}
                            className="px-6 py-3 bg-[color:var(--surface)] hover:bg-[color:var(--surface2)] border border-[color:var(--border)] rounded-xl transition flex items-center gap-2"
                        >
                            <X className="w-5 h-5" />
                            {t.batascolors?.clear || 'Clear'}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!isGuessComplete}
                            className={`
                                px-6 py-3 rounded-xl transition flex items-center gap-2 font-semibold
                                ${isGuessComplete
                                    ? "bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white shadow-lg"
                                    : "bg-[color:var(--surface)] border border-[color:var(--border)] cursor-not-allowed opacity-50"
                                }
                            `}
                        >
                            <Droplets className="w-5 h-5" />
                            {t.batascolors?.mix || 'Mix'}
                        </button>
                    </div>
                )}
            </div>

            <StatsModal
                open={statsOpen}
                onClose={() => { setStatsOpen(false); if (renderModel.isTerminal) setShowGameOverOverlay(true); }}
                stats={stats}
                onLeaderboard={() => setLeaderboardOpen(true)}
            />

            <Leaderboard
                open={leaderboardOpen}
                onClose={() => { setLeaderboardOpen(false); if (renderModel.isTerminal) setShowGameOverOverlay(true); }}
                gameId={GAME_ID}
            />

            {/* Floating Game Over Animation */}
            <FloatingGameOver
                active={showFloatingText}
                text={renderModel.status === 'won' ? t.common.youWin : t.common.gameOver}
                outcome={renderModel.status === 'won' ? 'win' : 'lose'}
                duration={1500}
                onComplete={handleFloatingComplete}
            />

            {/* Game Result Overlay */}
            <GameResultOverlay
                open={showGameOverOverlay}
                outcome={renderModel.status === 'won' ? 'win' : 'lose'}
                title={renderModel.status === 'won' ? t.common.youWin : t.common.gameOver}
                subtitle={renderModel.status === 'won'
                    ? (t.batascolors?.perfect || 'Perfect match!')
                    : (t.batascolors?.targetColor || 'Target Color') + ':'}
                onPlayAgain={initGame}
                onOpenStats={() => { setShowGameOverOverlay(false); setStatsOpen(true); }}
                playAgainLabel={t.common.playAgain}
            >
                {/* Target and solution display */}
                <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3">
                        <div
                            className="w-12 h-12 rounded-xl border-2 border-white/20"
                            style={{ backgroundColor: data.targetColor }}
                        />
                        <span className="text-[color:var(--muted)]">→</span>
                        {data.solution && (
                            <div className="flex gap-1">
                                {data.solution.map((colorIdx, i) => (
                                    <div
                                        key={i}
                                        className="w-8 h-8 rounded-lg border border-white/20"
                                        style={{ backgroundColor: data.palette[colorIdx] }}
                                        title={`${data.segmentPercentages[i]}%`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    {data.bestAccuracy > 0 && renderModel.status !== 'won' && (
                        <p className="text-sm text-center text-[color:var(--muted)]">
                            Best: {data.bestAccuracy}%
                        </p>
                    )}
                </div>
            </GameResultOverlay>

            <Modal open={confirmResetOpen} title={t.modals.resetTitle} onClose={() => setConfirmResetOpen(false)} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setConfirmResetOpen(false)} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">{t.common.cancel}</button>
                    <button type="button" onClick={forfeitCurrentGameAndReset} className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30">{t.modals.resetConfirm}</button>
                </div>
            }>
                <div className="text-sm text-[color:var(--fg)]/85">{t.modals.resetMessage}</div>
            </Modal>

            <Modal open={confirmDifficultyOpen} title={t.modals.difficultyTitle} onClose={() => { setConfirmDifficultyOpen(false); setPendingDifficulty(null); }} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => { setConfirmDifficultyOpen(false); setPendingDifficulty(null); }} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">{t.common.cancel}</button>
                    <button type="button" onClick={() => {
                        const next = pendingDifficulty;
                        setConfirmDifficultyOpen(false);
                        setPendingDifficulty(null);
                        forfeitCurrentGame();
                        if (next) applyDifficultyChange(next);
                    }} className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30">{t.modals.difficultyConfirm}</button>
                </div>
            }>
                <div className="text-sm text-[color:var(--fg)]/85">{t.modals.difficultyMessage}</div>
            </Modal>
        </GameShell>
    );
}
