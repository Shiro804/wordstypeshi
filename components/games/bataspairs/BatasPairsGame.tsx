"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import GameShell from "@/components/shared/GameShell";
import GameResultOverlay from "@/components/games/common/GameResultOverlay";
import FloatingGameOver from "@/components/games/common/FloatingGameOver";
import {
    batasPairsEngine,
    getModeParams,
    type BatasPairsState,
} from "@/lib/games/bataspairs/engine";
import { calculateScore } from "@/lib/games/bataspairs/ruleset";
import { batasPairsUIAdapter, type BatasPairsRenderModel } from "@/lib/games/bataspairs/ui-adapter";
import { loadActiveGame, saveActiveGame } from "@/lib/storage/active-game-storage";
import { loadDifficulty, saveDifficulty } from "@/lib/storage/settings-storage";
import type { Difficulty } from "@/lib/difficulty";
import { getCurrentUserId, upsertRemoteGameStats, syncGameStats, loadLocalStats, saveLocalStats } from "@/lib/sync/game-stats-sync";
import { createOrReuseActiveSession, endSession } from "@/lib/sync/sessions-sync";
import Leaderboard from "@/components/games/common/Leaderboard";
import StatsModal, { StatCard } from "@/components/shared/StatsModal";
import { type Stats, applyGameResult, formatDuration } from "@/lib/storage/storage";
import { playDurationSec, useGameTimer } from "@/lib/hooks/useGameTimer";
import Modal from "../common/Modal";
import { useLanguage } from "@/lib/i18n";

// ============================================================================
// Constants & Mapping
// ============================================================================

const GAME_ID = "bataspairs";

const DIFFICULTY_TO_MODE = {
    easy: 'easy',
    medium: 'medium',
    hard: 'hard',
} as const;

type BatasPairsModeId = keyof typeof DIFFICULTY_TO_MODE;

/** Delay before hiding mismatched cards (ms) */
const MISMATCH_DELAY = 800;

// ============================================================================
// Sub-components
// ============================================================================

function MemoryCard({
    icon,
    status,
    onClick,
    disabled,
}: {
    icon: string;
    status: 'hidden' | 'revealed' | 'matched';
    onClick: () => void;
    disabled: boolean;
}) {
    const isVisible = status === 'revealed' || status === 'matched';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || status !== 'hidden'}
            className={`
                aspect-square rounded-xl
                transition-all duration-300
                transform-gpu
                ${status === 'matched'
                    ? 'bg-emerald-500/20 border-2 border-emerald-500/40 scale-95'
                    : isVisible
                        ? 'bg-[color:var(--surface2)] border-2 border-violet-500/50 scale-105'
                        : 'bg-[color:var(--surface)] border-2 border-[color:var(--border)] hover:border-violet-500/30 hover:bg-[color:var(--surface2)] cursor-pointer active:scale-95'
                }
                ${disabled && status === 'hidden' ? 'opacity-60 cursor-not-allowed' : ''}
            `}
            aria-label={isVisible ? `Card: ${icon}` : 'Hidden card'}
        >
            <span
                className={`
                    text-2xl sm:text-3xl md:text-4xl
                    transition-all duration-300
                    select-none
                    ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
                `}
            >
                {icon}
            </span>
        </button>
    );
}

// ============================================================================
// Main Game Component
// ============================================================================

export default function BatasPairsGame() {
    // State
    const [difficulty, setDifficulty] = useState<Difficulty>(() => loadDifficulty());
    const [gameState, setGameState] = useState<BatasPairsState | null>(null);

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

    // Game over animation states
    const [showFloatingText, setShowFloatingText] = useState(false);
    const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);

    // Mismatch resolution timer ref
    const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const gameStateRef = useRef<BatasPairsState | null>(null);
    const winRecordedRef = useRef(false);

    // Language
    const { t } = useLanguage();

    // Timer state
    const timer = useGameTimer();

    const scheduleResolveCheck = useCallback(() => {
        if (resolveTimerRef.current) {
            clearTimeout(resolveTimerRef.current);
        }
        resolveTimerRef.current = setTimeout(() => {
            setGameState(prev => {
                if (!prev || !prev.isChecking) return prev;
                const resolveResult = batasPairsEngine.applyAction(prev, { type: 'resolve_check' });
                gameStateRef.current = resolveResult.state;
                return resolveResult.state;
            });
            resolveTimerRef.current = null;
        }, MISMATCH_DELAY);
    }, []);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Derived
    const mode = DIFFICULTY_TO_MODE[difficulty];
    const params = useMemo(() => {
        return getModeParams(mode as BatasPairsModeId);
    }, [mode]);

    // Check if game is in progress
    const isInProgress = useMemo(() => {
        return gameState && !batasPairsEngine.isTerminal(gameState) && gameState.totalFlips > 0;
    }, [gameState]);

    // Initial Load
    useEffect(() => {
        getCurrentUserId().then(uid => setUserId(uid));
    }, []);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (resolveTimerRef.current) {
                clearTimeout(resolveTimerRef.current);
            }
        };
    }, []);

    // Load active game or init new one when params change
    useEffect(() => {
        const loadGame = async () => {
            const active = loadActiveGame<BatasPairsState>(GAME_ID, userId);
            const paramsMatch = active &&
                active.config.rows === params.rows &&
                active.config.cols === params.cols;

            if (paramsMatch && !batasPairsEngine.isTerminal(active)) {
                winRecordedRef.current = false;
                gameStateRef.current = active;
                setGameState(active);

                if (active.isChecking) {
                    scheduleResolveCheck();
                }

                if (active.totalFlips > 0) {
                    timer.setStartedAt(active.startedAtMs);
                    if (active.endedAtMs) {
                        timer.setEndedAt(active.endedAtMs);
                    }
                } else {
                    timer.reset();
                }

                if (userId) {
                    const session = await createOrReuseActiveSession({
                        userId,
                        gameId: GAME_ID,
                        difficulty,
                        answer: `${params.rows}x${params.cols}`,
                        startedAtMs: active.startedAtMs,
                    });
                    setSessionId(session?.id ?? null);
                }
            } else {
                winRecordedRef.current = false;
                const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const state = batasPairsEngine.init(newSeed, params);
                gameStateRef.current = state;
                setGameState(state);
                saveActiveGame(GAME_ID, state, userId);
                timer.reset();

                if (userId) {
                    const session = await createOrReuseActiveSession({
                        userId,
                        gameId: GAME_ID,
                        difficulty,
                        answer: `${params.rows}x${params.cols}`,
                        startedAtMs: state.startedAtMs,
                    });
                    setSessionId(session?.id ?? null);
                }
            }
        };

        loadGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, params]);

    // Save active game
    useEffect(() => {
        if (gameState) {
            saveActiveGame(GAME_ID, batasPairsEngine.isTerminal(gameState) ? null : gameState, userId);
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
        if (resolveTimerRef.current) {
            clearTimeout(resolveTimerRef.current);
            resolveTimerRef.current = null;
        }

        winRecordedRef.current = false;
        const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const state = batasPairsEngine.init(newSeed, params);
        gameStateRef.current = state;
        setGameState(state);
        saveActiveGame(GAME_ID, state, userId);
        timer.reset();

        if (userId) {
            const session = await createOrReuseActiveSession({
                userId,
                gameId: GAME_ID,
                difficulty,
                answer: `${params.rows}x${params.cols}`,
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

        if (sessionId) {
            await endSession({
                sessionId,
                outcome: "forfeit",
                guessesUsed: gameState.totalFlips,
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

    const handleCardClick = useCallback(async (position: number) => {
        const current = gameStateRef.current;
        if (!current || current.isChecking) return;

        const result = batasPairsEngine.applyAction(current, {
            type: 'flip_card',
            position,
        });
        if (result.invalidReason) return;

        gameStateRef.current = result.state;
        setGameState(result.state);

        // Start timer on first flip
        if (!timer.startedAtMs) {
            timer.start();
        }

        if (result.state.isChecking) {
            scheduleResolveCheck();
        }

        if (!batasPairsEngine.isTerminal(result.state) || winRecordedRef.current) return;
        winRecordedRef.current = true;

        timer.stop();
        const durationSec = playDurationSec(timer);

        const newStats = applyGameResult(stats, {
            outcome: "win",
            guessesUsed: result.state.totalFlips,
            durationSec,
        });

        const durationMs = playDurationSec(timer) * 1000;
        const score = calculateScore(result.state.mismatches, durationMs);
        newStats.bestScore = newStats.bestScore == null ? score : Math.max(newStats.bestScore, score);
        newStats.bestMismatches = newStats.bestMismatches == null
            ? result.state.mismatches
            : Math.min(newStats.bestMismatches, result.state.mismatches);

        setStats(newStats);
        saveLocalStats(GAME_ID, difficulty, newStats);

        if (userId) {
            upsertRemoteGameStats(userId, GAME_ID, difficulty, newStats);
        }

        if (sessionId) {
            await endSession({
                sessionId,
                outcome: "win",
                guessesUsed: result.state.totalFlips,
                durationSec,
                endedAtMs: result.state.endedAtMs!,
            });
            setSessionId(null);
        }
    }, [stats, difficulty, userId, sessionId, timer, scheduleResolveCheck]);

    const renderModel = useMemo((): BatasPairsRenderModel | null => {
        if (!gameState) return null;
        return batasPairsUIAdapter.toRenderModel(gameState) as BatasPairsRenderModel;
    }, [gameState]);

    // Trigger floating game over animation when game ends
    useEffect(() => {
        if (renderModel?.isTerminal) {
            setShowFloatingText(true);
        } else {
            setShowFloatingText(false);
            setShowGameOverOverlay(false);
        }
    }, [renderModel?.isTerminal]);

    const handleFloatingComplete = useCallback(() => {
        setShowFloatingText(false);
        setShowGameOverOverlay(true);
    }, []);

    if (!renderModel) {
        return (
            <GameShell gameId="bataspairs" gameName="BatasPairs" onNewGame={initGame}>
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
            gameName="BatasPairs"
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
            <div className="max-w-md mx-auto p-4 space-y-4 flex flex-col items-center">
                {/* Status bar */}
                {!renderModel.isTerminal && (
                    <div className="flex items-center gap-4 text-sm text-[color:var(--muted)]">
                        <span>
                            {data.matchesFound}/{data.numPairs} {t.bataspairs.pairsFound}
                        </span>
                        <span>•</span>
                        <span>
                            {data.mismatches} {t.bataspairs.mismatches}
                        </span>
                    </div>
                )}

                {/* Card Grid */}
                <div
                    className="grid gap-2 sm:gap-3 w-full"
                    style={{
                        gridTemplateColumns: `repeat(${data.cols}, 1fr)`,
                        maxWidth: `${data.cols * 80}px`,
                    }}
                >
                    {data.cards.map((card) => (
                        <MemoryCard
                            key={card.position}
                            icon={card.icon}
                            status={card.status}
                            onClick={() => handleCardClick(card.position)}
                            disabled={data.isChecking || renderModel.isTerminal}
                        />
                    ))}
                </div>
            </div>

            <StatsModal
                open={statsOpen}
                onClose={() => { setStatsOpen(false); if (renderModel.isTerminal) setShowGameOverOverlay(true); }}
                stats={stats}
                onLeaderboard={() => setLeaderboardOpen(true)}
                showDistribution={false}
            >
                <div className="grid grid-cols-2 gap-3">
                    <StatCard label={t.leaderboard.played} value={stats.played} />
                    <StatCard label={t.leaderboard.winRate} value={`${Math.round(stats.played ? (stats.wins / stats.played) * 100 : 0)}%`} />
                    <StatCard label={t.leaderboard.highScore} value={stats.bestScore == null ? "–" : stats.bestScore} />
                    <StatCard label={t.leaderboard.bestMismatches} value={stats.bestMismatches == null ? "–" : stats.bestMismatches} />
                    <StatCard
                        label={t.leaderboard.bestTime}
                        value={stats.bestTimeSec == null ? "–" : formatDuration(stats.bestTimeSec)}
                    />
                    <StatCard
                        label={t.leaderboard.avgTime}
                        value={stats.avgTimeSec == null ? "–" : formatDuration(stats.avgTimeSec)}
                    />
                </div>
            </StatsModal>

            <Leaderboard
                open={leaderboardOpen}
                onClose={() => { setLeaderboardOpen(false); if (renderModel.isTerminal) setShowGameOverOverlay(true); }}
                gameId={GAME_ID}
            />

            {/* Floating Game Over Animation */}
            <FloatingGameOver
                active={showFloatingText}
                text={t.common.youWin}
                outcome="win"
                duration={1500}
                onComplete={handleFloatingComplete}
            />

            {/* Game Result Overlay */}
            <GameResultOverlay
                open={showGameOverOverlay}
                outcome="win"
                title={t.common.youWin}
                subtitle={t.bataspairs.solvedIn
                    .replace('{flips}', String(data.totalFlips))
                    .replace('{mismatches}', String(data.mismatches))}
                onPlayAgain={initGame}
                onOpenStats={() => { setShowGameOverOverlay(false); setStatsOpen(true); }}
            />

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
