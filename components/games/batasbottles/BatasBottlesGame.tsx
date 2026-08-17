"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { RotateCcw, Undo2, Star, ArrowLeft, ChevronRight } from "lucide-react";
import GameShell from "@/components/shared/GameShell";
import {
    batasBottlesEngine,
    computeStars,
    type BatasBottlesState,
    type BatasBottlesAction,
    type BatasBottlesParams,
} from "@/lib/games/batasbottles/engine";
import { BATASBOTTLES_LEVEL_COUNT } from "@/lib/games/batasbottles/ruleset";
import { batasBottlesLevelSystem } from "@/lib/games/batasbottles/level-generator";
import {
    batasBottlesUIAdapter,
    type BatasBottlesRenderModel,
    type BottleRenderData,
} from "@/lib/games/batasbottles/ui-adapter";
import {
    type LevelProgress,
    type StarCount,
    emptyLevelProgress,
    recordLevelResult,
} from "@/lib/games/sdk/levels";
import { loadActiveGame, saveActiveGame } from "@/lib/storage/active-game-storage";
import {
    getCurrentUserId,
    upsertRemoteGameStats,
    syncGameStats,
    loadLocalStats,
    saveLocalStats,
} from "@/lib/sync/game-stats-sync";
import { createOrReuseActiveSession, endSession } from "@/lib/sync/sessions-sync";
import Leaderboard from "@/components/games/common/Leaderboard";
import StatsModal from "@/components/shared/StatsModal";
import type { Stats } from "@/lib/storage/storage";
import { useGameTimer } from "@/lib/hooks/useGameTimer";
import Modal from "../common/Modal";
import LevelSelectScreen from "@/components/games/common/LevelSelectScreen";
import { useLanguage } from "@/lib/i18n";

// ============================================================================
// Constants
// ============================================================================

const GAME_ID = "batasbottles";
const STATS_MODE = "level";

/** Duration of the pour animation in milliseconds. */
const POUR_ANIM_MS = 550;

// ============================================================================
// Bottle visual
// ============================================================================

interface BottleProps {
    bottle: BottleRenderData;
    width: number;
    height: number;
    onTap: (id: number) => void;
    disabled: boolean;
    tiltDeg?: number;
    /** Whether to render the dashed legal-destination ring (tutorial phase). */
    showHint?: boolean;
}

function BottleSVG({
    bottle,
    width,
    height,
    onTap,
    disabled,
    tiltDeg = 0,
    showHint = false,
}: BottleProps) {
    const { layers, capacity, isTarget, isSelected, isLegalDestination, topColor } = bottle;

    const padX = Math.max(2, width * 0.1);
    const innerW = width - padX * 2;
    const neckH = height * 0.08;
    const bodyTop = neckH + height * 0.04;
    const bodyH = height - bodyTop - height * 0.05;
    const layerH = bodyH / capacity;

    const bodyX = padX;
    const bodyY = bodyTop;
    const neckW = innerW * 0.42;
    const neckX = padX + (innerW - neckW) / 2;

    const glowColor = isTarget ? topColor ?? "#60A5FA" : topColor ?? "#ffffff";
    const lift = isSelected ? -8 : 0;
    const renderHintRing = showHint && isLegalDestination;

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onTap(bottle.id)}
            className="relative flex items-center justify-center transition-transform duration-200 focus:outline-none"
            style={{
                width,
                height: height + 12,
                transform: `translateY(${lift}px) rotate(${tiltDeg}deg)`,
                transformOrigin: "bottom center",
                cursor: disabled ? "default" : "pointer",
            }}
            aria-label={isTarget ? "Target bottle" : `Bottle ${bottle.id}`}
        >
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={{
                    overflow: "visible",
                    filter: isSelected
                        ? `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 0 4px ${glowColor})`
                        : renderHintRing
                            ? `drop-shadow(0 0 8px rgba(255,255,255,0.6))`
                            : isTarget
                                ? `drop-shadow(0 0 14px ${glowColor}80)`
                                : "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
                }}
            >
                <defs>
                    <clipPath id={`bottle-clip-${bottle.id}`}>
                        <path
                            d={buildBottlePath(bodyX, bodyY, innerW, bodyH, neckX, neckW, neckH)}
                        />
                    </clipPath>
                    <linearGradient id={`glass-${bottle.id}`} x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.04)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
                    </linearGradient>
                </defs>

                {/* Glass fill */}
                <path
                    d={buildBottlePath(bodyX, bodyY, innerW, bodyH, neckX, neckW, neckH)}
                    fill={`url(#glass-${bottle.id})`}
                    stroke={isSelected ? glowColor : "rgba(255,255,255,0.45)"}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                />

                {/* Liquid layers — rendered bottom up, clipped to bottle outline */}
                <g clipPath={`url(#bottle-clip-${bottle.id})`}>
                    {layers.map((color, i) => {
                        const y = bodyY + bodyH - (i + 1) * layerH;
                        return (
                            <rect
                                key={`${bottle.id}-${i}-${color}`}
                                x={bodyX}
                                y={y}
                                width={innerW}
                                height={layerH + 0.8}
                                fill={color}
                                style={{
                                    transition: `y ${POUR_ANIM_MS}ms ease, opacity ${POUR_ANIM_MS}ms ease`,
                                }}
                            />
                        );
                    })}

                    {/* subtle highlight reflection */}
                    <rect
                        x={bodyX + innerW * 0.18}
                        y={bodyY + bodyH * 0.05}
                        width={innerW * 0.08}
                        height={bodyH * 0.75}
                        fill="rgba(255,255,255,0.12)"
                        rx={innerW * 0.04}
                    />
                </g>

                {/* Legal-destination ring pulse — only on tutorial phase */}
                {renderHintRing && (
                    <path
                        d={buildBottlePath(bodyX, bodyY, innerW, bodyH, neckX, neckW, neckH)}
                        fill="none"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        className="animate-pulse"
                    />
                )}
            </svg>
        </button>
    );
}

function buildBottlePath(
    bodyX: number,
    bodyY: number,
    innerW: number,
    bodyH: number,
    neckX: number,
    neckW: number,
    neckH: number
): string {
    const bodyBottomRadius = Math.min(innerW * 0.22, bodyH * 0.12);
    const shoulderRadius = Math.min(innerW * 0.18, bodyH * 0.08);
    const bodyRight = bodyX + innerW;
    const bodyBottom = bodyY + bodyH;
    const neckRight = neckX + neckW;
    const neckTop = bodyY - neckH;

    return [
        `M ${neckX} ${neckTop}`,
        `L ${neckRight} ${neckTop}`,
        `L ${neckRight} ${bodyY}`,
        `Q ${neckRight + shoulderRadius} ${bodyY}, ${bodyRight} ${bodyY + shoulderRadius}`,
        `L ${bodyRight} ${bodyBottom - bodyBottomRadius}`,
        `Q ${bodyRight} ${bodyBottom}, ${bodyRight - bodyBottomRadius} ${bodyBottom}`,
        `L ${bodyX + bodyBottomRadius} ${bodyBottom}`,
        `Q ${bodyX} ${bodyBottom}, ${bodyX} ${bodyBottom - bodyBottomRadius}`,
        `L ${bodyX} ${bodyY + shoulderRadius}`,
        `Q ${bodyX - shoulderRadius + shoulderRadius} ${bodyY}, ${neckX} ${bodyY}`,
        `L ${neckX} ${neckTop}`,
        `Z`,
    ].join(" ");
}

// ============================================================================
// Pour overlay — animated liquid stream between two bottles
// ============================================================================

interface PourOverlayProps {
    fromRect: DOMRect;
    toRect: DOMRect;
    containerRect: DOMRect;
    color: string;
}

function PourOverlay({ fromRect, toRect, containerRect, color }: PourOverlayProps) {
    const fromX = fromRect.left - containerRect.left + fromRect.width / 2;
    const fromY = fromRect.top - containerRect.top + fromRect.height * 0.18;
    const toX = toRect.left - containerRect.left + toRect.width / 2;
    const toY = toRect.top - containerRect.top + toRect.height * 0.18;

    const midX = (fromX + toX) / 2;
    const midY = Math.min(fromY, toY) - 40;

    const d = `M ${fromX} ${fromY} Q ${midX} ${midY}, ${toX} ${toY}`;

    return (
        <svg
            className="pointer-events-none absolute inset-0 z-30"
            width="100%"
            height="100%"
            style={{ overflow: "visible" }}
        >
            <defs>
                <filter id="pour-blur" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.4" />
                </filter>
            </defs>
            <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={6}
                strokeLinecap="round"
                filter="url(#pour-blur)"
                style={{
                    strokeDasharray: 400,
                    strokeDashoffset: 400,
                    animation: `bb-pour-flow ${POUR_ANIM_MS}ms ease-out forwards`,
                }}
            />
            <path
                d={d}
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={2}
                strokeLinecap="round"
                style={{
                    strokeDasharray: 400,
                    strokeDashoffset: 400,
                    animation: `bb-pour-flow ${POUR_ANIM_MS}ms ease-out forwards`,
                }}
            />
            <style>{`
                @keyframes bb-pour-flow {
                    0%   { stroke-dashoffset: 400; opacity: 0; }
                    20%  { opacity: 1; }
                    80%  { opacity: 1; }
                    100% { stroke-dashoffset: 0; opacity: 0; }
                }
            `}</style>
        </svg>
    );
}

// ============================================================================
// Bottle layout helpers
// ============================================================================

function splitLeftRight(smalls: BottleRenderData[]): {
    left: BottleRenderData[];
    right: BottleRenderData[];
} {
    const half = Math.ceil(smalls.length / 2);
    return {
        left: smalls.slice(0, half),
        right: smalls.slice(half),
    };
}

// ============================================================================
// Main component
// ============================================================================

export default function BatasBottlesGame() {
    const { t } = useLanguage();
    const timer = useGameTimer();

    // ---------- Core state
    const [gameState, setGameState] = useState<BatasBottlesState | null>(null);
    const [progress, setProgress] = useState<LevelProgress>(() => {
        const base = loadLocalStats(GAME_ID, STATS_MODE);
        return base.levelProgress ?? emptyLevelProgress();
    });

    // ---------- UI state
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [stats, setStats] = useState<Stats>(() => loadLocalStats(GAME_ID, STATS_MODE));
    const [userId, setUserId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Result overlay — shown once on terminal, with a memento of the "new best" flag
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [wasNewBest, setWasNewBest] = useState(false);
    const [priorBest, setPriorBest] = useState<number | null>(null);

    // Pour animation state
    const [pourAnim, setPourAnim] = useState<
        | { fromId: number; toId: number; color: string; startedAt: number }
        | null
    >(null);
    const [shakeId, setShakeId] = useState<number | null>(null);

    const boardRef = useRef<HTMLDivElement>(null);
    const bottleRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // ---------- Derived
    const renderModel = useMemo((): BatasBottlesRenderModel | null => {
        if (!gameState) return null;
        return batasBottlesUIAdapter.toRenderModel(gameState) as BatasBottlesRenderModel;
    }, [gameState]);

    const isInProgress = useMemo(() => {
        return (
            gameState != null &&
            !batasBottlesEngine.isTerminal(gameState) &&
            gameState.moveCount > 0
        );
    }, [gameState]);

    // ---------- Initial user load
    useEffect(() => {
        getCurrentUserId().then(uid => setUserId(uid));
    }, []);

    // ---------- Load active game (once we know the user)
    useEffect(() => {
        const active = loadActiveGame<BatasBottlesState>(GAME_ID, userId);
        if (active && !batasBottlesEngine.isTerminal(active)) {
            setGameState(active);
            if (active.moveCount > 0) {
                timer.setStartedAt(active.startedAtMs);
                if (active.endedAtMs) timer.setEndedAt(active.endedAtMs);
            } else {
                timer.reset();
            }
            if (userId) {
                createOrReuseActiveSession({
                    userId,
                    gameId: GAME_ID,
                    difficulty: "medium",
                    answer: String(active.level),
                    startedAtMs: active.startedAtMs,
                }).then(s => setSessionId(s?.id ?? null));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // ---------- Persist active game
    useEffect(() => {
        if (!gameState) {
            saveActiveGame(GAME_ID, null, userId);
            return;
        }
        saveActiveGame(
            GAME_ID,
            batasBottlesEngine.isTerminal(gameState) ? null : gameState,
            userId
        );
    }, [gameState, userId]);

    // ---------- Sync stats
    useEffect(() => {
        const local = loadLocalStats(GAME_ID, STATS_MODE);
        setStats(local);
        if (local.levelProgress) setProgress(local.levelProgress);
        if (userId) {
            syncGameStats(userId, GAME_ID, STATS_MODE, local).then(synced => {
                setStats(synced);
                saveLocalStats(GAME_ID, STATS_MODE, synced);
                if (synced.levelProgress) setProgress(synced.levelProgress);
            });
        }
    }, [userId]);

    // ---------- Game lifecycle
    const startLevel = useCallback(
        async (level: number) => {
            const clamped = Math.max(1, Math.min(BATASBOTTLES_LEVEL_COUNT, level));
            const params: BatasBottlesParams = { level: clamped };
            const state = batasBottlesEngine.init("", params);
            setGameState(state);
            saveActiveGame(GAME_ID, state, userId);
            timer.reset();
            setPourAnim(null);
            setShakeId(null);
            setOverlayOpen(false);
            setWasNewBest(false);
            setPriorBest(null);

            if (userId) {
                const session = await createOrReuseActiveSession({
                    userId,
                    gameId: GAME_ID,
                    difficulty: "medium",
                    answer: String(clamped),
                    startedAtMs: state.startedAtMs,
                });
                setSessionId(session?.id ?? null);
            }
        },
        [userId, timer]
    );

    const backToLevels = useCallback(async () => {
        timer.stop();
        if (sessionId && gameState) {
            const durationSec = Math.max(
                0,
                (Date.now() - gameState.startedAtMs) / 1000
            );
            await endSession({
                sessionId,
                outcome: "forfeit",
                guessesUsed: gameState.moveCount,
                durationSec,
                endedAtMs: Date.now(),
            });
            setSessionId(null);
        }
        setGameState(null);
        saveActiveGame(GAME_ID, null, userId);
        setOverlayOpen(false);
        setPourAnim(null);
        setShakeId(null);
    }, [sessionId, gameState, userId, timer]);

    // ---------- Handle game end (win or loss)
    const handleGameEnd = useCallback(
        async (state: BatasBottlesState) => {
            timer.stop();
            const durationSec = state.endedAtMs
                ? (state.endedAtMs - state.startedAtMs) / 1000
                : (Date.now() - state.startedAtMs) / 1000;

            const baseStats = loadLocalStats(GAME_ID, STATS_MODE);

            if (state.status === "won") {
                const earnedStars: StarCount = computeStars(state);
                const levelKey = String(state.level);
                const prevBest = baseStats.levelProgress?.bestMoves?.[levelKey];
                setPriorBest(prevBest ?? null);
                const isNewBest =
                    prevBest == null ? true : state.moveCount < prevBest;
                setWasNewBest(isNewBest);

                const updated = recordLevelResult(
                    progress,
                    state.level,
                    earnedStars,
                    state.moveCount
                );
                setProgress(updated);

                const newStats: Stats = {
                    ...baseStats,
                    played: baseStats.played + 1,
                    wins: baseStats.wins + 1,
                    levelProgress: updated,
                    lastTimesSec: [
                        durationSec,
                        ...(baseStats.lastTimesSec ?? []),
                    ].slice(0, 20),
                    updatedAt: Date.now(),
                };
                setStats(newStats);
                saveLocalStats(GAME_ID, STATS_MODE, newStats);
                if (userId) {
                    upsertRemoteGameStats(userId, GAME_ID, STATS_MODE, newStats);
                }
            } else if (state.status === "lost") {
                setWasNewBest(false);
                setPriorBest(null);
                const newStats: Stats = {
                    ...baseStats,
                    played: baseStats.played + 1,
                    losses: baseStats.losses + 1,
                    updatedAt: Date.now(),
                };
                setStats(newStats);
                saveLocalStats(GAME_ID, STATS_MODE, newStats);
                if (userId) {
                    upsertRemoteGameStats(userId, GAME_ID, STATS_MODE, newStats);
                }
            }

            if (sessionId) {
                await endSession({
                    sessionId,
                    outcome: state.status === "won" ? "win" : "lose",
                    guessesUsed: state.moveCount,
                    durationSec,
                    endedAtMs: state.endedAtMs ?? Date.now(),
                });
                setSessionId(null);
            }

            setOverlayOpen(true);
        },
        [progress, userId, sessionId, timer]
    );

    // ---------- Apply an engine action with animation hooks
    //
    // NOTE: side effects (timer start, pour animation, terminal handling) must
    // live OUTSIDE the `setGameState` updater. React StrictMode intentionally
    // double-invokes functional updaters in development, which would cause
    // `handleGameEnd` to fire twice and double-credit wins / losses.
    const applyAction = useCallback(
        (action: BatasBottlesAction) => {
            if (!gameState || batasBottlesEngine.isTerminal(gameState)) return;
            const result = batasBottlesEngine.applyAction(gameState, action);

            if (result.invalidReason) {
                if (action.type === "tap_bottle") {
                    setShakeId(action.bottleId);
                    setTimeout(() => setShakeId(null), 400);
                }
                return;
            }

            setGameState(result.state);

            if (!timer.startedAtMs && result.state.moveCount > 0) {
                timer.start();
            }

            const pourEvent = result.events.find(e => e.type === "poured");
            if (pourEvent) {
                const payload = pourEvent.payload as {
                    fromId: number;
                    toId: number;
                    color: string;
                };
                setPourAnim({ ...payload, startedAt: Date.now() });
                setTimeout(() => setPourAnim(null), POUR_ANIM_MS);
            }

            if (batasBottlesEngine.isTerminal(result.state)) {
                handleGameEnd(result.state);
            }
        },
        [gameState, timer, handleGameEnd]
    );

    const handleBottleTap = useCallback(
        (bottleId: number) => {
            if (!gameState || batasBottlesEngine.isTerminal(gameState)) return;
            if (pourAnim) return;
            applyAction({ type: "tap_bottle", bottleId });
        },
        [gameState, pourAnim, applyAction]
    );

    const handleUndo = useCallback(() => {
        if (!gameState || batasBottlesEngine.isTerminal(gameState)) return;
        if (gameState.history.length === 0) return;
        applyAction({ type: "undo" });
    }, [gameState, applyAction]);

    const forfeitCurrentGameAndReset = useCallback(async () => {
        if (!gameState) return;
        const level = gameState.level;
        timer.stop();
        if (sessionId) {
            const durationSec = Math.max(
                0,
                (Date.now() - gameState.startedAtMs) / 1000
            );
            await endSession({
                sessionId,
                outcome: "forfeit",
                guessesUsed: gameState.moveCount,
                durationSec,
                endedAtMs: Date.now(),
            });
            setSessionId(null);
        }
        setConfirmResetOpen(false);
        await startLevel(level);
    }, [gameState, sessionId, timer, startLevel]);

    const requestReset = useCallback(() => {
        if (isInProgress) {
            setConfirmResetOpen(true);
            return;
        }
        if (gameState) {
            startLevel(gameState.level);
        }
    }, [isInProgress, gameState, startLevel]);

    // ---------- Pour animation overlay coordinates
    const [pourRects, setPourRects] = useState<{
        fromRect: DOMRect;
        toRect: DOMRect;
        containerRect: DOMRect;
    } | null>(null);

    useEffect(() => {
        if (!pourAnim || !boardRef.current) {
            setPourRects(null);
            return;
        }
        const fromEl = bottleRefs.current.get(pourAnim.fromId);
        const toEl = bottleRefs.current.get(pourAnim.toId);
        if (!fromEl || !toEl) return;
        setPourRects({
            fromRect: fromEl.getBoundingClientRect(),
            toRect: toEl.getBoundingClientRect(),
            containerRect: boardRef.current.getBoundingClientRect(),
        });
    }, [pourAnim]);

    // ============================================================================
    // Render
    // ============================================================================

    // --- No active game: show level-select screen inside the shell
    if (!gameState) {
        return (
            <GameShell
                gameId={GAME_ID}
                gameName="BatasBottles"
                onNewGame={() => {
                    /* handled by level select */
                }}
                onOpenLeaderboard={() => setLeaderboardOpen(true)}
                onOpenStats={() => setStatsOpen(true)}
            >
                <LevelSelectScreen
                    levelSystem={batasBottlesLevelSystem}
                    progress={progress}
                    onSelect={(lvl: number) => startLevel(lvl)}
                    t={{
                        levelSelect: t.levels.levelSelect,
                        locked: t.levels.locked,
                        totalStars: t.levels.totalStars,
                        phase: t.levels.phase,
                        resume: t.levels.resume,
                        levelNumber: t.levels.level,
                    }}
                />
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
            </GameShell>
        );
    }

    if (!renderModel) {
        return (
            <GameShell gameId={GAME_ID} gameName="BatasBottles" onNewGame={requestReset}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse text-[color:var(--fg)]">Loading...</div>
                </div>
            </GameShell>
        );
    }

    const { data } = renderModel;
    const smalls = data.bottles.filter(b => !b.isTarget);
    const { left, right } = splitLeftRight(smalls);

    const currentLevel = data.level;
    const showHints = currentLevel <= 50;

    // Bottle sizing — scale by live small-bottle count
    const bigWidth = 108;
    const bigHeight = 240;
    const smallBottleCount = data.bottles.length - 1;
    const smallWidth =
        smallBottleCount <= 6
            ? 64
            : smallBottleCount <= 10
                ? 56
                : smallBottleCount <= 14
                    ? 48
                    : smallBottleCount <= 18
                        ? 42
                        : 36;
    const smallHeight = smallWidth * 1.9;
    const cols =
        smallBottleCount <= 6
            ? 1
            : smallBottleCount <= 12
                ? 2
                : smallBottleCount <= 18
                    ? 3
                    : 3;

    const atMaxLevel = currentLevel >= BATASBOTTLES_LEVEL_COUNT;

    // Star projection icons
    const projectionWarn =
        data.starProjection === 0 &&
        data.moveLimit !== null &&
        data.movesLeft !== null &&
        data.movesLeft <= Math.max(3, Math.floor(data.moveLimit * 0.1));

    return (
        <GameShell
            gameId={GAME_ID}
            gameName="BatasBottles"
            onNewGame={requestReset}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenStats={() => setStatsOpen(true)}
            timerText={timer.timerText}
            actionsSlot={
                isInProgress ? (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleUndo}
                            disabled={!data.canUndo}
                            title={t.common.undo ?? "Undo"}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Undo2 size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmResetOpen(true)}
                            title="Reset"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                ) : null
            }
        >
            <div className="max-w-2xl mx-auto p-4 space-y-3 flex flex-col items-center">
                {/* Top bar: back + level + star projection */}
                <div className="flex items-center justify-between w-full gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (isInProgress) {
                                setConfirmResetOpen(true);
                            } else {
                                backToLevels();
                            }
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                        title={t.levels.backToLevels}
                    >
                        <ArrowLeft size={14} />
                        <span>{t.levels.backToLevels}</span>
                    </button>
                    <div className="text-sm font-bold text-[color:var(--fg)]">
                        {t.batasbottles.levelLabel.replace("{n}", String(currentLevel))}
                    </div>
                    <StarProjection
                        stars={data.starProjection}
                        warn={projectionWarn}
                    />
                </div>

                {/* HUD: target color + moves + filled */}
                {!renderModel.isTerminal && (
                    <div className="flex items-center justify-between w-full gap-3 text-xs sm:text-sm text-[color:var(--muted)]">
                        <div className="flex items-center gap-1.5">
                            <span>{t.batasbottles.targetColor}:</span>
                            <span
                                className="inline-block h-4 w-4 rounded-full border border-white/30"
                                style={{
                                    backgroundColor: data.targetColor,
                                    boxShadow: `0 0 8px ${data.targetColor}`,
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            {data.moveLimit === null ? (
                                <span>{data.moveCount} / ∞</span>
                            ) : (
                                <span
                                    className={
                                        data.movesLeft !== null && data.movesLeft <= 3
                                            ? "text-rose-300 font-semibold"
                                            : ""
                                    }
                                >
                                    {data.moveCount} / {data.moveLimit} {t.common.moves}
                                </span>
                            )}
                        </div>
                        <div>
                            {data.filledLayers}/{data.totalLayers}{" "}
                            {t.batasbottles.layersFilled}
                        </div>
                    </div>
                )}

                {/* Game board */}
                <div
                    ref={boardRef}
                    className="relative flex items-center justify-center gap-4 w-full select-none"
                >
                    {/* Left small-bottle grid */}
                    <div
                        className="grid gap-2"
                        style={{
                            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                        }}
                    >
                        {left.map(b => (
                            <BottleCell
                                key={b.id}
                                bottle={b}
                                width={smallWidth}
                                height={smallHeight}
                                onTap={handleBottleTap}
                                disabled={!!pourAnim || renderModel.isTerminal}
                                shake={shakeId === b.id}
                                tilt={pourAnim?.fromId === b.id ? -18 : 0}
                                showHint={showHints}
                                registerRef={el => {
                                    if (el) bottleRefs.current.set(b.id, el);
                                    else bottleRefs.current.delete(b.id);
                                }}
                            />
                        ))}
                    </div>

                    {/* Center big bottle */}
                    <div className="flex flex-col items-center">
                        <BottleCell
                            bottle={data.target}
                            width={bigWidth}
                            height={bigHeight}
                            onTap={handleBottleTap}
                            disabled={!!pourAnim || renderModel.isTerminal}
                            shake={shakeId === 0}
                            tilt={0}
                            showHint={showHints}
                            registerRef={el => {
                                if (el) bottleRefs.current.set(0, el);
                                else bottleRefs.current.delete(0);
                            }}
                        />
                    </div>

                    {/* Right small-bottle grid */}
                    <div
                        className="grid gap-2"
                        style={{
                            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                        }}
                    >
                        {right.map(b => (
                            <BottleCell
                                key={b.id}
                                bottle={b}
                                width={smallWidth}
                                height={smallHeight}
                                onTap={handleBottleTap}
                                disabled={!!pourAnim || renderModel.isTerminal}
                                shake={shakeId === b.id}
                                tilt={pourAnim?.fromId === b.id ? 18 : 0}
                                showHint={showHints}
                                registerRef={el => {
                                    if (el) bottleRefs.current.set(b.id, el);
                                    else bottleRefs.current.delete(b.id);
                                }}
                            />
                        ))}
                    </div>

                    {/* Pour overlay */}
                    {pourAnim && pourRects && (
                        <PourOverlay
                            fromRect={pourRects.fromRect}
                            toRect={pourRects.toRect}
                            containerRect={pourRects.containerRect}
                            color={pourAnim.color}
                        />
                    )}
                </div>

                {/* Palette legend */}
                {!renderModel.isTerminal && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {data.palette.map(color => (
                            <div
                                key={color}
                                className="h-3 w-3 rounded-full"
                                style={{
                                    backgroundColor: color,
                                    opacity: color === data.targetColor ? 1 : 0.5,
                                    boxShadow:
                                        color === data.targetColor ? `0 0 6px ${color}` : "none",
                                }}
                            />
                        ))}
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

            <LevelResultOverlay
                open={overlayOpen}
                won={renderModel.status === "won"}
                stars={data.stars}
                moveCount={data.moveCount}
                priorBest={priorBest}
                isNewBest={wasNewBest}
                atMaxLevel={atMaxLevel}
                t={t}
                onRetry={() => {
                    setOverlayOpen(false);
                    startLevel(currentLevel);
                }}
                onBackToLevels={() => {
                    setOverlayOpen(false);
                    backToLevels();
                }}
                onNextLevel={() => {
                    setOverlayOpen(false);
                    startLevel(
                        Math.min(currentLevel + 1, BATASBOTTLES_LEVEL_COUNT)
                    );
                }}
                onClose={() => setOverlayOpen(false)}
            />

            <Modal
                open={confirmResetOpen}
                title={t.modals.resetTitle}
                onClose={() => setConfirmResetOpen(false)}
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setConfirmResetOpen(false)}
                            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                        >
                            {t.common.cancel}
                        </button>
                        <button
                            type="button"
                            onClick={forfeitCurrentGameAndReset}
                            className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30"
                        >
                            {t.modals.resetConfirm}
                        </button>
                    </div>
                }
            >
                <div className="text-sm text-[color:var(--fg)]/85">{t.modals.resetMessage}</div>
            </Modal>
        </GameShell>
    );
}

// ============================================================================
// Star projection HUD badge
// ============================================================================

function StarProjection({
    stars,
    warn,
}: {
    stars: StarCount;
    warn: boolean;
}) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3].map(slot => {
                const earned = slot <= stars;
                const color = earned
                    ? "text-amber-300"
                    : warn
                        ? "text-rose-400/80"
                        : "text-zinc-700";
                return (
                    <Star
                        key={slot}
                        size={16}
                        fill={earned ? "currentColor" : "none"}
                        className={color}
                    />
                );
            })}
        </div>
    );
}

// ============================================================================
// Level result overlay
// ============================================================================

interface LevelResultOverlayProps {
    open: boolean;
    won: boolean;
    stars: StarCount;
    moveCount: number;
    priorBest: number | null;
    isNewBest: boolean;
    atMaxLevel: boolean;
    t: ReturnType<typeof useLanguage>["t"];
    onRetry: () => void;
    onBackToLevels: () => void;
    onNextLevel: () => void;
    onClose: () => void;
}

function LevelResultOverlay({
    open,
    won,
    stars,
    moveCount,
    priorBest,
    isNewBest,
    atMaxLevel,
    t,
    onRetry,
    onBackToLevels,
    onNextLevel,
    onClose,
}: LevelResultOverlayProps) {
    const title = won ? t.levels.levelComplete : t.levels.levelFailed;

    return (
        <Modal
            open={open}
            title={title}
            onClose={onClose}
            footer={
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {won ? (
                        <>
                            <button
                                type="button"
                                onClick={onRetry}
                                className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                            >
                                <RotateCcw size={14} />
                                {t.levels.retry}
                            </button>
                            <button
                                type="button"
                                onClick={onBackToLevels}
                                className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                            >
                                <ArrowLeft size={14} />
                                {t.levels.backToLevels}
                            </button>
                            {!atMaxLevel && (
                                <button
                                    type="button"
                                    onClick={onNextLevel}
                                    className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-orange-400"
                                >
                                    {t.levels.nextLevel}
                                    <ChevronRight size={14} />
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onBackToLevels}
                                className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                            >
                                <ArrowLeft size={14} />
                                {t.levels.backToLevels}
                            </button>
                            <button
                                type="button"
                                onClick={onRetry}
                                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-orange-400"
                            >
                                <RotateCcw size={14} />
                                {t.levels.retry}
                            </button>
                        </>
                    )}
                </div>
            }
        >
            <div className="flex flex-col items-center gap-4 py-2">
                {/* Stars */}
                <div className="flex items-center gap-3">
                    {[1, 2, 3].map(slot => {
                        const earned = won && slot <= stars;
                        return (
                            <Star
                                key={slot}
                                size={52}
                                fill={earned ? "currentColor" : "none"}
                                className={
                                    earned
                                        ? "text-amber-300 bb-star-pop"
                                        : "text-zinc-700"
                                }
                                style={{
                                    animationDelay: `${(slot - 1) * 120}ms`,
                                }}
                            />
                        );
                    })}
                </div>

                {/* Subline */}
                {won ? (
                    <div className="flex flex-col items-center gap-1 text-sm text-[color:var(--fg)]/90">
                        <div>
                            {t.batasbottles.movesUsed.replace(
                                "{moves}",
                                String(moveCount)
                            )}
                            {priorBest != null && !isNewBest && (
                                <span className="ml-2 text-[color:var(--muted)]">
                                    · {t.levels.bestMoves} {priorBest}
                                </span>
                            )}
                        </div>
                        {isNewBest && (
                            <div className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                                <Star
                                    size={12}
                                    fill="currentColor"
                                />
                                {t.levels.newBest}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-sm text-[color:var(--fg)]/85">
                        {t.batasbottles.outOfMoves}
                    </div>
                )}

                <style>{`
                    .bb-star-pop {
                        animation: bb-star-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
                    }
                    @keyframes bb-star-pop {
                        0%   { transform: scale(0.2); opacity: 0; }
                        60%  { transform: scale(1.15); opacity: 1; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                `}</style>
            </div>
        </Modal>
    );
}

// ============================================================================
// Small wrapper that owns the DOM ref registration + shake animation
// ============================================================================

function BottleCell({
    bottle,
    width,
    height,
    onTap,
    disabled,
    shake,
    tilt,
    showHint,
    registerRef,
}: {
    bottle: BottleRenderData;
    width: number;
    height: number;
    onTap: (id: number) => void;
    disabled: boolean;
    shake: boolean;
    tilt: number;
    showHint: boolean;
    registerRef: (el: HTMLDivElement | null) => void;
}) {
    return (
        <div
            ref={registerRef}
            className={shake ? "bb-shake" : ""}
            style={{ display: "inline-block" }}
        >
            <BottleSVG
                bottle={bottle}
                width={width}
                height={height}
                onTap={onTap}
                disabled={disabled}
                tiltDeg={tilt}
                showHint={showHint}
            />
            <style>{`
                .bb-shake {
                    animation: bb-shake 0.35s ease-in-out;
                }
                @keyframes bb-shake {
                    0%, 100% { transform: translateX(0); }
                    20%      { transform: translateX(-4px); }
                    40%      { transform: translateX(4px); }
                    60%      { transform: translateX(-3px); }
                    80%      { transform: translateX(3px); }
                }
            `}</style>
        </div>
    );
}
