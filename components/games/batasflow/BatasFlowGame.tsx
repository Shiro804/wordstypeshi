"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import GameShell from "@/components/shared/GameShell";
import GameResultOverlay from "@/components/games/common/GameResultOverlay";
import FloatingGameOver from "@/components/games/common/FloatingGameOver";
import {
    batasFlowEngine,
    type BatasFlowState,
    type BatasFlowAction,
    type BatasFlowParams,
} from "@/lib/games/batasflow/engine";
import { calculateScore, BATASFLOW_MODES, FLOW_COLORS, type BatasFlowModeId } from "@/lib/games/batasflow/ruleset";
import { batasFlowUIAdapter, type BatasFlowRenderModel, type FlowCellRenderData } from "@/lib/games/batasflow/ui-adapter";
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

const GAME_ID = "batasflow";

const DIFFICULTY_TO_MODE = {
    easy: 'easy',
    medium: 'medium',
    hard: 'hard',
} as const;

function getModeParams(modeId: BatasFlowModeId): BatasFlowParams {
    return { gridSize: BATASFLOW_MODES[modeId].gridSize };
}

// ============================================================================
// Helpers
// ============================================================================

/** Get border-radius style for a path cell based on its neighbors */
function getPathBorderRadius(
    grid: FlowCellRenderData[][],
    row: number,
    col: number,
    gridSize: number,
): string {
    const cell = grid[row][col];
    if (!cell.color) return '0px';

    const sameColor = (r: number, c: number) => {
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return false;
        return grid[r][c].color === cell.color;
    };

    const top = sameColor(row - 1, col);
    const bottom = sameColor(row + 1, col);
    const left = sameColor(row, col - 1);
    const right = sameColor(row, col + 1);

    const r = '50%';
    const s = '4px';

    // All four corners: if the neighbor in that direction is NOT the same color, round it
    const tl = (!top && !left) ? r : s;
    const tr = (!top && !right) ? r : s;
    const bl = (!bottom && !left) ? r : s;
    const br = (!bottom && !right) ? r : s;

    return `${tl} ${tr} ${br} ${bl}`;
}

// ============================================================================
// Sub-components
// ============================================================================

function FlowCell({
    cell,
    row,
    col,
    gridSize,
    grid,
    isTerminal,
    completedFlowJustNow,
}: {
    cell: FlowCellRenderData;
    row: number;
    col: number;
    gridSize: number;
    grid: FlowCellRenderData[][];
    isTerminal: boolean;
    completedFlowJustNow: boolean;
}) {
    const isEmpty = !cell.color;
    const borderRadius = cell.isDot ? '50%' : getPathBorderRadius(grid, row, col, gridSize);

    return (
        <div
            className="relative flex items-center justify-center transition-colors duration-200"
            style={{
                backgroundColor: isEmpty
                    ? 'rgba(255,255,255,0.03)'
                    : cell.color ?? undefined,
                borderRadius,
                opacity: isTerminal ? 0.9 : 1,
                boxShadow: cell.isDot
                    ? `0 0 8px ${cell.color}80, inset 0 1px 2px rgba(255,255,255,0.2)`
                    : cell.isCurrentPath
                        ? `0 0 6px ${cell.color}60`
                        : 'none',
            }}
        >
            {/* Dot indicator */}
            {cell.isDot && (
                <div
                    className="absolute rounded-full"
                    style={{
                        width: '60%',
                        height: '60%',
                        backgroundColor: 'rgba(255,255,255,0.25)',
                    }}
                />
            )}

            {/* Active path pulse */}
            {cell.isCurrentPath && !cell.isDot && (
                <div
                    className="absolute inset-0 animate-pulse rounded-sm"
                    style={{
                        backgroundColor: `${cell.color}30`,
                        borderRadius,
                    }}
                />
            )}

            {/* Flow completion flash */}
            {completedFlowJustNow && cell.color && (
                <div
                    className="absolute inset-0 animate-ping"
                    style={{
                        backgroundColor: `${cell.color}40`,
                        borderRadius,
                        animationDuration: '600ms',
                        animationIterationCount: '1',
                    }}
                />
            )}
        </div>
    );
}

// ============================================================================
// Main Game Component
// ============================================================================

export default function BatasFlowGame() {
    // State
    const [difficulty, setDifficulty] = useState<Difficulty>(() => loadDifficulty());
    const [gameState, setGameState] = useState<BatasFlowState | null>(null);

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

    // Drawing state (pointer tracking)
    const isDrawingRef = useRef(false);
    const gridRef = useRef<HTMLDivElement>(null);

    // Track recently completed flows for animation
    const [completedFlashIds, setCompletedFlashIds] = useState<Set<number>>(new Set());

    // Language
    const { t } = useLanguage();

    // Timer state
    const timer = useGameTimer();

    // Derived
    const mode = DIFFICULTY_TO_MODE[difficulty];
    const params = useMemo(() => {
        return getModeParams(mode as BatasFlowModeId);
    }, [mode]);

    // Check if game is in progress
    const isInProgress = useMemo(() => {
        return gameState && !batasFlowEngine.isTerminal(gameState) && gameState.moveCount > 0;
    }, [gameState]);

    // Initial Load
    useEffect(() => {
        getCurrentUserId().then(uid => setUserId(uid));
    }, []);

    // Load active game or init new one when params change
    useEffect(() => {
        const loadGame = async () => {
            const active = loadActiveGame<BatasFlowState>(GAME_ID, userId);
            const paramsMatch = active && active.gridSize === params.gridSize;

            if (paramsMatch && !batasFlowEngine.isTerminal(active)) {
                setGameState(active);

                if (active.moveCount > 0) {
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
                        answer: `${params.gridSize}x${params.gridSize}`,
                        startedAtMs: active.startedAtMs,
                    });
                    setSessionId(session?.id ?? null);
                }
            } else {
                const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const state = batasFlowEngine.init(newSeed, params);
                setGameState(state);
                saveActiveGame(GAME_ID, state, userId);
                timer.reset();

                if (userId) {
                    const session = await createOrReuseActiveSession({
                        userId,
                        gameId: GAME_ID,
                        difficulty,
                        answer: `${params.gridSize}x${params.gridSize}`,
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
            saveActiveGame(GAME_ID, batasFlowEngine.isTerminal(gameState) ? null : gameState, userId);
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
        const state = batasFlowEngine.init(newSeed, params);
        setGameState(state);
        saveActiveGame(GAME_ID, state, userId);
        timer.reset();
        setCompletedFlashIds(new Set());

        if (userId) {
            const session = await createOrReuseActiveSession({
                userId,
                gameId: GAME_ID,
                difficulty,
                answer: `${params.gridSize}x${params.gridSize}`,
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
                guessesUsed: gameState.moveCount,
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

    // ========================================================================
    // Game Actions
    // ========================================================================

    const handleGameEnd = useCallback(async (state: BatasFlowState) => {
        timer.stop();
        const durationSec = (state.endedAtMs! - state.startedAtMs) / 1000;
        const durationMs = state.endedAtMs! - state.startedAtMs;

        const newStats = applyGameResult(stats, {
            outcome: "win",
            guessesUsed: state.moveCount,
            durationSec,
        });

        const score = calculateScore(state.moveCount, durationMs);
        newStats.bestScore = newStats.bestScore == null ? score : Math.max(newStats.bestScore, score);

        setStats(newStats);
        saveLocalStats(GAME_ID, difficulty, newStats);

        if (userId) {
            upsertRemoteGameStats(userId, GAME_ID, difficulty, newStats);
        }

        if (sessionId) {
            await endSession({
                sessionId,
                outcome: "win",
                guessesUsed: state.moveCount,
                durationSec,
                endedAtMs: state.endedAtMs!,
            });
            setSessionId(null);
        }
    }, [stats, difficulty, userId, sessionId, timer]);

    const applyEngineAction = useCallback((action: BatasFlowAction) => {
        setGameState(prev => {
            if (!prev || batasFlowEngine.isTerminal(prev)) return prev;

            const result = batasFlowEngine.applyAction(prev, action);
            if (result.invalidReason) return prev;

            // Start timer on first move
            if (!timer.startedAtMs && result.state.moveCount > 0) {
                timer.start();
            }

            // Check for flow completion event (for flash animation)
            for (const event of result.events) {
                if (event.type === 'path_finished') {
                    const pairId = (event.payload as { pairId: number }).pairId;
                    setCompletedFlashIds(s => {
                        const next = new Set(s);
                        next.add(pairId);
                        return next;
                    });
                    setTimeout(() => {
                        setCompletedFlashIds(s => {
                            const next = new Set(s);
                            next.delete(pairId);
                            return next;
                        });
                    }, 600);
                }
            }

            // Check terminal
            if (batasFlowEngine.isTerminal(result.state)) {
                handleGameEnd(result.state);
            }

            return result.state;
        });
    }, [timer, handleGameEnd]);

    // ========================================================================
    // Pointer / Touch Input Handling
    // ========================================================================

    const getCellFromPoint = useCallback((clientX: number, clientY: number): { row: number; col: number } | null => {
        if (!gridRef.current || !gameState) return null;
        const rect = gridRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const gridSize = gameState.gridSize;
        const cellW = rect.width / gridSize;
        const cellH = rect.height / gridSize;
        const col = Math.floor(x / cellW);
        const row = Math.floor(y / cellH);
        if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;
        return { row, col };
    }, [gameState]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (!gameState || batasFlowEngine.isTerminal(gameState)) return;
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

        const pos = getCellFromPoint(e.clientX, e.clientY);
        if (!pos) return;

        // Check if tapping an existing path (tap-to-clear)
        const ensured = ensureMapsForState(gameState);
        const grid = ensured.grid;
        const cellValue = grid[pos.row][pos.col];

        // Find if this is a dot
        const dot = ensured.dots.find(d => d.row === pos.row && d.col === pos.col);

        if (dot) {
            // Start a new path from this dot
            isDrawingRef.current = true;
            applyEngineAction({ type: 'start_path', row: pos.row, col: pos.col });
        } else if (cellValue !== null) {
            // Tap on existing path cell → clear that flow
            applyEngineAction({ type: 'clear_path', pairId: cellValue });
        }
    }, [gameState, getCellFromPoint, applyEngineAction]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDrawingRef.current || !gameState) return;
        e.preventDefault();

        const pos = getCellFromPoint(e.clientX, e.clientY);
        if (!pos) return;

        const ensured = ensureMapsForState(gameState);

        // Only extend if we have an active path
        if (!ensured.currentPath) return;

        const lastCell = ensured.currentPath.cells[ensured.currentPath.cells.length - 1];
        if (lastCell.row === pos.row && lastCell.col === pos.col) return;

        // Check adjacency
        const dr = Math.abs(pos.row - lastCell.row);
        const dc = Math.abs(pos.col - lastCell.col);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
            applyEngineAction({ type: 'extend_path', row: pos.row, col: pos.col });
        }
    }, [gameState, getCellFromPoint, applyEngineAction]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (!isDrawingRef.current) return;
        e.preventDefault();
        isDrawingRef.current = false;

        if (!gameState) return;

        const ensured = ensureMapsForState(gameState);
        if (ensured.currentPath) {
            // Try to finish the path
            const result = batasFlowEngine.applyAction(ensured, { type: 'finish_path' });
            if (result.invalidReason) {
                // Path doesn't connect both dots — keep it as an incomplete path
                // or clear it. In Flow games, incomplete paths stay visible.
                // We'll just save what we have (the engine keeps currentPath).
                // Actually, we need to commit the partial path or clear it.
                // Standard Flow behavior: path stays but isn't committed as complete.
                // The engine clears currentPath on finish only. We commit the partial path
                // by clearing the currentPath and saving cells into paths map without marking complete.
                // For simplicity: just clear the current path since it's incomplete.
                applyEngineAction({ type: 'clear_path', pairId: ensured.currentPath.pairId });
            } else {
                applyEngineAction({ type: 'finish_path' });
            }
        }
    }, [gameState, applyEngineAction]);

    // ========================================================================
    // Render Model
    // ========================================================================

    const renderModel = useMemo((): BatasFlowRenderModel | null => {
        if (!gameState) return null;
        return batasFlowUIAdapter.toRenderModel(gameState) as BatasFlowRenderModel;
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
            <GameShell gameId={GAME_ID} gameName="BatasFlow" onNewGame={initGame}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse text-[color:var(--fg)]">Loading...</div>
                </div>
            </GameShell>
        );
    }

    const { data } = renderModel;

    // Flow color legend
    const flowColors = gameState?.dots
        ? Array.from(new Set(gameState.dots.map(d => d.pairId))).map(pairId => {
            const dot = gameState.dots.find(d => d.pairId === pairId);
            return { pairId, color: dot?.color ?? FLOW_COLORS[pairId % FLOW_COLORS.length] };
        })
        : [];

    return (
        <GameShell
            gameId={GAME_ID}
            gameName="BatasFlow"
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
                            {data.completedFlows}/{data.totalFlows} {t.batasflow.flowsConnected}
                        </span>
                        <span>-</span>
                        <span>
                            {data.moveCount} {t.common.moves}
                        </span>
                    </div>
                )}

                {/* Flow Grid */}
                <div
                    ref={gridRef}
                    className="w-full aspect-square select-none touch-none"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${data.gridSize}, 1fr)`,
                        gap: '2px',
                        maxWidth: `${Math.max(data.gridSize * 48, 280)}px`,
                        padding: '2px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        borderRadius: '12px',
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={() => { isDrawingRef.current = false; }}
                >
                    {data.grid.map((row, r) =>
                        row.map((cell, c) => {
                            const cellPairId = gameState?.grid[r][c];
                            return (
                                <FlowCell
                                    key={`${r}-${c}`}
                                    cell={cell}
                                    row={r}
                                    col={c}
                                    gridSize={data.gridSize}
                                    grid={data.grid}
                                    isTerminal={renderModel.isTerminal}
                                    completedFlowJustNow={cellPairId != null && completedFlashIds.has(cellPairId)}
                                />
                            );
                        })
                    )}
                </div>

                {/* Flow legend */}
                {!renderModel.isTerminal && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {flowColors.map(({ pairId, color }) => {
                            const isComplete = renderModel.data.completedFlows > 0 &&
                                gameState &&
                                (gameState.completedFlows instanceof Set
                                    ? gameState.completedFlows.has(pairId)
                                    : (gameState.completedFlows as unknown as number[]).includes?.(pairId));
                            return (
                                <div
                                    key={pairId}
                                    className="w-4 h-4 rounded-full transition-all duration-300"
                                    style={{
                                        backgroundColor: color,
                                        opacity: isComplete ? 1 : 0.4,
                                        boxShadow: isComplete ? `0 0 6px ${color}` : 'none',
                                        transform: isComplete ? 'scale(1.1)' : 'scale(1)',
                                    }}
                                />
                            );
                        })}
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
                subtitle={t.batasflow.solvedIn
                    .replace('{moves}', String(data.moveCount))
                    .replace('{flows}', String(data.totalFlows))}
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

// ============================================================================
// Helpers (serialization)
// ============================================================================

function ensureMapsForState(state: BatasFlowState): BatasFlowState {
    if (state.paths instanceof Map && state.completedFlows instanceof Set) {
        return state;
    }
    const rawPaths = state.paths as unknown;
    const rawCompleted = state.completedFlows as unknown;

    let paths: Map<number, { row: number; col: number }[]>;
    if (rawPaths instanceof Map) {
        paths = rawPaths;
    } else if (rawPaths && typeof rawPaths === 'object' && '__mapEntries' in rawPaths && Array.isArray((rawPaths as { __mapEntries: unknown }).__mapEntries)) {
        paths = new Map((rawPaths as { __mapEntries: [number, { row: number; col: number }[]][] }).__mapEntries);
    } else if (rawPaths && typeof rawPaths === 'object') {
        const entries = Object.entries(rawPaths as Record<string, { row: number; col: number }[]>);
        paths = new Map(entries.filter(([, v]) => Array.isArray(v)).map(([k, v]) => [Number(k), v]));
    } else {
        paths = new Map();
    }

    let completedFlows: Set<number>;
    if (rawCompleted instanceof Set) {
        completedFlows = rawCompleted;
    } else if (rawCompleted && typeof rawCompleted === 'object' && '__setValues' in rawCompleted && Array.isArray((rawCompleted as { __setValues: unknown }).__setValues)) {
        completedFlows = new Set((rawCompleted as { __setValues: number[] }).__setValues);
    } else if (Array.isArray(rawCompleted)) {
        completedFlows = new Set(rawCompleted);
    } else {
        completedFlows = new Set();
    }

    return { ...state, paths, completedFlows };
}
