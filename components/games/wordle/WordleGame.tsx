"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { RotateCcw, Skull, CheckCircle2, Book } from "lucide-react";
import { marksToEmoji, pickRandom, scoreGuess } from "@/lib/game";
import { loadWordLists } from "@/lib/words";
import type { Difficulty } from "@/lib/difficulty";
import { loadDifficulty, saveDifficulty } from "@/lib/storage/settings-storage";
import { loadActiveGame, saveActiveGame } from "@/lib/storage/active-game-storage";
import Grid, { type GridRow } from "@/components/games/common/Grid";
import Keyboard from "@/components/games/common/Keyboard";
import Modal from "@/components/games/common/Modal";
import Leaderboard from "@/components/games/common/Leaderboard";
import WordHistory from "@/components/games/common/WordHistory";
import { applyTheme } from "@/lib/theme";
import Hint, { type HintResult } from "@/components/games/common/Hint";
import {
    applyGameResult,
    formatDuration,
    loadStats,
    saveStats,
    type Stats,
} from "@/lib/storage/storage";
import { getCurrentUserId, upsertRemoteGameStats, syncGameStats } from "@/lib/sync/game-stats-sync";
import { createOrReuseActiveSession, endSession, fetchActiveSession, updateSessionAnswer } from "@/lib/sync/sessions-sync";
import { fetchPlayedWords, trackPlayedWord } from "@/lib/sync/played-words";
import { consumeHint, getHintNoRemind, setHintNoRemind, getRemainingHints } from "@/lib/storage/hint-storage";
import { fetchWordDefinition, translatePartOfSpeech, translateToGerman, type WordDefinition } from "@/lib/dictionary";
import { saveWordDefinition } from "@/lib/word-definitions";
import GameShell from "@/components/shared/GameShell";
import GameResultOverlay from "@/components/games/common/GameResultOverlay";
import StatsModal from "@/components/shared/StatsModal";
import { Checkbox } from "@/components/ui/checkbox";

const MAX_TRIES = 6;
const GAME_ID = "wordle";

/** State persisted to localStorage for resuming games */
interface WordleState {
    startedAtMs: number;
    difficulty: Difficulty;
    answer: string;
    rows: GridRow[];
    current: string;
    endedAtMs: number | null;
    hintUsed: boolean;
}

export default function WordleGame() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const keyboardRef = useRef<HTMLDivElement | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);


    const [difficulty, setDifficulty] = useState<Difficulty>(() => loadDifficulty());

    const [allowed, setAllowed] = useState<string[]>([]);
    const [solutions, setSolutions] = useState<string[]>([]);
    const [playedWords, setPlayedWords] = useState<Set<string>>(new Set());

    const [answer, setAnswer] = useState("");
    const [rows, setRows] = useState<GridRow[]>(
        Array.from({ length: MAX_TRIES }, () => ({
            guess: "",
            marks: null,
            revealed: false,
        }))
    );
    const [current, setCurrent] = useState("");
    const [toast, setToast] = useState<string>("");

    const [shakeNonce, setShakeNonce] = useState(0);

    const [stats, setStats] = useState<Stats>(() => loadStats(difficulty));
    const [statsOpen, setStatsOpen] = useState(false);
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);
    const [confirmDifficultyOpen, setConfirmDifficultyOpen] = useState(false);
    const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const [leaderboardOpen, setLeaderboardOpen] = useState(false);
    const [wordHistoryOpen, setWordHistoryOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const [hintUsed, setHintUsed] = useState(false);
    const [hintWarningOpen, setHintWarningOpen] = useState(false);
    const [hintNoRemindChecked, setHintNoRemindChecked] = useState(false);

    const [wordDefinition, setWordDefinition] = useState<WordDefinition | null>(null);
    const [isWordDefinitionLoading, setIsWordDefinitionLoading] = useState(false);
    const [definitionPopupOpen, setDefinitionPopupOpen] = useState(false);

    const theme = "dark" as const;

    // timer
    const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
    const [endedAtMs, setEndedAtMs] = useState<number | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [hiddenAtMs, setHiddenAtMs] = useState<number | null>(null);

    const didInitSessionRef = useRef(false);

    useEffect(() => {
        getCurrentUserId().then((uid) => setUserId(uid));
    }, []);

    const answerLockedRef = useRef(false);

    useEffect(() => {
        const committedCountNow = rows.filter((r) => r.marks).length;
        if (startedAtMs || committedCountNow > 0) {
            answerLockedRef.current = true;
        }
    }, [startedAtMs, rows]);

    useEffect(() => {
        if (!userId) return;
        if (didInitSessionRef.current) return;

        const hasLocalProgress =
            Boolean(answer) ||
            Boolean(startedAtMs) ||
            current.length > 0 ||
            rows.some((r) => (r.guess && r.guess.trim().length > 0) || r.marks);

        if (hasLocalProgress) {
            didInitSessionRef.current = true;
            return;
        }

        didInitSessionRef.current = true;

        (async () => {
            const active = await fetchActiveSession(userId);
            if (!active) return;
            if (answerLockedRef.current) return;

            setSessionId(active.id);
            setDifficulty(active.difficulty);
            setAnswer(active.answer);
            setStartedAtMs(Date.parse(active.started_at));
            setEndedAtMs(null);
        })();
    }, [userId, answer, startedAtMs, current, rows]);

    useEffect(() => {
        console.log('[WORDLE INIT] Loading word lists for difficulty:', difficulty);
        loadWordLists(difficulty).then(({ allowed, solutions }) => {
            console.log('[WORDLE INIT] Word lists loaded. Solutions count:', solutions.length);
            setAllowed(allowed);
            setSolutions(solutions);
        }).catch(err => {
            console.error('[WORDLE INIT] Failed to load word lists:', err);
        });
    }, [difficulty]);

    useEffect(() => {
        if (!userId) return;
        fetchPlayedWords(userId, difficulty).then((played) => {
            setPlayedWords(played);
        });
    }, [userId, difficulty]);

    useEffect(() => {
        const local = loadStats(difficulty);
        setStats(local);

        if (!userId) return;

        (async () => {
            const synced = await syncGameStats(userId, GAME_ID, difficulty, local);
            setStats(synced);
            saveStats(difficulty, synced);
        })();
    }, [userId, difficulty]);

    useEffect(() => {
        applyTheme();
    }, [theme]);

    useEffect(() => {
        console.log('[WORDLE INIT] Game init effect. solutions.length:', solutions.length);
        if (!solutions.length) {
            console.log('[WORDLE INIT] No solutions yet, waiting...');
            return;
        }
        const persisted = loadActiveGame<WordleState>(GAME_ID, userId);
        console.log('[WORDLE INIT] Persisted state:', persisted);
        if (persisted && persisted.answer && persisted.difficulty === difficulty) {
            console.log('[WORDLE INIT] Loading persisted game with answer:', persisted.answer);
            setAnswer(persisted.answer);
            setRows(persisted.rows);
            setCurrent(persisted.current);
            setStartedAtMs(persisted.startedAtMs);
            setEndedAtMs(persisted.endedAtMs);
            setHintUsed(persisted.hintUsed);
            window.setTimeout(() => containerRef.current?.focus(), 0);
            return;
        }
        console.log('[WORDLE INIT] Starting new game...');
        newGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [solutions.length, difficulty, userId]);

    useEffect(() => {
        saveStats(difficulty, stats);
        if (!userId) return;
        void upsertRemoteGameStats(userId, GAME_ID, difficulty, stats);
    }, [difficulty, stats, userId]);

    useEffect(() => {
        if (!answer || !startedAtMs) return;
        saveActiveGame<WordleState>(GAME_ID, {
            startedAtMs,
            difficulty,
            answer,
            rows,
            current,
            endedAtMs,
            hintUsed,
        }, userId);
    }, [difficulty, answer, rows, current, startedAtMs, endedAtMs, hintUsed, userId]);

    useEffect(() => {
        saveDifficulty(difficulty);
    }, [difficulty]);

    useEffect(() => {
        if (!sessionId || !answer) return;
        void updateSessionAnswer({ sessionId, answer });
    }, [sessionId, answer]);

    useLayoutEffect(() => {
        const measure = () => {
            const h = keyboardRef.current?.offsetHeight ?? 0;
            setKeyboardHeight(h);
        };

        measure();
        window.addEventListener("resize", measure);
        window.visualViewport?.addEventListener("resize", measure);

        return () => {
            window.removeEventListener("resize", measure);
            window.visualViewport?.removeEventListener("resize", measure);
        };
    }, []);

    function showToast(msg: string) {
        setToast(msg);
        window.setTimeout(() => setToast(""), 1400);
    }

    const committedCount = useMemo(() => rows.filter((r) => r.marks).length, [rows]);

    const gameOver = useMemo(() => {
        const won = rows.some((r) => r.marks?.every((m) => m === "correct"));
        const lost = committedCount >= MAX_TRIES && !won;
        return { won, lost, done: won || lost };
    }, [rows, committedCount]);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                setHiddenAtMs(Date.now());
            } else {
                setHiddenAtMs((prevHidden) => {
                    if (prevHidden && startedAtMs && !endedAtMs) {
                        const hiddenDuration = Date.now() - prevHidden;
                        setStartedAtMs((prev) => (prev ? prev + hiddenDuration : prev));
                    }
                    return null;
                });

                if (userId && !gameOver.done) {
                    syncGameStats(userId, GAME_ID, difficulty, stats).then((synced) => {
                        if (synced.played !== stats.played || synced.wins !== stats.wins) {
                            setStats(synced);
                            saveStats(difficulty, synced);
                        }
                    });
                }
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [startedAtMs, endedAtMs, userId, difficulty, stats, gameOver.done]);

    useEffect(() => {
        if (gameOver.done) return;
        if (hiddenAtMs) return;
        const id = window.setInterval(() => setNowMs(Date.now()), 250);
        return () => window.clearInterval(id);
    }, [gameOver.done, hiddenAtMs]);

    const activeRowIndex = useMemo(() => {
        const idx = rows.findIndex((r) => r.marks === null);
        return idx === -1 ? MAX_TRIES - 1 : idx;
    }, [rows]);

    useEffect(() => {
        if (!gameOver.done) return;
        if (!startedAtMs) return;
        setEndedAtMs((prev) => prev ?? Date.now());
    }, [gameOver.done, startedAtMs]);

    useEffect(() => {
        if (!gameOver.done || !answer) {
            setWordDefinition(null);
            setIsWordDefinitionLoading(false);
            return;
        }

        setIsWordDefinitionLoading(true);
        fetchWordDefinition(answer)
            .then(async (def) => {
                if (def?.meaning) {
                    const germanTranslation = await translateToGerman(def.meaning);
                    const fullDef = { ...def, meaningGerman: germanTranslation ?? undefined };
                    setWordDefinition(fullDef);

                    if (userId) {
                        void saveWordDefinition(
                            userId,
                            answer,
                            {
                                partOfSpeech: def.partOfSpeech,
                                meaning: def.meaning,
                                meaningGerman: germanTranslation ?? undefined,
                            },
                            difficulty
                        );
                    }
                } else {
                    setWordDefinition(def);
                }
            })
            .catch(() => {
                setWordDefinition(null);
            })
            .finally(() => {
                setIsWordDefinitionLoading(false);
            });
    }, [gameOver.done, answer, userId, difficulty]);

    const durationSec = useMemo(() => {
        if (!startedAtMs) return 0;
        const effectiveNow = endedAtMs ?? nowMs;
        return Math.max(0, (effectiveNow - startedAtMs) / 1000);
    }, [startedAtMs, nowMs, endedAtMs]);

    const keyMarks = useMemo(() => {
        const best: Record<string, any> = {};
        const rank = (m: any) => (m === "correct" ? 3 : m === "present" ? 2 : 1);

        for (const r of rows) {
            if (!r.marks) continue;
            for (let i = 0; i < 5; i++) {
                const ch = r.guess[i];
                const m = r.marks[i];
                if (!best[ch] || rank(m) > rank(best[ch])) best[ch] = m;
            }
        }
        return best;
    }, [rows]);

    async function startNewGameInternal() {
        answerLockedRef.current = false;
        saveActiveGame(GAME_ID, null, userId);
        if (!solutions.length) return;

        const availableWords = solutions.filter((word) => !playedWords.has(word.toUpperCase()));
        let a: string;
        if (availableWords.length === 0) {
            showToast("You've played all words! Starting fresh...");
            setPlayedWords(new Set());
            a = pickRandom(solutions);
        } else {
            a = pickRandom(availableWords);
        }

        setRows(
            Array.from({ length: MAX_TRIES }, () => ({
                guess: "",
                marks: null,
                revealed: false,
            })),
        );
        setCurrent("");
        setToast("");
        setHintUsed(false);
        setStartedAtMs(null);
        setEndedAtMs(null);
        setAnswer(a);

        if (userId) {
            const s = await createOrReuseActiveSession({
                userId,
                difficulty,
                answer: a,
                startedAtMs: Date.now(),
            });
            if (s) setSessionId(s.id);
        } else {
            setSessionId(null);
        }
        window.setTimeout(() => containerRef.current?.focus(), 0);
    }

    function newGame() {
        void startNewGameInternal();
    }

    async function forfeitCurrentGame() {
        const ended = Date.now();
        const d = startedAtMs ? Math.max(0, (ended - startedAtMs) / 1000) : 0;
        setStats(applyGameResult(stats, { outcome: "lose", durationSec: d }));
        if (userId) {
            void trackPlayedWord(userId, difficulty, answer);
        }
        if (sessionId) {
            await endSession({
                sessionId,
                outcome: "forfeit",
                guessesUsed: committedCount,
                durationSec: d,
                endedAtMs: ended,
            });
            setSessionId(null);
            return;
        }
        if (userId) {
            const active = await fetchActiveSession(userId);
            if (active?.id) {
                await endSession({
                    sessionId: active.id,
                    outcome: "forfeit",
                    guessesUsed: committedCount,
                    durationSec: d,
                    endedAtMs: ended,
                });
            }
            setSessionId(null);
        }
    }

    async function forfeitCurrentGameAndReset() {
        await forfeitCurrentGame();
        newGame();
    }

    async function endAnyActiveSession() {
        if (!userId) return;
        const active = await fetchActiveSession(userId);
        if (active?.id) {
            await endSession({
                sessionId: active.id,
                outcome: "forfeit",
                guessesUsed: committedCount > 0 ? committedCount : null,
                durationSec: durationSec,
                endedAtMs: Date.now(),
            });
        }
        setSessionId(null);
    }

    async function applyDifficultyChange(d: Difficulty) {
        await endAnyActiveSession();
        setDifficulty(d);
        saveActiveGame(GAME_ID, null, userId);
        requestReset();
    }

    function requestDifficultyChange(d: Difficulty) {
        if (d === difficulty) return;
        if (!gameOver.done && committedCount > 0) {
            setPendingDifficulty(d);
            setConfirmDifficultyOpen(true);
            return;
        }
        void applyDifficultyChange(d);
    }

    function requestReset() {
        if (gameOver.done) {
            newGame();
            return;
        }
        if (committedCount > 0) {
            setConfirmResetOpen(true);
            return;
        }
        newGame();
    }

    function bumpShake() {
        setShakeNonce((n) => n + 1);
    }

    const isDev = process.env.NODE_ENV !== "production";

    async function devSolve() {
        if (gameOver.done || !answer) return;
        if (!startedAtMs) setStartedAtMs(Date.now());
        flushSync(() => setCurrent(answer));
        commitGuess();
    }

    async function devLose() {
        if (gameOver.done || !allowed.length) return;
        if (!startedAtMs) setStartedAtMs(Date.now());
        const wrong = (allowed.find((w) => w.toUpperCase() !== answer.toUpperCase()) ?? "AAAAA").toUpperCase();
        for (let i = committedCount; i < MAX_TRIES; i++) {
            flushSync(() => setCurrent(wrong));
            commitGuess();
            await new Promise(requestAnimationFrame);
        }
    }

    function onKey(k: string) {
        console.log('[WORDLE onKey] Called with:', k, 'gameOver.done:', gameOver.done);
        if (k === "ENTER") {
            console.log('[WORDLE onKey] ENTER pressed, calling commitGuess');
            return commitGuess();
        }
        if (k === "BACKSPACE") {
            console.log('[WORDLE onKey] BACKSPACE pressed');
            return setCurrent((s) => {
                if (s.length === 0) return s;
                const lastNonSpaceIdx = s.search(/\S(?=\s*$)/);
                if (lastNonSpaceIdx === -1) return s.slice(0, -1);
                return s.slice(0, lastNonSpaceIdx) + " " + s.slice(lastNonSpaceIdx + 1);
            });
        }
        if (gameOver.done) {
            console.log('[WORDLE onKey] Blocked: gameOver.done is true');
            return;
        }
        if (!/^[A-Z]$/.test(k)) {
            console.log('[WORDLE onKey] Blocked: not a valid letter:', k);
            return;
        }
        if (keyMarks[k] === "absent") {
            console.log('[WORDLE onKey] Blocked: key is absent:', k);
            return;
        }
        console.log('[WORDLE onKey] Setting current with letter:', k);
        setCurrent((s) => {
            const gapIndex = s.indexOf(" ");
            if (gapIndex !== -1) {
                return s.slice(0, gapIndex) + k + s.slice(gapIndex + 1);
            }
            if (s.length >= 5) return s;
            return s + k;
        });
    }

    function onDeleteChar(index: number) {
        setCurrent((s) => s.slice(0, index) + " " + s.slice(index + 1));
    }

    function commitGuess() {
        if (gameOver.done) return;
        if (current.length !== 5) {
            bumpShake();
            return showToast("Not enough letters");
        }
        const guess = current.toUpperCase();
        if (!allowed.includes(guess)) {
            bumpShake();
            return;
        }
        const idx = rows.findIndex((r) => r.marks === null);
        if (idx === -1) return;
        const marks = scoreGuess(guess, answer);
        const next = rows.slice();
        next[idx] = { guess, marks, revealed: true };
        setRows(next);
        setCurrent("");
        if (!startedAtMs) {
            setStartedAtMs(Date.now());
        }
        const won = marks.every((m) => m === "correct");
        const lost = !won && idx === MAX_TRIES - 1;
        if (won) {
            if (difficulty === "easy" && hintUsed) {
                setStats(applyGameResult(stats, { outcome: "lose", durationSec }));
            } else {
                setStats(applyGameResult(stats, { outcome: "win", guessesUsed: (idx + 1) as any, durationSec }));
            }
            if (userId) void trackPlayedWord(userId, difficulty, answer);
        } else if (lost) {
            showToast(`Answer: ${answer}`);
            setStats(applyGameResult(stats, { outcome: "lose", durationSec }));
            if (userId) void trackPlayedWord(userId, difficulty, answer);
            if (sessionId) void endSession({ sessionId, outcome: "lose", guessesUsed: null, durationSec, endedAtMs: Date.now() });
        }
    }

    async function share() {
        const scored = rows.filter((r) => r.marks);
        if (scored.length === 0) return;
        const lines = scored.map((r) => marksToEmoji(r.marks!));
        const header = `BataGames • ${gameOver.won ? scored.length : "X"}/${MAX_TRIES} • ${formatDuration(Math.round(durationSec))}`;
        const text = [header, ...lines].join("\n");
        try {
            await navigator.clipboard.writeText(text);
            showToast("Copied to clipboard");
        } catch {
            showToast("Copy failed");
        }
    }

    const ghost = current.padEnd(5, " ");
    console.log('[WORDLE] ghost:', JSON.stringify(ghost), 'activeRowIndex:', activeRowIndex);
    const viewRows: GridRow[] = useMemo(() => {
        console.log('[WORDLE useMemo] Running with ghost:', JSON.stringify(ghost), 'answer:', answer);
        if (!answer) {
            return Array.from({ length: MAX_TRIES }, () => ({
                guess: "     ",
                marks: null,
                revealed: false,
            }));
        }
        return rows.map((r, i) => {
            if (r.marks) return r;
            if (i === activeRowIndex) return { guess: ghost, marks: null, revealed: false };
            return { guess: "     ", marks: null, revealed: false };
        });
    }, [answer, rows, activeRowIndex, ghost]);

    const committedRows = useMemo(
        () => rows.filter((r) => r.marks).map((r) => ({ guess: r.guess, marks: r.marks! })),
        [rows]
    );

    function onHint(h: HintResult) {
        if (hintUsed) return;
        setHintUsed(true);
        consumeHint(difficulty);
        setToast(`Position ${h.index + 1} is "${h.letter}"`);
        window.setTimeout(() => setToast(""), 5000);
    }

    function onRequestHint() {
        if (difficulty !== "easy") {
            triggerHintReveal();
            return;
        }
        if (getHintNoRemind()) {
            triggerHintReveal();
        } else {
            setHintWarningOpen(true);
            setHintNoRemindChecked(false);
        }
    }

    function triggerHintReveal() {
        const revealFn = (window as unknown as { __revealHint?: () => void }).__revealHint;
        if (revealFn) revealFn();
    }

    function confirmHint() {
        if (hintNoRemindChecked) {
            setHintNoRemind(true);
        }
        setHintWarningOpen(false);
        triggerHintReveal();
    }

    return (
        <GameShell
            gameId={GAME_ID}
            gameName="Wordle"
            onNewGame={requestReset}
            difficulty={difficulty}
            onDifficultyChange={requestDifficultyChange}
            timerText={formatDuration(Math.round(durationSec))}
            onOpenStats={() => setStatsOpen(true)}
            onOpenWordHistory={() => setWordHistoryOpen(true)}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            fullHeight={true}
            hintSlot={
                !gameOver.done && answer ? (
                    <Hint
                        answer={answer}
                        disabled={hintUsed || committedCount === 0 || getRemainingHints(difficulty) <= 0}
                        revealedMarks={committedRows}
                        answerLength={5}
                        hintUsedThisGame={hintUsed}
                        remainingHints={getRemainingHints(difficulty)}
                        onHint={onHint}
                        onRequestHint={onRequestHint}
                    />
                ) : null
            }
            actionsSlot={
                committedCount > 0 && !gameOver.done ? (
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
            {/* Main content wrapper */}
            <div
                ref={containerRef}
                tabIndex={0}
                className="flex flex-col w-full h-full min-w-0 outline-none"
                onKeyDown={(e) => {
                    const t = e.target as HTMLElement | null;
                    if ((t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) || leaderboardOpen || statsOpen) return;
                    if (e.key === "Enter") onKey("ENTER");
                    else if (e.key === "Backspace") onKey("BACKSPACE");
                    else if (/^[A-Z]$/i.test(e.key)) onKey(e.key.toUpperCase());
                }}
            >
                {/* Toast */}
                <div className="h-6 text-center text-sm text-[color:var(--muted)] shrink-0">{toast}</div>

                {/* Grid area - centered with max-width */}
                <div className="max-w-md mx-auto w-full flex-1 flex flex-col items-center justify-center py-2 overflow-hidden relative">
                    <Grid rows={viewRows} activeRowIndex={activeRowIndex} shakeRowNonce={shakeNonce} onDeleteChar={onDeleteChar} />
                </div>

                {/* Keyboard - constrained to parent width with iPhone safe areas */}
                <div className="shrink-0 pb-safe mb-1 w-full max-w-lg mx-auto px-2 sm:px-4" ref={keyboardRef}>
                    <Keyboard
                        keyMarks={keyMarks}
                        onKey={onKey}
                        disabled={gameOver.done}
                    />
                </div>

                {/* Floating Dev Buttons (only in development) */}
                {isDev && (
                    <div
                        className="fixed bottom-20 left-4 z-50 flex flex-col gap-1 p-1 rounded-xl bg-zinc-900/80 border border-zinc-700/50 backdrop-blur-sm shadow-lg cursor-move select-none"
                        style={{ touchAction: 'none' }}
                        onMouseDown={(e) => {
                            const el = e.currentTarget;
                            const rect = el.getBoundingClientRect();
                            const offsetX = e.clientX - rect.left;
                            const offsetY = e.clientY - rect.top;
                            const onMove = (ev: MouseEvent) => {
                                el.style.left = `${ev.clientX - offsetX}px`;
                                el.style.top = `${ev.clientY - offsetY}px`;
                                el.style.bottom = 'auto';
                            };
                            const onUp = () => {
                                document.removeEventListener('mousemove', onMove);
                                document.removeEventListener('mouseup', onUp);
                            };
                            document.addEventListener('mousemove', onMove);
                            document.addEventListener('mouseup', onUp);
                        }}
                        onTouchStart={(e) => {
                            const el = e.currentTarget;
                            const touch = e.touches[0];
                            const rect = el.getBoundingClientRect();
                            const offsetX = touch.clientX - rect.left;
                            const offsetY = touch.clientY - rect.top;
                            const onMove = (ev: TouchEvent) => {
                                const t = ev.touches[0];
                                el.style.left = `${t.clientX - offsetX}px`;
                                el.style.top = `${t.clientY - offsetY}px`;
                                el.style.bottom = 'auto';
                            };
                            const onEnd = () => {
                                document.removeEventListener('touchmove', onMove);
                                document.removeEventListener('touchend', onEnd);
                            };
                            document.addEventListener('touchmove', onMove, { passive: false });
                            document.addEventListener('touchend', onEnd);
                        }}
                    >
                        <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider px-1">DEV</div>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void devSolve(); window.setTimeout(() => containerRef.current?.focus(), 0); }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-[10px] font-semibold transition"
                        >
                            <CheckCircle2 size={12} /> Win
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void devLose(); window.setTimeout(() => containerRef.current?.focus(), 0); }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 text-[10px] font-semibold transition"
                        >
                            <Skull size={12} /> Lose
                        </button>
                    </div>
                )}
            </div>

            <StatsModal
                open={statsOpen}
                onClose={() => setStatsOpen(false)}
                stats={stats}
                onShare={share}
                onLeaderboard={() => { setStatsOpen(false); setLeaderboardOpen(true); }}
            />

            <Leaderboard
                open={leaderboardOpen}
                onClose={() => setLeaderboardOpen(false)}
                gameId={GAME_ID}
            />

            <WordHistory
                open={wordHistoryOpen}
                onClose={() => setWordHistoryOpen(false)}
            />

            {/* Game Result Overlay */}
            <GameResultOverlay
                open={gameOver.done}
                outcome={gameOver.won ? 'win' : 'lose'}
                title={gameOver.won ? 'You Won!' : 'Game Over'}
                subtitle={gameOver.won ? `Solved in ${committedCount} tries` : undefined}
                onPlayAgain={newGame}
                onOpenStats={() => setStatsOpen(true)}
                playAgainLabel="New Game"
            >
                {/* Answer */}
                <div className="text-center">
                    <div className="text-2xl font-bold text-[color:var(--fg)] uppercase tracking-widest mb-1">{answer}</div>
                    {/* Loading State */}
                    {isWordDefinitionLoading && (
                        <div className="py-2 space-y-2 animate-pulse">
                            <div className="h-4 bg-zinc-500/20 rounded-md w-3/4 mx-auto" />
                            <div className="h-4 bg-zinc-500/20 rounded-md w-1/2 mx-auto" />
                        </div>
                    )}

                    {/* Loaded State */}
                    {!isWordDefinitionLoading && wordDefinition && (
                        <div className="text-sm text-[color:var(--muted)] space-y-1">
                            <div>
                                {wordDefinition.partOfSpeech && (
                                    <span className="italic">{translatePartOfSpeech(wordDefinition.partOfSpeech)}: </span>
                                )}
                                {wordDefinition.meaning}
                            </div>
                            {wordDefinition.meaningGerman ? (
                                <div className="pt-1 border-t border-[color:var(--border)]/50 italic">
                                    🇩🇪 {wordDefinition.meaningGerman}
                                </div>
                            ) : (
                                <div className="pt-1 border-t border-[color:var(--border)]/50 italic opacity-50 text-xs">
                                    Keine deutsche Übersetzung verfügbar
                                </div>
                            )}
                        </div>
                    )}

                    {/* Failed / Empty State */}
                    {!isWordDefinitionLoading && !wordDefinition && (
                        <div className="text-xs text-[color:var(--muted)] italic opacity-50 py-2">
                            (Definition nicht verfügbar)
                        </div>
                    )}
                </div>
            </GameResultOverlay>

            <Modal open={hintWarningOpen} title="Use a hint?" onClose={() => setHintWarningOpen(false)} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setHintWarningOpen(false)} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">Cancel</button>
                    <button type="button" onClick={confirmHint} className="rounded-xl border border-[color:var(--border)] bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30">Use Hint</button>
                </div>
            }>
                <div className="flex flex-col gap-3">
                    <div className="text-sm text-[color:var(--fg)]/85">
                        Hints are free in Easy Mode. In other modes, they count as a loss if you win using one.
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox id="hintNoRemind" checked={hintNoRemindChecked} onCheckedChange={(c) => setHintNoRemindChecked(!!c)} />
                        <label htmlFor="hintNoRemind" className="text-sm text-[color:var(--muted)] cursor-pointer select-none">
                            Don&apos;t ask again
                        </label>
                    </div>
                </div>
            </Modal>

            <Modal open={confirmResetOpen} title="Reset game?" onClose={() => setConfirmResetOpen(false)} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setConfirmResetOpen(false)} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">Cancel</button>
                    <button type="button" onClick={forfeitCurrentGameAndReset} className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30">Reset (counts as loss)</button>
                </div>
            }>
                <div className="text-sm text-[color:var(--fg)]/85">You have active guesses. Resetting now will count as a loss.</div>
            </Modal>

            <Modal open={confirmDifficultyOpen} title="Change difficulty?" onClose={() => { setConfirmDifficultyOpen(false); setPendingDifficulty(null); }} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => { setConfirmDifficultyOpen(false); setPendingDifficulty(null); }} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">Cancel</button>
                    <button type="button" onClick={() => { const next = pendingDifficulty; setConfirmDifficultyOpen(false); setPendingDifficulty(null); if (next) void applyDifficultyChange(next); }} className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30">Switch (counts as loss)</button>
                </div>
            }>
                <div className="text-sm text-[color:var(--fg)]/85">You have active guesses. Switching difficulty now will forfeit this game and count as a loss.</div>
            </Modal>

            <Modal open={definitionPopupOpen} title="Word Definition" onClose={() => setDefinitionPopupOpen(false)} footer={
                <div className="flex justify-end">
                    <button type="button" onClick={() => setDefinitionPopupOpen(false)} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">Close</button>
                </div>
            }>
                {wordDefinition && (
                    <div className="flex flex-col gap-2">
                        <div className="text-2xl font-bold text-center uppercase tracking-widest mb-2">{answer}</div>
                        {wordDefinition.partOfSpeech && (
                            <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                                {translatePartOfSpeech(wordDefinition.partOfSpeech)}
                                <span className="mx-1 opacity-50">•</span>
                                <span className="lowercase italic opacity-75">{wordDefinition.partOfSpeech}</span>
                            </div>
                        )}
                        <div className="text-base text-[color:var(--fg)]/90 leading-relaxed">{wordDefinition.meaning}</div>
                        {wordDefinition.meaningGerman && (
                            <div className="text-sm text-[color:var(--muted)] leading-relaxed mt-2 pt-2 border-t border-[color:var(--border)]/50 italic">
                                🇩🇪 {wordDefinition.meaningGerman}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </GameShell>
    );
}
