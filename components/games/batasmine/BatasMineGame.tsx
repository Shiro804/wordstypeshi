"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { RotateCcw, Flag } from "lucide-react";
import GameShell from "@/components/shared/GameShell";
import GameResultOverlay from "@/components/games/common/GameResultOverlay";
import FloatingGameOver from "@/components/games/common/FloatingGameOver";
import {
    batasMineEngine,
    getModeParams,
    type BatasMineState,
    type BatasMineAction
} from "@/lib/games/batasmine/engine";
import { calculateScore } from "@/lib/games/batasmine/ruleset";
import { batasMineUIAdapter, type BatasMineRenderModel } from "@/lib/games/batasmine/ui-adapter";
import { loadActiveGame, saveActiveGame } from "@/lib/storage/active-game-storage";
import { loadDifficulty, saveDifficulty } from "@/lib/storage/settings-storage";
import type { Difficulty } from "@/lib/difficulty";
import { getCurrentUserId, upsertRemoteGameStats, syncGameStats, loadLocalStats, saveLocalStats } from "@/lib/sync/game-stats-sync";
import { createOrReuseActiveSession, endSession } from "@/lib/sync/sessions-sync";
import Leaderboard from "@/components/games/common/Leaderboard";
import StatsModal from "@/components/shared/StatsModal";
import { type Stats, applyGameResult } from "@/lib/storage/storage";
import { useGameTimer } from "@/lib/hooks/useGameTimer";
import Modal from "../common/Modal";
import { useLanguage } from "@/lib/i18n";

// ============================================================================
// Constants & Mapping
// ============================================================================

const GAME_ID = "batasmine";

const DIFFICULTY_TO_MODE = {
    easy: 'easy',
    medium: 'medium',
    hard: 'hard',
} as const;

type BatasMineModeId = keyof typeof DIFFICULTY_TO_MODE;

/** Colors for adjacent mine numbers */
const NUMBER_COLORS: Record<number, string> = {
    1: 'text-blue-400',
    2: 'text-emerald-400',
    3: 'text-red-400',
    4: 'text-purple-400',
    5: 'text-amber-600',
    6: 'text-cyan-400',
    7: 'text-pink-400',
    8: 'text-gray-400',
};

/** Long press duration for flagging (ms) */
const LONG_PRESS_MS = 400;

// ============================================================================
// Sub-components
// ============================================================================

function MineCell({
    state,
    adjacentMines,
    onClick,
    onFlag,
    disabled,
    cellSize,
}: {
    state: 'hidden' | 'revealed' | 'flagged' | 'mine_exploded' | 'mine_revealed';
    adjacentMines: number;
    onClick: () => void;
    onFlag: () => void;
    disabled: boolean;
    cellSize: string;
}) {
    const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPress = useRef(false);

    const handlePointerDown = useCallback(() => {
        if (disabled || state === 'revealed') return;
        didLongPress.current = false;
        longPressRef.current = setTimeout(() => {
            didLongPress.current = true;
            onFlag();
        }, LONG_PRESS_MS);
    }, [disabled, state, onFlag]);

    const handlePointerUp = useCallback(() => {
        if (longPressRef.current) {
            clearTimeout(longPressRef.current);
            longPressRef.current = null;
        }
    }, []);

    const handleClick = useCallback(() => {
        if (didLongPress.current) return;
        onClick();
    }, [onClick]);

    useEffect(() => {
        return () => {
            if (longPressRef.current) clearTimeout(longPressRef.current);
        };
    }, []);

    const bgClass =
        state === 'revealed'
            ? 'bg-[color:var(--surface2)] border-[color:var(--border)]'
            : state === 'mine_exploded'
                ? 'bg-red-500/40 border-red-500'
                : state === 'mine_revealed'
                    ? 'bg-zinc-700/50 border-zinc-600'
                    : state === 'flagged'
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-[color:var(--surface)] border-[color:var(--border)] hover:bg-[color:var(--surface2)] cursor-pointer active:scale-95';

    return (
        <button
            type="button"
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onContextMenu={(e) => {
                e.preventDefault();
                if (!disabled && state !== 'revealed') onFlag();
            }}
            disabled={disabled && state !== 'hidden' && state !== 'flagged'}
            className={`
                ${cellSize} rounded-md border transition-all duration-150
                flex items-center justify-center select-none
                transform-gpu
                ${bgClass}
                ${disabled && (state === 'hidden' || state === 'flagged') ? 'opacity-60 cursor-not-allowed' : ''}
            `}
            aria-label={
                state === 'revealed'
                    ? adjacentMines > 0 ? `${adjacentMines} adjacent mines` : 'Empty cell'
                    : state === 'flagged' ? 'Flagged cell'
                        : state === 'mine_exploded' ? 'Mine (exploded)'
                            : state === 'mine_revealed' ? 'Mine'
                                : 'Hidden cell'
            }
        >
            {state === 'revealed' && adjacentMines > 0 && (
                <span className={`font-bold text-xs sm:text-sm ${NUMBER_COLORS[adjacentMines] || 'text-white'}`}>
                    {adjacentMines}
                </span>
            )}
            {state === 'flagged' && (
                <Flag size={12} className="text-amber-400" />
            )}
            {(state === 'mine_exploded' || state === 'mine_revealed') && (
                <span className="text-xs sm:text-sm">💣</span>
            )}
        </button>
    );
}

// ============================================================================
// Main Game Component
// ============================================================================

export default function BatasMineGame() {
    // State
    const [difficulty, setDifficulty] = useState<Difficulty>(() => loadDifficulty());
    const [gameState, setGameState] = useState<BatasMineState | null>(null);
    const [flagMode, setFlagMode] = useState(false);

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

    // Language
    const { t } = useLanguage();

    // Timer state
    const timer = useGameTimer();

    // Derived
    const mode = DIFFICULTY_TO_MODE[difficulty];
    const params = useMemo(() => {
        return getModeParams(mode as BatasMineModeId);
    }, [mode]);

    // Check if game is in progress
    const isInProgress = useMemo(() => {
        return gameState && !batasMineEngine.isTerminal(gameState) && gameState.cellsRevealed > 0;
    }, [gameState]);

    // Initial Load
    useEffect(() => {
        getCurrentUserId().then(uid => setUserId(uid));
    }, []);

    // Load active game or init new one when params change
    useEffect(() => {
        const loadGame = async () => {
            const active = loadActiveGame<BatasMineState>(GAME_ID, userId);
            const paramsMatch = active &&
                active.config.rows === params.rows &&
                active.config.cols === params.cols &&
                active.config.mines === params.mines;

            if (paramsMatch && !batasMineEngine.isTerminal(active)) {
                setGameState(active);

                if (active.cellsRevealed > 0) {
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
                        answer: `${params.rows}x${params.cols}:${params.mines}`,
                        startedAtMs: active.startedAtMs,
                    });
                    setSessionId(session?.id ?? null);
                }
            } else {
                const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const state = batasMineEngine.init(newSeed, params);
                setGameState(state);
                saveActiveGame(GAME_ID, state, userId);
                timer.reset();

                if (userId) {
                    const session = await createOrReuseActiveSession({
                        userId,
                        gameId: GAME_ID,
                        difficulty,
                        answer: `${params.rows}x${params.cols}:${params.mines}`,
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
            saveActiveGame(GAME_ID, batasMineEngine.isTerminal(gameState) ? null : gameState, userId);
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
        const state = batasMineEngine.init(newSeed, params);
        setGameState(state);
        saveActiveGame(GAME_ID, state, userId);
        timer.reset();
        setFlagMode(false);

        if (userId) {
            const session = await createOrReuseActiveSession({
                userId,
                gameId: GAME_ID,
                difficulty,
                answer: `${params.rows}x${params.cols}:${params.mines}`,
                startedAtMs: state.startedAtMs,
            });
            setSessionId(session?.id ?? null);
        }
    }, [params, userId, difficulty, timer]);

    const forfeitCurrentGame = useCallback(async () => {
        if (!gameState) return;
        timer.stop();
        const durationSec = Math.max(0, (Date.now() - gameState.startedAtMs) / 1000);
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
                guessesUsed: gameState.cellsRevealed,
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

    const handleCellClick = useCallback(async (position: number) => {
        if (!gameState || batasMineEngine.isTerminal(gameState)) return;

        const cell = gameState.grid[position];

        // In flag mode, toggle flag instead of reveal
        if (flagMode) {
            if (cell.state === 'revealed') return;
            const action: BatasMineAction = { type: 'toggle_flag', position };
            const result = batasMineEngine.applyAction(gameState, action);
            if (!result.invalidReason) {
                setGameState(result.state);
            }
            return;
        }

        const action: BatasMineAction = { type: 'reveal', position };
        const result = batasMineEngine.applyAction(gameState, action);
        if (result.invalidReason) return;

        // Start timer on first reveal
        if (!timer.startedAtMs) {
            timer.start();
        }

        setGameState(result.state);

        // Check completion
        if (batasMineEngine.isTerminal(result.state)) {
            timer.stop();
            const durationSec = (result.state.endedAtMs! - result.state.startedAtMs) / 1000;
            const isWin = result.state.status === 'won';

            const newStats = applyGameResult(stats, isWin
                ? { outcome: 'win', guessesUsed: result.state.cellsRevealed, durationSec }
                : { outcome: 'lose', durationSec }
            );

            // BatasMine-specific: track best score on wins
            if (isWin) {
                const durationMs = result.state.endedAtMs! - result.state.startedAtMs;
                const score = calculateScore(result.state.cellsRevealed, durationMs);
                newStats.bestScore = newStats.bestScore == null ? score : Math.max(newStats.bestScore, score);
            }

            setStats(newStats);
            saveLocalStats(GAME_ID, difficulty, newStats);

            if (userId) {
                upsertRemoteGameStats(userId, GAME_ID, difficulty, newStats);
            }

            if (sessionId) {
                await endSession({
                    sessionId,
                    outcome: isWin ? 'win' : 'lose',
                    guessesUsed: result.state.cellsRevealed,
                    durationSec,
                    endedAtMs: result.state.endedAtMs!,
                });
                setSessionId(null);
            }
        }
    }, [gameState, flagMode, stats, difficulty, userId, sessionId, timer]);

    const handleCellFlag = useCallback((position: number) => {
        if (!gameState || batasMineEngine.isTerminal(gameState)) return;

        const action: BatasMineAction = { type: 'toggle_flag', position };
        const result = batasMineEngine.applyAction(gameState, action);
        if (!result.invalidReason) {
            setGameState(result.state);
        }
    }, [gameState]);

    const renderModel = useMemo((): BatasMineRenderModel | null => {
        if (!gameState) return null;
        return batasMineUIAdapter.toRenderModel(gameState) as BatasMineRenderModel;
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

    // Determine cell size based on grid dimensions
    const cellSize = useMemo(() => {
        if (!params) return 'w-8 h-8';
        if (params.cols <= 8) return 'w-9 h-9 sm:w-10 sm:h-10';
        if (params.cols <= 12) return 'w-7 h-7 sm:w-8 sm:h-8';
        return 'w-5 h-5 sm:w-6 sm:h-6';
    }, [params]);

    if (!renderModel) {
        return (
            <GameShell gameId="batasmine" gameName="BatasMine" onNewGame={initGame}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse text-[color:var(--fg)]">Loading...</div>
                </div>
            </GameShell>
        );
    }

    const { data } = renderModel;
    const outcome = renderModel.status === 'won' ? 'win' : 'lose';

    return (
        <GameShell
            gameId={GAME_ID}
            gameName="BatasMine"
            onNewGame={requestReset}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenStats={() => setStatsOpen(true)}
            difficulty={difficulty}
            onDifficultyChange={requestDifficultyChange}
            timerText={timer.timerText}
            actionsSlot={
                <div className="flex items-center gap-1">
                    {/* Flag mode toggle */}
                    <button
                        type="button"
                        onClick={() => setFlagMode(f => !f)}
                        title={flagMode ? t.batasmine.flagModeOn : t.batasmine.flagModeOff}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                            flagMode
                                ? 'border-amber-500/50 bg-amber-500/20 text-amber-400'
                                : 'border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] hover:bg-[color:var(--surface2)]'
                        }`}
                    >
                        <Flag size={16} />
                    </button>
                    {isInProgress ? (
                        <button
                            type="button"
                            onClick={() => setConfirmResetOpen(true)}
                            title="Reset"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                        >
                            <RotateCcw size={16} />
                        </button>
                    ) : null}
                </div>
            }
        >
            <div className="max-w-lg mx-auto p-4 space-y-3 flex flex-col items-center">
                {/* Status bar */}
                {!renderModel.isTerminal && (
                    <div className="flex items-center gap-4 text-sm text-[color:var(--muted)]">
                        <span className="flex items-center gap-1">
                            💣 {data.remainingMines}
                        </span>
                        <span>•</span>
                        <span>
                            {data.cellsRevealed}/{data.totalSafe} {t.batasmine.cellsRevealed}
                        </span>
                    </div>
                )}

                {/* Mine Grid */}
                <div
                    className="grid gap-0.5 sm:gap-1 w-fit"
                    style={{
                        gridTemplateColumns: `repeat(${data.cols}, 1fr)`,
                    }}
                >
                    {data.cells.map((cell) => (
                        <MineCell
                            key={cell.position}
                            state={cell.state}
                            adjacentMines={cell.adjacentMines}
                            onClick={() => handleCellClick(cell.position)}
                            onFlag={() => handleCellFlag(cell.position)}
                            disabled={renderModel.isTerminal}
                            cellSize={cellSize}
                        />
                    ))}
                </div>
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

            {/* Floating Game Over Animation */}
            <FloatingGameOver
                active={showFloatingText}
                text={renderModel.status === 'won' ? t.common.youWin : t.common.youLose}
                outcome={outcome as 'win' | 'lose'}
                duration={1500}
                onComplete={handleFloatingComplete}
            />

            {/* Game Result Overlay */}
            <GameResultOverlay
                open={showGameOverOverlay}
                outcome={outcome as 'win' | 'lose'}
                title={renderModel.status === 'won' ? t.common.youWin : t.common.gameOver}
                subtitle={renderModel.status === 'won'
                    ? t.batasmine.solvedIn
                        .replace('{cells}', String(data.cellsRevealed))
                        .replace('{time}', timer.timerText)
                    : t.batasmine.hitMine}
                onPlayAgain={initGame}
                onOpenStats={() => setStatsOpen(true)}
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
