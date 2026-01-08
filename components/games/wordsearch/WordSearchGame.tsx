"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Trophy, Search, RotateCcw } from "lucide-react";
import GameShell from "@/components/shared/GameShell";
import GameResultOverlay from "@/components/games/common/GameResultOverlay";
import Leaderboard from "@/components/games/common/Leaderboard";
import StatsModal from "@/components/shared/StatsModal";
import {
    wordSearchEngine,
    getModeParams,
    BASE_WORDS,
    type WordSearchState,
    type SelectPathAction,
} from "@/lib/games/wordsearch/engine";
import { wordSearchUIAdapter, type WordSearchRenderModel } from "@/lib/games/wordsearch/ui-adapter";
import type { Difficulty } from "@/lib/difficulty";
import { useGameTimer } from "@/lib/hooks/useGameTimer";
import { useGameStats } from "@/lib/hooks/useGameStats";
import { createOrReuseActiveSession, endSession } from "@/lib/sync/sessions-sync";
import { fetchPlayedWords, trackPlayedWord } from "@/lib/sync/played-words";
import Modal from "@/components/games/common/Modal";
import { loadDifficulty, saveDifficulty } from "@/lib/storage/settings-storage";

// ============================================================================
// Constants
// ============================================================================

const GAME_ID = "wordsearch";

// ============================================================================
// Grid Cell Component
// ============================================================================

interface CellProps {
    letter: string;
    row: number;
    col: number;
    isSelected: boolean;
    isFound: boolean;
    onMouseDown: (r: number, c: number) => void;
    onMouseEnter: (r: number, c: number) => void;
    onTouchMove: (r: number, c: number) => void;
}

function Cell({ letter, row, col, isSelected, isFound, onMouseDown, onMouseEnter, onTouchMove }: CellProps) {
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.getAttribute('data-cell')) {
            const [r, c] = element.getAttribute('data-cell')!.split(',').map(Number);
            onTouchMove(r, c);
        }
    }, [onTouchMove]);

    return (
        <div
            data-cell={`${row},${col}`}
            className={`
        w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center
        text-sm sm:text-base font-bold uppercase
        rounded-md transition-all select-none cursor-pointer touch-none
        ${isFound
                    ? 'bg-emerald-500/30 text-emerald-300 border-2 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                    : isSelected
                        ? 'bg-blue-500/40 text-blue-200 scale-105 border-2 border-blue-500/60'
                        : 'bg-[color:var(--surface)] text-[color:var(--fg)] hover:bg-[color:var(--surface2)] border border-transparent'
                }
      `}
            onMouseDown={() => onMouseDown(row, col)}
            onMouseEnter={() => onMouseEnter(row, col)}
            onTouchStart={() => onMouseDown(row, col)}
            onTouchMove={handleTouchMove}
        >
            {letter}
        </div>
    );
}

// ============================================================================
// Word List Component
// ============================================================================

function WordList({ words }: { words: Array<{ id: string; text: string; found: boolean }> }) {
    return (
        <div className="flex flex-wrap gap-2 justify-center">
            {words.map((word) => (
                <span
                    key={word.id}
                    className={`
            px-3 py-1 rounded-lg text-sm font-medium
            ${word.found
                            ? 'bg-emerald-500/20 text-emerald-400 line-through'
                            : 'bg-[color:var(--surface)] text-[color:var(--fg)]'
                        }
          `}
                >
                    {word.text}
                </span>
            ))}
        </div>
    );
}

// ============================================================================
// Main Word Search Game Component
// ============================================================================

interface WordSearchGameProps {
    initialDifficulty?: Difficulty;
}

export default function WordSearchGame({ initialDifficulty }: WordSearchGameProps) {
    // Difficulty
    const [difficulty, setDifficulty] = useState<Difficulty>(() => initialDifficulty ?? loadDifficulty());

    // Game state
    const [gameState, setGameState] = useState<WordSearchState | null>(null);
    const [selectionStart, setSelectionStart] = useState<{ r: number; c: number } | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<{ r: number; c: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
    const [gameCompletedTracked, setGameCompletedTracked] = useState(false);

    // UI state
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);
    const [confirmDifficultyOpen, setConfirmDifficultyOpen] = useState(false);
    const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [playedWords, setPlayedWords] = useState<Set<string>>(new Set());

    // Use shared hooks
    const timer = useGameTimer({ pauseOnHidden: true });
    const { userId, stats, recordGameResult } = useGameStats({ gameId: GAME_ID, mode: difficulty });

    // Refs
    const gridRef = useRef<HTMLDivElement>(null);

    // Get params for current difficulty
    const params = useMemo(() => getModeParams(difficulty), [difficulty]);

    // Fetch played words when userId or difficulty changes
    useEffect(() => {
        if (!userId) return;
        fetchPlayedWords(userId, difficulty, GAME_ID).then(setPlayedWords);
    }, [userId, difficulty]);

    // Initialize game
    const initGame = useCallback(async () => {
        const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // Filter out already played words from dictionary
        const sourceDictionary = params.dictionary ?? BASE_WORDS;
        const availableWords = sourceDictionary.filter(w => !playedWords.has(w.toUpperCase()));

        // If all words are exhausted, reset (should rarely happen with 80+ words)
        const finalDictionary = availableWords.length >= params.wordCount
            ? availableWords
            : sourceDictionary;

        const paramsWithFilteredDict = { ...params, dictionary: finalDictionary };

        const state = wordSearchEngine.init(seed, paramsWithFilteredDict);
        setGameState(state);
        setFoundCells(new Set());
        setSelectionStart(null);
        setSelectionEnd(null);
        setGameCompletedTracked(false);
        timer.reset();
        timer.start();

        // Create session for logged-in users
        if (userId) {
            const session = await createOrReuseActiveSession({
                userId,
                gameId: GAME_ID,
                difficulty,
                answer: state.words.map(w => w.text).join(","), // Serialize words as comma-separated
                startedAtMs: state.startedAtMs,
            });
            setSessionId(session?.id ?? null);
        }
    }, [params, timer, userId, difficulty, playedWords]);

    // Initialize on mount or difficulty change
    useEffect(() => {
        initGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [difficulty, params]);

    // Get render model
    const renderModel = useMemo((): WordSearchRenderModel | null => {
        if (!gameState) return null;
        return wordSearchUIAdapter.toRenderModel(gameState) as WordSearchRenderModel;
    }, [gameState]);

    // Handle game completion - record stats and end session
    useEffect(() => {
        if (!renderModel?.isTerminal || gameCompletedTracked) return;

        setGameCompletedTracked(true);
        timer.stop();

        const isWin = renderModel.status === 'won';
        const durationSec = timer.elapsedSec;

        if (isWin) {
            recordGameResult({
                outcome: 'win',
                guessesUsed: gameState?.foundCount ?? 0,
                durationSec,
            });
        } else {
            recordGameResult({
                outcome: 'lose',
                durationSec,
            });
        }

        // End session
        if (sessionId) {
            endSession({
                sessionId,
                outcome: isWin ? 'win' : 'lose',
                guessesUsed: gameState?.foundCount ?? null,
                durationSec,
                endedAtMs: Date.now(),
            });
            setSessionId(null);
        }

        // Track all words from this game as played
        if (userId && gameState) {
            gameState.words.forEach(word => {
                void trackPlayedWord(userId, difficulty, word.text, GAME_ID);
            });
            // Update local state to include new words
            setPlayedWords(prev => {
                const next = new Set(prev);
                gameState.words.forEach(w => next.add(w.text.toUpperCase()));
                return next;
            });
        }
    }, [renderModel?.isTerminal, renderModel?.status, gameCompletedTracked, timer, recordGameResult, gameState?.foundCount, sessionId, userId, difficulty, gameState]);

    // Get selected cells
    const selectedCells = useMemo(() => {
        if (!selectionStart || !selectionEnd) return new Set<string>();

        const cells = new Set<string>();
        const dr = Math.sign(selectionEnd.r - selectionStart.r);
        const dc = Math.sign(selectionEnd.c - selectionStart.c);
        const steps = Math.max(
            Math.abs(selectionEnd.r - selectionStart.r),
            Math.abs(selectionEnd.c - selectionStart.c)
        );

        for (let i = 0; i <= steps; i++) {
            cells.add(`${selectionStart.r + i * dr},${selectionStart.c + i * dc}`);
        }

        return cells;
    }, [selectionStart, selectionEnd]);

    // Handle cell mouse down
    const handleMouseDown = useCallback((r: number, c: number) => {
        setIsSelecting(true);
        setSelectionStart({ r, c });
        setSelectionEnd({ r, c });
    }, []);

    // Handle cell mouse enter
    const handleMouseEnter = useCallback((r: number, c: number) => {
        if (!isSelecting || !selectionStart) return;

        // Only allow straight lines
        const dr = r - selectionStart.r;
        const dc = c - selectionStart.c;

        // Check if it's a valid direction
        if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
            setSelectionEnd({ r, c });
        }
    }, [isSelecting, selectionStart]);

    // Handle mouse up - submit selection
    const handleMouseUp = useCallback(() => {
        if (!isSelecting || !selectionStart || !selectionEnd || !gameState) {
            setIsSelecting(false);
            return;
        }

        setIsSelecting(false);

        const action: SelectPathAction = {
            type: 'select_path',
            start: selectionStart,
            end: selectionEnd,
        };

        const result = wordSearchEngine.applyAction(gameState, action);
        setGameState(result.state);

        // If word was found, mark cells as found
        const wordFoundEvent = result.events.find(e => e.type === 'word_found');
        if (wordFoundEvent) {
            const newFoundCells = new Set(foundCells);
            selectedCells.forEach(cell => newFoundCells.add(cell));
            setFoundCells(newFoundCells);
        }

        setSelectionStart(null);
        setSelectionEnd(null);
    }, [isSelecting, selectionStart, selectionEnd, gameState, selectedCells, foundCells]);

    // Global mouse up listener
    useEffect(() => {
        const handleGlobalMouseUp = () => handleMouseUp();
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('touchend', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('touchend', handleGlobalMouseUp);
        };
    }, [handleMouseUp]);

    // Check if game is in progress
    const isInProgress = useMemo(() => {
        if (!gameState) return false;
        return gameState.foundCount > 0 && !renderModel?.isTerminal;
    }, [gameState, renderModel?.isTerminal]);

    // Forfeit current game
    const forfeitCurrentGame = useCallback(async () => {
        const durationSec = timer.elapsedSec;
        recordGameResult({
            outcome: 'lose',
            durationSec,
        });

        // End session as forfeit
        if (sessionId) {
            await endSession({
                sessionId,
                outcome: 'forfeit',
                guessesUsed: gameState?.foundCount ?? null,
                durationSec,
                endedAtMs: Date.now(),
            });
            setSessionId(null);
        }
    }, [recordGameResult, timer.elapsedSec, sessionId, gameState?.foundCount]);

    // Apply difficulty change
    const applyDifficultyChange = useCallback((d: Difficulty) => {
        setDifficulty(d);
        saveDifficulty(d);
    }, []);

    // Request difficulty change with confirmation
    const requestDifficultyChange = useCallback((d: Difficulty) => {
        if (d === difficulty) return;
        if (isInProgress) {
            setPendingDifficulty(d);
            setConfirmDifficultyOpen(true);
            return;
        }
        applyDifficultyChange(d);
    }, [difficulty, isInProgress, applyDifficultyChange]);

    // Forfeit and reset
    const forfeitCurrentGameAndReset = useCallback(() => {
        forfeitCurrentGame();
        initGame();
        setConfirmResetOpen(false);
    }, [forfeitCurrentGame, initGame]);

    // Request reset with confirmation
    const requestReset = useCallback(() => {
        if (isInProgress) {
            setConfirmResetOpen(true);
            return;
        }
        initGame();
    }, [isInProgress, initGame]);

    if (!renderModel) {
        return (
            <GameShell gameId={GAME_ID} gameName="Word Search" onNewGame={initGame}>
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
            gameName="Word Search"
            onNewGame={requestReset}
            difficulty={difficulty}
            onDifficultyChange={requestDifficultyChange}
            timerText={timer.timerText}
            onOpenStats={() => setStatsOpen(true)}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
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
            <div className="max-w-2xl mx-auto p-4 space-y-6">
                {/* Win Banner */}
                {renderModel.isTerminal && renderModel.status === 'won' && (
                    <div className="rounded-xl p-6 text-center bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Trophy className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-bold text-emerald-400 mb-1">
                            Alle Wörter gefunden!
                        </div>
                        <div className="text-[color:var(--muted)]">
                            Zeit: {timer.timerText} • Fehlversuche: {data.misselects}
                        </div>
                    </div>
                )}

                {/* Word List */}
                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-[color:var(--muted)]">
                        <Search className="w-4 h-4" />
                        <span>{data.foundCount} / {data.totalWords} Wörter gefunden</span>
                    </div>
                    {/* Show all words in easy mode, only found words in medium/hard */}
                    {data.showWordList ? (
                        <WordList words={data.words} />
                    ) : (
                        <div className="text-center">
                            {data.foundCount > 0 ? (
                                <WordList words={data.words.filter(w => w.found)} />
                            ) : (
                                <p className="text-[color:var(--muted)] text-sm italic">
                                    Finde die versteckten Wörter im Gitter!
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Grid */}
                <div
                    ref={gridRef}
                    className="flex justify-center"
                    onMouseLeave={() => {
                        if (isSelecting) {
                            setSelectionStart(null);
                            setSelectionEnd(null);
                            setIsSelecting(false);
                        }
                    }}
                >
                    <div
                        className="grid gap-1"
                        style={{
                            gridTemplateColumns: `repeat(${data.cols}, minmax(0, 1fr))`,
                        }}
                    >
                        {data.grid.map((row, r) =>
                            row.map((letter, c) => (
                                <Cell
                                    key={`${r}-${c}`}
                                    letter={letter}
                                    row={r}
                                    col={c}
                                    isSelected={selectedCells.has(`${r},${c}`)}
                                    isFound={foundCells.has(`${r},${c}`)}
                                    onMouseDown={handleMouseDown}
                                    onMouseEnter={handleMouseEnter}
                                    onTouchMove={handleMouseEnter}
                                />
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* Modals */}
            <StatsModal
                open={statsOpen}
                onClose={() => setStatsOpen(false)}
                stats={stats}
                onLeaderboard={() => setLeaderboardOpen(true)}
                showDistribution={false}
            />

            <Leaderboard
                open={leaderboardOpen}
                onClose={() => setLeaderboardOpen(false)}
                gameId={GAME_ID}
            />

            {/* Game Result Overlay */}
            <GameResultOverlay
                open={renderModel.isTerminal}
                outcome="win"
                title="Geschafft!"
                subtitle={`Alle ${data?.totalWords ?? 0} Wörter gefunden`}
                onPlayAgain={initGame}
                onOpenStats={() => setStatsOpen(true)}
            />

            {/* Confirm Reset Modal */}
            <Modal open={confirmResetOpen} title="Reset game?" onClose={() => setConfirmResetOpen(false)} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setConfirmResetOpen(false)} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">Cancel</button>
                    <button type="button" onClick={forfeitCurrentGameAndReset} className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30">Reset (counts as loss)</button>
                </div>
            }>
                <div className="text-sm text-[color:var(--fg)]/85">You already found some words. Resetting now will count as a loss.</div>
            </Modal>

            {/* Confirm Difficulty Change Modal */}
            <Modal open={confirmDifficultyOpen} title="Change difficulty?" onClose={() => { setConfirmDifficultyOpen(false); setPendingDifficulty(null); }} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => { setConfirmDifficultyOpen(false); setPendingDifficulty(null); }} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">Cancel</button>
                    <button type="button" onClick={() => { const next = pendingDifficulty; setConfirmDifficultyOpen(false); setPendingDifficulty(null); forfeitCurrentGame(); if (next) applyDifficultyChange(next); }} className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30">Switch (counts as loss)</button>
                </div>
            }>
                <div className="text-sm text-[color:var(--fg)]/85">You already found some words. Switching difficulty now will forfeit this game and count as a loss.</div>
            </Modal>
        </GameShell>
    );
}
