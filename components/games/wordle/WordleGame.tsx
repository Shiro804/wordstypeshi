"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { RotateCcw, Skull, CheckCircle2, Book } from "lucide-react";
import { marksToEmoji, pickRandom, scoreGuess } from "@/lib/game";
import { loadWordLists } from "@/lib/words";
import type { Difficulty } from "@/lib/difficulty";
import { loadDifficulty, saveDifficulty } from "@/lib/storage/settings-storage";
import { loadGameState, saveGameState } from "@/lib/storage/game-state";
import Grid, { type GridRow } from "@/components/games/common/Grid";
import Keyboard from "@/components/games/common/Keyboard";
import Modal from "@/components/games/common/Modal";
import Settings from "@/components/games/common/Settings";
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
import { Checkbox } from "@/components/ui/checkbox";
import { fetchWordDefinition, translatePartOfSpeech, translateToGerman, type WordDefinition } from "@/lib/dictionary";
import { saveWordDefinition } from "@/lib/word-definitions";
import { useGameBackground } from "@/lib/hooks/useGameBackground";
import GameShell from "@/components/shared/GameShell";
import StatsModal from "@/components/shared/StatsModal";

const MAX_TRIES = 6;
const GAME_ID = "wordle";

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

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);
    const [wordHistoryOpen, setWordHistoryOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const [hintUsed, setHintUsed] = useState(false);
    const [hintWarningOpen, setHintWarningOpen] = useState(false);
    const [hintNoRemindChecked, setHintNoRemindChecked] = useState(false);

    const { background: customBackground, setBackground: setCustomBackground, isLoading: backgroundLoading } = useGameBackground(GAME_ID);
    const [wordDefinition, setWordDefinition] = useState<WordDefinition | null>(null);
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
        loadWordLists(difficulty).then(({ allowed, solutions }) => {
            setAllowed(allowed);
            setSolutions(solutions);
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
        if (!solutions.length) return;
        const persisted = loadGameState(userId);
        if (persisted && persisted.answer && persisted.difficulty === difficulty) {
            setAnswer(persisted.answer);
            setRows(persisted.rows);
            setCurrent(persisted.current);
            setStartedAtMs(persisted.startedAtMs);
            setEndedAtMs(persisted.endedAtMs);
            setHintUsed(persisted.hintUsed);
            window.setTimeout(() => containerRef.current?.focus(), 0);
            return;
        }
        newGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [solutions.length, difficulty, userId]);

    useEffect(() => {
        saveStats(difficulty, stats);
        if (!userId) return;
        void upsertRemoteGameStats(userId, GAME_ID, difficulty, stats);
    }, [difficulty, stats, userId]);

    useEffect(() => {
        if (!answer) return;
        saveGameState({
            v: 1,
            difficulty,
            answer,
            rows,
            current,
            startedAtMs,
            endedAtMs,
            hintUsed,
            userId,
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
            return;
        }
        fetchWordDefinition(answer).then(async (def) => {
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
        saveGameState(null, userId);
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
        saveGameState(null, userId);
        setSettingsOpen(false);
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
        if (k === "ENTER") return commitGuess();
        if (k === "BACKSPACE") return setCurrent((s) => {
            if (s.length === 0) return s;
            const lastNonSpaceIdx = s.search(/\S(?=\s*$)/);
            if (lastNonSpaceIdx === -1) return s.slice(0, -1);
            return s.slice(0, lastNonSpaceIdx) + " " + s.slice(lastNonSpaceIdx + 1);
        });
        if (gameOver.done) return;
        if (!/^[A-Z]$/.test(k)) return;
        if (keyMarks[k] === "absent") return;
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
        const header = `WordsTypeShi • ${gameOver.won ? scored.length : "X"}/${MAX_TRIES} • ${formatDuration(Math.round(durationSec))}`;
        const text = [header, ...lines].join("\n");
        try {
            await navigator.clipboard.writeText(text);
            showToast("Copied to clipboard");
        } catch {
            showToast("Copy failed");
        }
    }

    const ghost = current.padEnd(5, " ");
    const viewRows: GridRow[] = useMemo(() => {
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
            isLoading={backgroundLoading}
            onNewGame={requestReset}
            difficulty={difficulty}
            onDifficultyChange={requestDifficultyChange}
            timerText={formatDuration(Math.round(durationSec))}
            onOpenStats={() => setStatsOpen(true)}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            fullHeight={true}
            customBackground={customBackground}
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
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setWordHistoryOpen(true)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                        title="Word History"
                    >
                        <Book size={16} />
                    </button>
                    {committedCount > 0 && !gameOver.done && (
                        <button
                            type="button"
                            onClick={() => setConfirmResetOpen(true)}
                            title="Reset"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                        >
                            <RotateCcw size={16} />
                        </button>
                    )}
                    {isDev && (
                        <>
                            <button
                                type="button"
                                onClick={() => { void devLose(); window.setTimeout(() => containerRef.current?.focus(), 0); }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                            >
                                <Skull size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => { void devSolve(); window.setTimeout(() => containerRef.current?.focus(), 0); }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                            >
                                <CheckCircle2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            }
        >
            {/* Main content wrapper */}
            <div
                ref={containerRef}
                tabIndex={0}
                className="flex flex-col w-full h-full min-w-0 outline-none"
                onKeyDown={(e) => {
                    const t = e.target as HTMLElement | null;
                    if ((t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) || settingsOpen || leaderboardOpen || statsOpen) return;
                    if (e.key === "Enter") onKey("ENTER");
                    else if (e.key === "Backspace") onKey("BACKSPACE");
                    else if (/^[A-Z]$/i.test(e.key)) onKey(e.key.toUpperCase());
                }}
            >
                {/* Toast */}
                <div className="h-6 text-center text-sm text-[color:var(--muted)] shrink-0">{toast}</div>

                {/* Grid area - centered with max-width */}
                <div className="max-w-md mx-auto w-full flex-1 flex flex-col items-center justify-center py-2 overflow-hidden relative">
                    {gameOver.done && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                            <div className={`px-6 py-3 rounded-2xl backdrop-blur-md shadow-xl ${gameOver.won ? "bg-emerald-500/20 border border-emerald-400/40" : "bg-rose-500/20 border border-rose-400/40"}`}>
                                <div className={`text-xl sm:text-2xl font-extrabold tracking-[0.12em] drop-shadow ${gameOver.won ? "text-emerald-300" : "text-rose-400"}`}>
                                    {gameOver.won ? "YOU WON" : "GAME OVER"}
                                </div>
                            </div>
                        </div>
                    )}
                    <Grid rows={viewRows} activeRowIndex={activeRowIndex} shakeRowNonce={shakeNonce} onDeleteChar={onDeleteChar} />
                </div>

                {/* Word definition - centered */}
                {gameOver.done && committedCount > 0 && (
                    <div className="pt-2 pb-4 text-center max-w-md mx-auto px-4 shrink-0">
                        <div className="text-xs text-[color:var(--muted)]">{gameOver.won ? "The word:" : "The word was:"}</div>
                        <div className="text-xl font-bold text-[color:var(--fg)] uppercase tracking-widest">{answer}</div>
                        {wordDefinition && (
                            <>
                                <div className="hidden sm:block mt-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]/80 backdrop-blur-sm px-3 py-2">
                                    {wordDefinition.partOfSpeech && (
                                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                                            {translatePartOfSpeech(wordDefinition.partOfSpeech)}
                                            <span className="mx-1 opacity-50">•</span>
                                            <span className="lowercase italic opacity-75">{wordDefinition.partOfSpeech}</span>
                                        </div>
                                    )}
                                    <div className="text-sm text-[color:var(--fg)]/90 leading-snug mt-1">{wordDefinition.meaning}</div>
                                    {wordDefinition.meaningGerman && (
                                        <div className="text-sm text-[color:var(--muted)] leading-snug mt-1 pt-1 border-t border-[color:var(--border)]/50 italic">
                                            🇩🇪 {wordDefinition.meaningGerman}
                                        </div>
                                    )}
                                </div>
                                <div className="sm:hidden mt-2">
                                    <button type="button" onClick={() => setDefinitionPopupOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]/80 backdrop-blur-sm px-3 py-2 text-sm text-[color:var(--fg)] hover:bg-[color:var(--surface2)] transition">
                                        <span>📖</span><span>Definition anzeigen</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Keyboard - constrained to parent width */}
                <div className="shrink-0 pb-safe w-full px-1" ref={keyboardRef}>
                    <Keyboard
                        keyMarks={keyMarks}
                        onKey={onKey}
                        disabled={gameOver.done}
                    />
                </div>
            </div>

            <StatsModal
                open={statsOpen}
                onClose={() => setStatsOpen(false)}
                stats={stats}
                onShare={share}
                onLeaderboard={() => { setStatsOpen(false); setLeaderboardOpen(true); }}
            />

            {settingsOpen && (
                <Settings
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    gameId={GAME_ID}
                    currentBackground={customBackground}
                    difficulty={difficulty}
                    onDifficultyChange={requestDifficultyChange}
                    onBackgroundChange={(bg) => setCustomBackground(bg)}
                />
            )}

            <Leaderboard
                open={leaderboardOpen}
                onClose={() => setLeaderboardOpen(false)}
                gameId={GAME_ID}
            />

            <WordHistory
                open={wordHistoryOpen}
                onClose={() => setWordHistoryOpen(false)}
            />

            <Modal open={hintWarningOpen} title="Use a hint?" onClose={() => setHintWarningOpen(false)} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setHintWarningOpen(false)} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">Cancel</button>
                    <button type="button" onClick={confirmHint} className="rounded-xl border border-[color:var(--border)] bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/30">Use Hint</button>
                </div>
            }>
                <div className="space-y-4">
                    <div className="text-sm text-[color:var(--fg)]/85">
                        Using a hint will reveal a letter position. <br /><br />
                        <strong>Note for Easy Mode:</strong> This game will <strong>not count as a win</strong> in your statistics if you use a hint.
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox id="hint-no-remind" checked={hintNoRemindChecked} onCheckedChange={(c) => setHintNoRemindChecked(c === true)} />
                        <label htmlFor="hint-no-remind" className="text-sm text-[color:var(--muted)] cursor-pointer">Don&apos;t remind me again</label>
                    </div>
                </div>
            </Modal>

            <Modal open={confirmResetOpen} title="Reset game?" onClose={() => setConfirmResetOpen(false)} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setConfirmResetOpen(false)} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">Cancel</button>
                    <button type="button" onClick={() => { setConfirmResetOpen(false); forfeitCurrentGameAndReset(); }} className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30">Reset (counts as loss)</button>
                </div>
            }>
                <div className="text-sm text-[color:var(--fg)]/85">You already made guesses. Resetting now will count as a loss.</div>
            </Modal>

            <Modal open={confirmDifficultyOpen} title="Change difficulty?" onClose={() => { setConfirmDifficultyOpen(false); setPendingDifficulty(null); }} footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => { setConfirmDifficultyOpen(false); setPendingDifficulty(null); }} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]">Cancel</button>
                    <button type="button" onClick={() => { const next = pendingDifficulty; setConfirmDifficultyOpen(false); setPendingDifficulty(null); void (async () => { await forfeitCurrentGame(); if (next) await applyDifficultyChange(next); })(); }} className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30">Switch (counts as loss)</button>
                </div>
            }>
                <div className="text-sm text-[color:var(--fg)]/85">You already made guesses. Switching difficulty now will forfeit this game and count as a loss.</div>
            </Modal>

            {/* Mobile Definition Popup */}
            <Modal open={definitionPopupOpen} title="Word Definition" onClose={() => setDefinitionPopupOpen(false)}>
                {wordDefinition && (
                    <div className="space-y-3">
                        <div className="text-xl font-bold uppercase tracking-widest text-center text-[color:var(--fg)]">{answer}</div>
                        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]/50 p-3">
                            {wordDefinition.partOfSpeech && (
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                                    {translatePartOfSpeech(wordDefinition.partOfSpeech)}
                                    <span className="mx-1 opacity-50">•</span>
                                    <span className="lowercase italic opacity-75">{wordDefinition.partOfSpeech}</span>
                                </div>
                            )}
                            <div className="text-sm text-[color:var(--fg)]/90 leading-relaxed mt-1">{wordDefinition.meaning}</div>
                            {wordDefinition.meaningGerman && (
                                <div className="text-sm text-[color:var(--muted)] leading-relaxed mt-1 pt-1 border-t border-[color:var(--border)]/50 italic">
                                    🇩🇪 {wordDefinition.meaningGerman}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

        </GameShell>
    );
}
