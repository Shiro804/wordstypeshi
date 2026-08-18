"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Flame, Zap, Sparkles, X } from "lucide-react";
import GameShell from "@/components/shared/GameShell";
import GameResultOverlay from "@/components/games/common/GameResultOverlay";
import FloatingGameOver from "@/components/games/common/FloatingGameOver";
import {
    batasBlastEngine,
    type BatasBlastState,
    type BatasBlastAction,
    type BatasBlastParams,
    canPlacePiece,
    ensureColorBoard,
    PIECE_BY_ID,
    BOARD,
} from "@/lib/games/batasblast";
import { batasBlastUIAdapter, type BatasBlastRenderModel, type TrayPieceRender } from "@/lib/games/batasblast/ui-adapter";
import { loadActiveGame, saveActiveGame } from "@/lib/storage/active-game-storage";
import { getCurrentUserId, upsertRemoteGameStats, syncGameStats, loadLocalStats, saveLocalStats } from "@/lib/sync/game-stats-sync";
import { createOrReuseActiveSession, endSession } from "@/lib/sync/sessions-sync";
import Leaderboard from "@/components/games/common/Leaderboard";
import StatsModal from "@/components/shared/StatsModal";
import { type Stats, applyGameResult } from "@/lib/storage/storage";
import { playDurationSec, useGameTimer } from "@/lib/hooks/useGameTimer";
import Modal from "../common/Modal";
import type { CellOffset } from "@/lib/games/batasblast/ruleset";
import { useLanguage } from "@/lib/i18n";

// ============================================================================
// Constants
// ============================================================================

const GAME_ID = "batasblast";
const CELL_SIZE = 38; // px - base size, will be scaled responsively
const CELL_GAP = 3; // px
const TRAY_CELL_SIZE = 18;
const TRAY_CELL_GAP = 2;

// Calculate a scale factor to fit the game content in the available viewport
function getResponsiveScale(): number {
    if (typeof window === 'undefined') return 1;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Base content dimensions at scale 1.0:
    // Header ~50px is outside this container (rendered by GameShell)
    // Score area: ~100px, LinePopup: ~32px, Board: 8*38 + 7*3 + padding = ~360px, 
    // Gap: ~20px, Tray: ~100px, Instructions: ~30px, Bottom padding: ~20px
    // Total inside container = ~660px
    const baseContentHeight = 700;
    const baseContentWidth = 400; // board(360) + horizontal padding

    // Subtract header height from viewport since header is outside our scaled container
    const availableHeight = viewportHeight - 55; // header height

    const heightScale = availableHeight / baseContentHeight;
    const widthScale = viewportWidth / baseContentWidth;

    // Use the smaller scale to fit both dimensions
    // Allow scaling down to 0.5 for very small screens, cap at 1.0 for large screens
    return Math.max(0.5, Math.min(1.0, Math.min(heightScale, widthScale)));
}

// Color palette for blocks
const BLOCK_COLORS = [
    { from: "from-amber-400", to: "to-orange-500", hex: "#f59e0b" },
    { from: "from-emerald-400", to: "to-teal-500", hex: "#34d399" },
    { from: "from-violet-400", to: "to-purple-500", hex: "#a78bfa" },
    { from: "from-rose-400", to: "to-pink-500", hex: "#fb7185" },
    { from: "from-cyan-400", to: "to-blue-500", hex: "#22d3ee" },
];

// ============================================================================
// Sub-components
// ============================================================================

/** Single cell on the board with stone texture */
function Cell({
    filled,
    preview,
    invalid,
    blasting,
    colorIndex = 0,
}: {
    filled: boolean;
    preview?: boolean;
    invalid?: boolean;
    blasting?: boolean;
    colorIndex?: number;
}) {
    const colors = BLOCK_COLORS[colorIndex % BLOCK_COLORS.length];

    return (
        <div
            className={`
        rounded-lg transition-all duration-150 relative overflow-hidden
        ${filled
                    ? `bg-gradient-to-br ${colors.from} ${colors.to}`
                    : "bg-zinc-800/60 border border-zinc-700/50"
                }
        ${preview && !filled ? `bg-gradient-to-br ${colors.from} ${colors.to} opacity-90 border-2 border-emerald-300 shadow-[0_0_20px_rgba(110,231,183,0.6)]` : ""}
        ${invalid ? "bg-red-500/40 border-2 border-red-500/90 shadow-[0_0_15px_rgba(239,68,68,0.4)]" : ""}
        ${blasting ? "animate-pulse scale-110 brightness-150" : ""}
      `}
            style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                boxShadow: filled
                    ? 'inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)'
                    : undefined,
            }}
        >
            {/* Stone texture overlay for filled cells */}
            {filled && (
                <>
                    {/* Top-left highlight */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-lg" />
                    {/* Bottom-right shadow */}
                    <div className="absolute inset-0 bg-gradient-to-tl from-black/20 via-transparent to-transparent rounded-lg" />
                    {/* Center shine */}
                    <div className="absolute top-1 left-1 w-2 h-2 bg-white/50 rounded-full blur-[2px]" />
                </>
            )}
        </div>
    );
}

/** Floating ghost that follows the finger/cursor */
function FloatingGhost({
    cells,
    colorIndex,
    position,
}: {
    cells: CellOffset[];
    colorIndex: number;
    position: { x: number; y: number } | null;
}) {
    if (!position || cells.length === 0) return null;

    const minR = Math.min(...cells.map(c => c.dr));
    const maxR = Math.max(...cells.map(c => c.dr));
    const minC = Math.min(...cells.map(c => c.dc));
    const maxC = Math.max(...cells.map(c => c.dc));
    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;

    const ghostCellSize = 34; // Slightly smaller than board cells
    const ghostGap = 2;
    const colors = BLOCK_COLORS[colorIndex % BLOCK_COLORS.length];

    // Center the ghost under the cursor
    const offsetX = (cols * (ghostCellSize + ghostGap)) / 2;
    const offsetY = (rows * (ghostCellSize + ghostGap)) / 2;

    return (
        <div
            className="fixed pointer-events-none z-[200]"
            style={{
                left: position.x - offsetX,
                top: position.y - offsetY,
                opacity: 0.85,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, ${ghostCellSize}px)`,
                    gridTemplateRows: `repeat(${rows}, ${ghostCellSize}px)`,
                    gap: ghostGap,
                }}
            >
                {Array.from({ length: rows * cols }).map((_, i) => {
                    const r = Math.floor(i / cols);
                    const c = i % cols;
                    const isFilled = cells.some(
                        cell => cell.dr - minR === r && cell.dc - minC === c
                    );
                    return (
                        <div
                            key={i}
                            className={`rounded-lg relative overflow-hidden ${isFilled ? `bg-gradient-to-br ${colors.from} ${colors.to}` : ""}`}
                            style={{
                                width: ghostCellSize,
                                height: ghostCellSize,
                                boxShadow: isFilled
                                    ? 'inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.3)'
                                    : undefined,
                            }}
                        >
                            {isFilled && (
                                <>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-lg" />
                                    <div className="absolute inset-0 bg-gradient-to-tl from-black/20 via-transparent to-transparent rounded-lg" />
                                    <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white/50 rounded-full blur-[1px]" />
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/** Floating ghost piece that aligns with board grid */
function GhostPiece({
    cells,
    colorIndex,
    hoverOrigin,
    boardRef,
    scale,
}: {
    cells: CellOffset[];
    colorIndex: number;
    hoverOrigin: { r: number; c: number } | null;
    boardRef: React.RefObject<HTMLDivElement | null>;
    scale: number;
}) {
    if (!hoverOrigin || cells.length === 0 || !boardRef.current) return null;

    const rect = boardRef.current.getBoundingClientRect();
    const cellTotal = CELL_SIZE + CELL_GAP;
    const cellSize = CELL_SIZE * scale;
    const cellGap = CELL_GAP * scale;

    // Find the bounding box of the piece cells
    const minR = Math.min(...cells.map(c => c.dr));
    const minC = Math.min(...cells.map(c => c.dc));
    const maxR = Math.max(...cells.map(c => c.dr));
    const maxC = Math.max(...cells.map(c => c.dc));
    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;

    const colors = BLOCK_COLORS[colorIndex % BLOCK_COLORS.length];

    // rect is CSS-scaled; padding and cell pitch are layout (unscaled) units
    const boardPadding = 12; // p-3 = 0.75rem = 12px
    const left = rect.left + (boardPadding + (hoverOrigin.c + minC) * cellTotal) * scale;
    const top = rect.top + (boardPadding + (hoverOrigin.r + minR) * cellTotal) * scale;

    return (
        <div
            className="fixed pointer-events-none z-[100] opacity-70"
            style={{
                left,
                top,
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                    gap: cellGap,
                }}
            >
                {Array.from({ length: rows * cols }).map((_, i) => {
                    const r = Math.floor(i / cols);
                    const c = i % cols;
                    const isFilled = cells.some(
                        cell => cell.dr - minR === r && cell.dc - minC === c
                    );
                    return (
                        <div
                            key={i}
                            className={`
                rounded-lg shadow-lg
                ${isFilled
                                    ? `bg-gradient-to-br ${colors.from} ${colors.to}`
                                    : "bg-transparent"
                                }
              `}
                            style={{ width: cellSize, height: cellSize }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

/** A piece in the tray - draggable */
function TrayPieceDisplay({
    piece,
    selected,
    isDragging,
    onSelect,
    onDragStart,
    colorIndex,
}: {
    piece: TrayPieceRender;
    selected: boolean;
    isDragging: boolean;
    onSelect: () => void;
    onDragStart: (e: React.PointerEvent) => void;
    colorIndex: number;
}) {
    if (piece.used) {
        return (
            <div className="w-24 h-24 rounded-xl bg-zinc-800/30 border border-zinc-700/30 flex items-center justify-center">
                <X className="w-6 h-6 text-zinc-600" />
            </div>
        );
    }

    const minR = Math.min(...piece.cells.map(c => c.dr));
    const maxR = Math.max(...piece.cells.map(c => c.dr));
    const minC = Math.min(...piece.cells.map(c => c.dc));
    const maxC = Math.max(...piece.cells.map(c => c.dc));
    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;
    const colors = BLOCK_COLORS[colorIndex % BLOCK_COLORS.length];

    return (
        <button
            type="button"
            onClick={onSelect}
            onPointerDown={onDragStart}
            disabled={!piece.canPlace}
            className={`
        p-3 rounded-xl transition-all duration-200 min-w-[96px] min-h-[96px]
        flex items-center justify-center touch-none select-none
        ${selected
                    ? "bg-emerald-500/20 ring-2 ring-emerald-400 scale-105 shadow-lg shadow-emerald-500/20"
                    : "bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50"
                }
        ${isDragging ? "opacity-50 scale-95" : ""}
        ${!piece.canPlace ? "opacity-40 cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}
      `}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, ${TRAY_CELL_SIZE}px)`,
                    gridTemplateRows: `repeat(${rows}, ${TRAY_CELL_SIZE}px)`,
                    gap: TRAY_CELL_GAP,
                }}
            >
                {Array.from({ length: rows * cols }).map((_, i) => {
                    const r = Math.floor(i / cols);
                    const c = i % cols;
                    const isFilled = piece.cells.some(
                        cell => cell.dr - minR === r && cell.dc - minC === c
                    );
                    return (
                        <div
                            key={i}
                            className={`
                rounded-sm
                ${isFilled
                                    ? `bg-gradient-to-br ${colors.from} ${colors.to} shadow-sm`
                                    : "bg-transparent"
                                }
              `}
                            style={{ width: TRAY_CELL_SIZE, height: TRAY_CELL_SIZE }}
                        />
                    );
                })}
            </div>
        </button>
    );
}

/** Score display */
function ScoreDisplay({
    score,
    comboStreak,
    roundStreak,
    popups,
    highscore = 0,
    translations,
}: {
    score: number;
    comboStreak: number;
    roundStreak: number;
    popups: Array<{ id: number; value: number }>;
    highscore?: number;
    translations: { score: string; best: string };
}) {
    const isNewHighscore = score > 0 && score >= highscore;

    return (
        <div className="w-full max-w-md grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Left: Combo Streak */}
            <div className="flex justify-end min-h-[44px]">
                {comboStreak > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 animate-pulse">
                        <Flame className="w-5 h-5" />
                        <span className="font-bold text-lg">{comboStreak}x</span>
                    </div>
                )}
            </div>

            {/* Center: Score */}
            <div className="flex flex-col items-center justify-center px-8 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 min-w-[140px]">
                {/* Score number with popup anchor */}
                <div className="relative flex items-center">
                    <div className={`text-3xl font-bold bg-gradient-to-r ${isNewHighscore ? 'from-yellow-300 to-amber-500' : 'from-amber-400 to-orange-500'} bg-clip-text text-transparent`}>
                        {score.toLocaleString()}
                    </div>
                    {/* New highscore indicator */}
                    {isNewHighscore && (
                        <span className="ml-1 text-yellow-400 animate-pulse">👑</span>
                    )}
                    {/* Popups positioned right next to the number */}
                    <div className="absolute left-full top-0 pl-2 pointer-events-none">
                        {popups.map((popup) => (
                            <FloatingScore key={popup.id} value={popup.value} />
                        ))}
                    </div>
                </div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{translations.score}</div>
                {/* Highscore display */}
                {highscore > 0 && !isNewHighscore && (
                    <div className="text-[10px] text-zinc-600 mt-0.5">
                        {translations.best}: {highscore.toLocaleString()}
                    </div>
                )}
            </div>

            {/* Right: Round Streak */}
            <div className="flex justify-start min-h-[44px]">
                {roundStreak > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
                        <Zap className="w-5 h-5" />
                        <span className="font-bold text-lg">{roundStreak}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Blast effect overlay */
function BlastEffect({ active }: { active: boolean }) {
    if (!active) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
            <div className="animate-ping">
                <Sparkles className="w-16 h-16 text-amber-400" />
            </div>
        </div>
    );
}

/** Animated score popup */
function FloatingScore({ value }: { value: number }) {
    const [stage, setStage] = useState<'start' | 'active' | 'end'>('start');

    useEffect(() => {
        // Trigger animation sequence
        const raf = requestAnimationFrame(() => {
            setStage('active');
            const timer = setTimeout(() => {
                setStage('end');
            }, 1000);
            return () => clearTimeout(timer);
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    const getClasses = () => {
        switch (stage) {
            case 'start': return 'opacity-0 scale-50 translate-y-4';
            case 'active': return 'opacity-100 scale-100 translate-y-0';
            case 'end': return 'opacity-0 scale-90 -translate-y-8';
        }
    };

    return (
        <div
            className={`
                absolute left-0 top-0
                text-xl font-bold text-amber-500 
                whitespace-nowrap
                transition-all duration-500 ease-out
                ${getClasses()}
            `}
            style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
        >
            +{value}
        </div>
    );
}

/** Animated lines popup - same animation as FloatingScore */
function FloatingLines({ value }: { value: number }) {
    const [stage, setStage] = useState<'start' | 'active' | 'end'>('start');

    useEffect(() => {
        const raf = requestAnimationFrame(() => {
            setStage('active');
            const timer = setTimeout(() => {
                setStage('end');
            }, 1000);
            return () => clearTimeout(timer);
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    const getClasses = () => {
        switch (stage) {
            case 'start': return 'opacity-0 scale-50 translate-y-4';
            case 'active': return 'opacity-100 scale-100 translate-y-0';
            case 'end': return 'opacity-0 scale-90 -translate-y-8';
        }
    };

    return (
        <div
            className={`
                text-xl font-bold text-amber-400
                whitespace-nowrap
                transition-all duration-500 ease-out
                ${getClasses()}
            `}
            style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
        >
            +{value} {value === 1 ? 'Line' : 'Lines'}!
        </div>
    );
}

// ============================================================================
// Main Game Component
// ============================================================================

export default function BatasBlastGame() {
    // Language
    const { t } = useLanguage();

    // Responsive scale - recalculates on resize
    const [scale, setScale] = useState(() => getResponsiveScale());

    useEffect(() => {
        const handleResize = () => {
            setScale(getResponsiveScale());
        };
        window.addEventListener('resize', handleResize);
        // Also recalculate on orientation change
        window.addEventListener('orientationchange', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    // State
    const [gameState, setGameState] = useState<BatasBlastState | null>(null);
    const [selectedTrayIndex, setSelectedTrayIndex] = useState<number | null>(null);
    const [draggingTrayIndex, setDraggingTrayIndex] = useState<number | null>(null);
    const [hoverOrigin, setHoverOrigin] = useState<{ r: number; c: number } | null>(null);
    const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
    const [showBlast, setShowBlast] = useState(false);
    const [, setLastClearedLines] = useState<number>(0);

    // Color tracking: -1 = empty, 0+ = tray color index
    const [colorBoard, setColorBoard] = useState<number[][]>(() =>
        Array.from({ length: BOARD.rows }, () => Array(BOARD.cols).fill(-1))
    );

    // Cells that are about to be cleared (for animation)
    const [blastingCells, setBlastingCells] = useState<Set<string>>(new Set());
    const [blastColor, setBlastColor] = useState<number>(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Score Popups
    const [scorePopups, setScorePopups] = useState<Array<{ id: number; value: number }>>([]);
    // Line Popups
    const [linePopups, setLinePopups] = useState<Array<{ id: number; value: number }>>([]);

    // Refs
    const boardRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(scale);
    scaleRef.current = scale;
    const isAnimatingRef = useRef(false);
    const timeoutsRef = useRef<number[]>([]);

    const clearGameTimeouts = useCallback(() => {
        for (const id of timeoutsRef.current) {
            window.clearTimeout(id);
        }
        timeoutsRef.current = [];
    }, []);

    const scheduleGameTimeout = useCallback((fn: () => void, ms: number) => {
        const id = window.setTimeout(() => {
            timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
            fn();
        }, ms);
        timeoutsRef.current.push(id);
    }, []);

    useEffect(() => () => {
        for (const id of timeoutsRef.current) {
            window.clearTimeout(id);
        }
        timeoutsRef.current = [];
    }, []);

    // Confirmation State
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);

    // UI State
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [stats, setStats] = useState<Stats>(() => loadLocalStats(GAME_ID, 'medium'));
    const [userId, setUserId] = useState<string | null>(null);
    const [highscore, setHighscore] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        const saved = localStorage.getItem('batasblast.highscore');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Game over animation states
    const [showFloatingText, setShowFloatingText] = useState(false);
    const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);

    // Timer
    const timer = useGameTimer();

    // Derived
    const params: BatasBlastParams = useMemo(() => ({ mode: 'classic_endless' }), []);

    const activeTrayIndex = draggingTrayIndex ?? selectedTrayIndex;

    // Check if game is in progress
    const isInProgress = useMemo(() => {
        return gameState && !batasBlastEngine.isTerminal(gameState) && gameState.moveCount > 0;
    }, [gameState]);

    // Get active piece cells for ghost
    const activePieceCells = useMemo(() => {
        if (activeTrayIndex === null || !gameState) return [];
        const trayPiece = gameState.tray[activeTrayIndex];
        if (trayPiece.used) return [];
        const piece = PIECE_BY_ID.get(trayPiece.pieceId);
        return piece?.cells ?? [];
    }, [activeTrayIndex, gameState]);

    // Initial Load
    useEffect(() => {
        getCurrentUserId().then(uid => setUserId(uid));
    }, []);

    // Load active game or init new one
    useEffect(() => {
        const loadGame = async () => {
            const active = loadActiveGame<BatasBlastState>(GAME_ID, userId);

            if (active && !batasBlastEngine.isTerminal(active)) {
                const restoredColors = ensureColorBoard(active.board, active.colorBoard);
                setGameState({ ...active, colorBoard: restoredColors });
                setColorBoard(restoredColors);

                timer.setStartedAt(active.startedAtMs);
                if (active.endedAtMs) {
                    timer.setEndedAt(active.endedAtMs);
                }

                // Restore session so endSession can be called later
                if (userId) {
                    const session = await createOrReuseActiveSession({
                        userId,
                        gameId: GAME_ID,
                        difficulty: 'medium',
                        answer: '',
                        startedAtMs: active.startedAtMs,
                    });
                    setSessionId(session?.id ?? null);
                }
            } else {
                const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const state = batasBlastEngine.init(newSeed, params);
                setGameState(state);
                setColorBoard(state.colorBoard);
                saveActiveGame(GAME_ID, state, userId);
                timer.reset();

                // Create new session
                if (userId) {
                    const session = await createOrReuseActiveSession({
                        userId,
                        gameId: GAME_ID,
                        difficulty: 'medium',
                        answer: '',
                        startedAtMs: state.startedAtMs,
                    });
                    setSessionId(session?.id ?? null);
                }
            }
        };

        loadGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // Save active game
    useEffect(() => {
        if (gameState) {
            saveActiveGame(GAME_ID, batasBlastEngine.isTerminal(gameState) ? null : gameState, userId);
        }
    }, [gameState, userId]);

    // Sync stats
    useEffect(() => {
        const local = loadLocalStats(GAME_ID, 'medium');

        // Ensure bestScore is populated from localStorage highscore if missing
        const lsHighscore = typeof window !== 'undefined'
            ? parseInt(localStorage.getItem('batasblast.highscore') ?? '0', 10)
            : 0;
        const localWithHighscore = {
            ...local,
            bestScore: Math.max(local.bestScore ?? 0, lsHighscore) || null,
        };

        setStats(localWithHighscore);

        if (userId) {
            syncGameStats(userId, GAME_ID, 'medium', localWithHighscore).then(synced => {
                setStats(synced);
                saveLocalStats(GAME_ID, 'medium', synced);
                // Also update localStorage highscore if remote has a higher one
                if (synced.bestScore && synced.bestScore > highscore) {
                    setHighscore(synced.bestScore);
                    localStorage.setItem('batasblast.highscore', String(synced.bestScore));
                }
            });
        }
    }, [userId, highscore]);

    // Trigger floating game over animation when game ends
    useEffect(() => {
        const isGameOver = gameState && batasBlastEngine.isTerminal(gameState);
        if (isGameOver) {
            // Start the floating text animation
            setShowFloatingText(true);
        } else {
            setShowFloatingText(false);
            setShowGameOverOverlay(false);
        }
    }, [gameState]);

    // Callback when floating animation completes - show the overlay
    const handleFloatingComplete = useCallback(() => {
        setShowFloatingText(false);
        setShowGameOverOverlay(true);
    }, []);

    // Place piece helper
    const placePiece = useCallback((trayIndex: number, origin: { r: number; c: number }) => {
        if (!gameState || isAnimatingRef.current) return;

        const trayPiece = gameState.tray[trayIndex];
        if (trayPiece.used) return;

        if (!canPlacePiece(gameState.board, trayPiece.pieceId, origin)) {
            return;
        }

        if (!timer.startedAtMs) {
            timer.start();
        }

        // Get piece cells to update color board
        const piece = PIECE_BY_ID.get(trayPiece.pieceId);
        if (!piece) return;

        // Update color board with the tray index color
        const newColorBoard = colorBoard.map(row => [...row]);
        for (const cell of piece.cells) {
            const r = origin.r + cell.dr;
            const c = origin.c + cell.dc;
            if (r >= 0 && r < BOARD.rows && c >= 0 && c < BOARD.cols) {
                newColorBoard[r][c] = trayIndex;  // Store tray index as color
            }
        }

        const action: BatasBlastAction = {
            type: 'place',
            trayIndex,
            origin,
        };

        const prevLinesCleared = gameState.totalLinesCleared;
        const result = batasBlastEngine.applyAction(gameState, action);

        if (!result.invalidReason) {
            const scoreGained = result.state.score - gameState.score;
            if (scoreGained > 0) {
                const id = Date.now();
                setScorePopups(prev => [...prev, { id, value: scoreGained }]);
                scheduleGameTimeout(() => {
                    setScorePopups(prev => prev.filter(p => p.id !== id));
                }, 1200);
            }

            const newLinesCleared = result.state.totalLinesCleared - prevLinesCleared;

            if (newLinesCleared > 0) {
                // Find cells that will be cleared (the piece was placed, then rows cleared)
                // We need to identify which cells from newColorBoard will be cleared
                const cellsToBlast = new Set<string>();
                for (let r = 0; r < BOARD.rows; r++) {
                    for (let c = 0; c < BOARD.cols; c++) {
                        // Cell is filled in newColorBoard (after piece placement) 
                        // but will be empty in final state = this cell gets cleared
                        if (newColorBoard[r][c] >= 0 && !result.state.board[r][c]) {
                            cellsToBlast.add(`${r},${c}`);
                        }
                    }
                }

                // Commit engine immediately; only the blast visual is delayed
                isAnimatingRef.current = true;
                setIsAnimating(true);
                setGameState(result.state);
                setColorBoard(newColorBoard);

                // Trigger blast animation on cleared cells only
                setBlastingCells(cellsToBlast);
                setBlastColor(trayIndex);
                setShowBlast(true);

                const lineId = Date.now() + 1;
                setLinePopups(prev => [...prev, { id: lineId, value: newLinesCleared }]);
                scheduleGameTimeout(() => {
                    setLinePopups(prev => prev.filter(p => p.id !== lineId));
                }, 1600);

                scheduleGameTimeout(() => {
                    setColorBoard(result.state.colorBoard);
                    setBlastingCells(new Set());
                    setShowBlast(false);
                    isAnimatingRef.current = false;
                    setIsAnimating(false);
                }, 400);
            } else {
                // No lines cleared, update immediately
                setColorBoard(result.state.colorBoard);
                setGameState(result.state);
            }

            setSelectedTrayIndex(null);
            setHoverOrigin(null);

            if (batasBlastEngine.isTerminal(result.state)) {
                timer.stop();
                const durationSec = playDurationSec(timer);

                const newStats = applyGameResult(stats, {
                    outcome: "lose",
                    durationSec,
                });

                // Update bestScore in stats if new highscore
                const finalScore = result.state.score;
                const currentBest = stats.bestScore ?? 0;
                const newBestScore = Math.max(currentBest, finalScore);
                const statsWithScore = {
                    ...newStats,
                    bestScore: newBestScore,
                };

                setStats(statsWithScore);
                saveLocalStats(GAME_ID, 'medium', statsWithScore);

                // Save new highscore to localStorage for UI display
                if (finalScore > highscore) {
                    setHighscore(finalScore);
                    localStorage.setItem('batasblast.highscore', String(finalScore));
                }

                if (userId) {
                    upsertRemoteGameStats(userId, GAME_ID, 'medium', statsWithScore);
                }

                if (sessionId) {
                    endSession({
                        sessionId,
                        outcome: "lose",
                        guessesUsed: result.state.moveCount,
                        durationSec,
                        endedAtMs: result.state.endedAtMs!,
                    });
                    setSessionId(null);
                }
            }
        }
    }, [gameState, colorBoard, stats, userId, sessionId, timer, highscore, scheduleGameTimeout]);

    // Pointer move handler for drag preview
    useEffect(() => {
        if (draggingTrayIndex === null) return;

        const handlePointerMove = (e: PointerEvent) => {
            e.preventDefault(); // Prevent scrolling on touch

            // Offset for touch to make piece visible above finger
            const isTouch = e.pointerType === 'touch';
            const offsetY = isTouch ? -100 : 0;

            const clientX = e.clientX;
            const clientY = e.clientY + offsetY;

            // Update ghost position for floating piece
            setGhostPosition({ x: clientX, y: clientY });

            // Calculate grid position from offset cursor
            if (boardRef.current && gameState) {
                const rect = boardRef.current.getBoundingClientRect();
                const cellTotal = CELL_SIZE + CELL_GAP;

                // Get piece dimensions to center it under finger
                const trayPiece = gameState.tray[draggingTrayIndex];
                const piece = PIECE_BY_ID.get(trayPiece?.pieceId ?? '');
                const cells = piece?.cells ?? [];

                if (cells.length > 0) {
                    const minC = Math.min(...cells.map(c => c.dc));
                    const maxC = Math.max(...cells.map(c => c.dc));
                    const minR = Math.min(...cells.map(c => c.dr));
                    const maxR = Math.max(...cells.map(c => c.dr));
                    const pieceCols = maxC - minC + 1;
                    const pieceRows = maxR - minR + 1;

                    // Offset to center the piece under finger
                    const centerOffsetX = (pieceCols * cellTotal) / 2;
                    const centerOffsetY = (pieceRows * cellTotal) / 2;

                    const s = scaleRef.current || 1;
                    const x = (clientX - rect.left) / s - centerOffsetX;
                    const y = (clientY - rect.top) / s - centerOffsetY;

                    // Account for board padding (p-3 = 12px); layout units (unscaled)
                    const boardPadding = 12;
                    const col = Math.floor((x - boardPadding + cellTotal / 2) / cellTotal) - minC;
                    const row = Math.floor((y - boardPadding + cellTotal / 2) / cellTotal) - minR;

                    if (row >= 0 && row < BOARD.rows && col >= 0 && col < BOARD.cols) {
                        setHoverOrigin({ r: row, c: col });
                    } else {
                        setHoverOrigin(null);
                    }
                }
            }
        };

        const handlePointerUp = () => {
            // Use the already-calculated hover position
            if (hoverOrigin && gameState && draggingTrayIndex !== null) {
                const trayPiece = gameState.tray[draggingTrayIndex];
                if (!trayPiece.used && canPlacePiece(gameState.board, trayPiece.pieceId, hoverOrigin)) {
                    placePiece(draggingTrayIndex, hoverOrigin);
                }
            }

            setDraggingTrayIndex(null);
            setGhostPosition(null);
            setHoverOrigin(null);
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draggingTrayIndex, hoverOrigin, gameState, placePiece]);

    const initGame = useCallback(async () => {
        const newSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const state = batasBlastEngine.init(newSeed, params);
        clearGameTimeouts();
        isAnimatingRef.current = false;
        setIsAnimating(false);
        setGameState(state);
        setSelectedTrayIndex(null);
        setDraggingTrayIndex(null);
        setHoverOrigin(null);
        setGhostPosition(null);
        setShowBlast(false);
        setLastClearedLines(0);
        setColorBoard(state.colorBoard); // Reset color board from state
        setBlastingCells(new Set());
        setScorePopups([]);
        setLinePopups([]);
        saveActiveGame(GAME_ID, state, userId);
        timer.reset();

        if (userId) {
            const session = await createOrReuseActiveSession({
                userId,
                gameId: GAME_ID,
                difficulty: 'medium',
                answer: '',
                startedAtMs: state.startedAtMs,
            });
            setSessionId(session?.id ?? null);
        }
    }, [params, userId, timer, clearGameTimeouts]);

    const forfeitCurrentGame = useCallback(async () => {
        if (!gameState) return;
        clearGameTimeouts();
        isAnimatingRef.current = false;
        setIsAnimating(false);
        setBlastingCells(new Set());
        setShowBlast(false);
        timer.stop();
        const durationSec = playDurationSec(timer);
        const newStats = applyGameResult(stats, { outcome: "lose", durationSec });
        setStats(newStats);
        saveLocalStats(GAME_ID, 'medium', newStats);
        if (userId) {
            upsertRemoteGameStats(userId, GAME_ID, 'medium', newStats);
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
    }, [gameState, stats, userId, sessionId, timer, clearGameTimeouts]);

    const requestReset = useCallback(() => {
        if (isInProgress) {
            setConfirmResetOpen(true);
            return;
        }
        initGame();
    }, [isInProgress, initGame]);

    const forfeitAndReset = useCallback(() => {
        forfeitCurrentGame();
        initGame();
        setConfirmResetOpen(false);
    }, [forfeitCurrentGame, initGame]);



    // Handle cell click (for tap-to-place mode)
    const handleCellClick = useCallback((r: number, c: number) => {
        if (!gameState || selectedTrayIndex === null || isAnimatingRef.current) return;
        placePiece(selectedTrayIndex, { r, c });
    }, [gameState, selectedTrayIndex, placePiece]);

    // Handle drag start
    const handleDragStart = useCallback((trayIndex: number, e: React.PointerEvent) => {
        if (!gameState || isAnimatingRef.current) return;
        const trayPiece = gameState.tray[trayIndex];
        if (trayPiece.used || !trayPiece) return;

        e.preventDefault();
        setDraggingTrayIndex(trayIndex);
    }, [gameState]);

    // Compute preview cells for board display + lines that would be cleared
    const { previewCells, wouldClearCells } = useMemo(() => {
        if (!gameState || activeTrayIndex === null || !hoverOrigin) {
            return { previewCells: undefined, wouldClearCells: new Set<string>() };
        }

        const trayPiece = gameState.tray[activeTrayIndex];
        if (trayPiece.used) return { previewCells: undefined, wouldClearCells: new Set<string>() };

        const piece = PIECE_BY_ID.get(trayPiece.pieceId);
        if (!piece) return { previewCells: undefined, wouldClearCells: new Set<string>() };

        const isValid = canPlacePiece(gameState.board, trayPiece.pieceId, hoverOrigin);

        const cells = new Map<string, boolean>();

        // Create a simulated board with the piece placed
        const simulatedBoard = gameState.board.map(row => [...row]);

        for (const cell of piece.cells) {
            const r = hoverOrigin.r + cell.dr;
            const c = hoverOrigin.c + cell.dc;
            if (r >= 0 && r < BOARD.rows && c >= 0 && c < BOARD.cols) {
                cells.set(`${r},${c}`, isValid);
                if (isValid) {
                    simulatedBoard[r][c] = true;
                }
            }
        }

        // Find rows and cols that would be cleared
        const wouldClear = new Set<string>();

        if (isValid) {
            // Check rows
            for (let r = 0; r < BOARD.rows; r++) {
                if (simulatedBoard[r].every(cell => cell)) {
                    for (let c = 0; c < BOARD.cols; c++) {
                        wouldClear.add(`${r},${c}`);
                    }
                }
            }

            // Check cols
            for (let c = 0; c < BOARD.cols; c++) {
                let full = true;
                for (let r = 0; r < BOARD.rows; r++) {
                    if (!simulatedBoard[r][c]) {
                        full = false;
                        break;
                    }
                }
                if (full) {
                    for (let r = 0; r < BOARD.rows; r++) {
                        wouldClear.add(`${r},${c}`);
                    }
                }
            }
        }

        return { previewCells: cells, wouldClearCells: wouldClear };
    }, [gameState, activeTrayIndex, hoverOrigin]);

    const renderModel = useMemo((): BatasBlastRenderModel | null => {
        if (!gameState) return null;
        return batasBlastUIAdapter.toRenderModel(gameState) as BatasBlastRenderModel;
    }, [gameState]);

    if (!renderModel) {
        return (
            <GameShell gameId={GAME_ID} gameName="BatasBlast" onNewGame={initGame}>
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
            gameName="BatasBlast"
            onNewGame={requestReset}
            onOpenLeaderboard={() => { setShowGameOverOverlay(false); setLeaderboardOpen(true); }}
            onOpenStats={() => { setShowGameOverOverlay(false); setStatsOpen(true); }}
            fullHeight={true}
        >
            {/* Floating ghost that follows finger */}
            {draggingTrayIndex !== null && ghostPosition && (
                <FloatingGhost
                    cells={activePieceCells}
                    colorIndex={draggingTrayIndex}
                    position={ghostPosition}
                />
            )}

            {/* Board-aligned ghost for precise placement preview */}
            {draggingTrayIndex !== null && hoverOrigin && (
                <GhostPiece
                    cells={activePieceCells}
                    colorIndex={draggingTrayIndex}
                    hoverOrigin={hoverOrigin}
                    boardRef={boardRef}
                    scale={scale}
                />
            )}

            <div
                className="flex flex-col items-center gap-5 p-4 relative w-full"
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                }}
            >
                <BlastEffect active={showBlast} />

                {/* Score Display */}
                <ScoreDisplay
                    score={data.score}
                    comboStreak={data.comboStreak}
                    roundStreak={data.roundStreak}
                    popups={scorePopups}
                    highscore={highscore}
                    translations={{ score: t.batasblast.score, best: t.batasblast.best }}
                />

                {/* Line clear feedback - appears below score and animates up */}
                <div className="h-8 flex justify-center items-start pointer-events-none overflow-visible">
                    {linePopups.map(popup => (
                        <FloatingLines key={popup.id} value={popup.value} />
                    ))}
                </div>



                {/* Board */}
                <div
                    ref={boardRef}
                    className={`bg-zinc-900/80 p-3 rounded-2xl border border-zinc-700/50 shadow-xl touch-none ${renderModel.isTerminal ? 'opacity-60' : ''}`}
                    onMouseLeave={() => {
                        if (!draggingTrayIndex) setHoverOrigin(null);
                    }}
                >
                    <div
                        className="relative"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${BOARD.cols}, ${CELL_SIZE}px)`,
                            gap: CELL_GAP,
                        }}
                    >
                        {data.board.map((row, r) =>
                            row.map((filled, c) => {
                                const key = `${r},${c}`;
                                const previewInfo = previewCells?.get(key);
                                const isPreview = previewInfo !== undefined;
                                const isValid = previewInfo === true;
                                const isBlasting = blastingCells.has(key);
                                const wouldClear = wouldClearCells.has(key);

                                const storedColor = colorBoard[r]?.[c] ?? -1;
                                const isFilled = Boolean(filled) || storedColor >= 0;

                                // Priority: wouldClear > blasting > preview > filled
                                const cellColor = wouldClear
                                    ? (activeTrayIndex ?? 0)  // All cells that would clear get piece color
                                    : isBlasting
                                        ? blastColor
                                        : isPreview && !isFilled
                                            ? (activeTrayIndex ?? 0)
                                            : isFilled
                                                ? (storedColor >= 0 ? storedColor : 0)
                                                : 0;

                                return (
                                    <div
                                        key={key}
                                        onClick={() => handleCellClick(r, c)}
                                        onMouseEnter={() => {
                                            if (selectedTrayIndex !== null && !draggingTrayIndex) {
                                                setHoverOrigin({ r, c });
                                            }
                                        }}
                                        className={`cursor-pointer ${isBlasting ? 'animate-pulse' : ''} ${wouldClear && !isPreview ? 'animate-pulse' : ''}`}
                                        style={{
                                            transform: isBlasting ? 'scale(1.1)' : wouldClear && !isPreview ? 'scale(1.05)' : undefined,
                                            transition: 'transform 0.2s ease-out',
                                            filter: wouldClear && !isPreview ? 'brightness(1.3)' : undefined,
                                        }}
                                    >
                                        <Cell
                                            filled={isFilled || isBlasting}
                                            preview={isPreview && isValid && !isFilled}
                                            invalid={isPreview && !isValid && !isFilled}
                                            blasting={isBlasting}
                                            colorIndex={cellColor}
                                        />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Tray - always visible so user can verify game over */}
                <div className={`flex gap-3 ${renderModel.isTerminal ? 'opacity-60' : ''}`}>
                    {data.tray.map((piece, i) => (
                        <TrayPieceDisplay
                            key={i}
                            piece={piece}
                            selected={!renderModel.isTerminal && !isAnimating && selectedTrayIndex === i}
                            isDragging={!renderModel.isTerminal && !isAnimating && draggingTrayIndex === i}
                            onSelect={() => !renderModel.isTerminal && !isAnimating && setSelectedTrayIndex(selectedTrayIndex === i ? null : i)}
                            onDragStart={(e) => !renderModel.isTerminal && !isAnimating && handleDragStart(i, e)}
                            colorIndex={i}
                        />
                    ))}
                </div>


                {/* Instructions */}
                {!renderModel.isTerminal && selectedTrayIndex === null && draggingTrayIndex === null && (
                    <div className="text-center text-[color:var(--muted)] text-sm">
                        {t.batasblast.tapOrDrag}
                    </div>
                )}

                {!renderModel.isTerminal && selectedTrayIndex !== null && draggingTrayIndex === null && (
                    <div className="text-center text-emerald-400 text-sm font-medium">
                        Hover over the board to preview, then tap to place
                    </div>
                )}

                {!renderModel.isTerminal && draggingTrayIndex !== null && (
                    <div className="text-center text-amber-400 text-sm font-medium">
                        Drag to the board and release to place
                    </div>
                )}
            </div>

            <StatsModal
                open={statsOpen}
                onClose={() => { setStatsOpen(false); if (renderModel.isTerminal) setShowGameOverOverlay(true); }}
                stats={stats}
                onLeaderboard={() => setLeaderboardOpen(true)}
                showDistribution={false}
            >
                {/* Custom BatasBlast stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t.leaderboard.played}</div>
                        <div className="mt-1 text-lg font-bold text-[color:var(--fg)]">{stats.played}</div>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t.batasblast.highScore}</div>
                        <div className="mt-1 text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                            {(stats.bestScore ?? highscore ?? 0).toLocaleString()}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t.batasblast.totalLines}</div>
                        <div className="mt-1 text-lg font-bold text-emerald-400">{data?.totalLinesCleared ?? 0}</div>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">{t.batasblast.bestCombo}</div>
                        <div className="mt-1 text-lg font-bold text-orange-400">{data?.maxComboStreak ?? 0}x</div>
                    </div>
                </div>
            </StatsModal>

            <Leaderboard
                open={leaderboardOpen}
                onClose={() => { setLeaderboardOpen(false); if (renderModel.isTerminal) setShowGameOverOverlay(true); }}
                gameId={GAME_ID}
            />


            {/* Floating Game Over Animation - shows before overlay */}
            <FloatingGameOver
                active={showFloatingText}
                text={t.batasblast.gameOver}
                outcome="lose"
                duration={1500}
                onComplete={handleFloatingComplete}
            />

            {/* Game Result Overlay - shows after floating animation */}
            <GameResultOverlay
                open={showGameOverOverlay}
                outcome="lose"
                title={t.batasblast.gameOver}
                subtitle={t.batasblast.noMovesLeft}
                onPlayAgain={initGame}
                onOpenStats={() => { setShowGameOverOverlay(false); setStatsOpen(true); }}
            >
                {/* Score display */}
                <div className="text-center">
                    <div className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent mb-2">
                        {data.score.toLocaleString()}
                    </div>
                    <div className="text-xs text-[color:var(--muted)] flex gap-3 justify-center">
                        <span>{data.totalLinesCleared} {t.games.lines}</span>
                        <span>•</span>
                        <span>{data.maxComboStreak}x Max {t.games.combo}</span>
                    </div>
                </div>
            </GameResultOverlay>

            <Modal
                open={confirmResetOpen}
                title="Neues Spiel?"
                onClose={() => setConfirmResetOpen(false)}
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setConfirmResetOpen(false)}
                            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="button"
                            onClick={forfeitAndReset}
                            className="rounded-xl border border-rose-500/30 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/30"
                        >
                            Neu starten
                        </button>
                    </div>
                }
            >
                <div className="text-sm text-[color:var(--fg)]/85">
                    Dein aktuelles Spiel wird beendet. Fortfahren?
                </div>
            </Modal>
        </GameShell >
    );
}
