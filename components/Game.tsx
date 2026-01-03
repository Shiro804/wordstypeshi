"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { RotateCcw, Skull, CheckCircle2 } from "lucide-react";
import { Mark, marksToEmoji, pickRandom, scoreGuess } from "@/lib/game";
import { loadWordLists } from "@/lib/words";
import type { Difficulty } from "@/lib/difficulty";
import { loadDifficulty, saveDifficulty } from "@/lib/settings-storage";
import { loadGameState, saveGameState } from "@/lib/game-state";
import Grid, { type GridRow } from "@/components/Grid";
import Keyboard from "@/components/Keyboard";
import Modal from "@/components/Modal";
import TopBar from "@/components/TopBar";
import Settings from "@/components/Settings";
import Leaderboard from "@/components/Leaderboard";
import { applyTheme } from "@/lib/theme";
import Hint, { type HintResult } from "@/components/Hint";
import {
  applyGameResult,
  formatDuration,
  loadStats,
  saveStats,
  type Stats,
} from "@/lib/storage";
import { fetchRemoteStats, getCurrentUserId, upsertRemoteStats } from "@/lib/stats-sync";
import { createOrReuseActiveSession, endSession, fetchActiveSession } from "@/lib/sessions-sync";
import { fetchPlayedWords, trackPlayedWord } from "@/lib/played-words";

const MAX_TRIES = 6;

export default function Game() {
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
  const [userId, setUserId] = useState<string | null>(null);

  const [hintUsed, setHintUsed] = useState(false);

  const theme = "dark" as const;

  // timer
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [endedAtMs, setEndedAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const didInitSessionRef = useRef(false);

  // Resolve current user once.
  useEffect(() => {
    getCurrentUserId().then((uid) => setUserId(uid));
  }, []);

  // Restore active session once after login (do not override manual difficulty changes).
  useEffect(() => {
    if (!userId) return;
    if (didInitSessionRef.current) return;
    didInitSessionRef.current = true;

    (async () => {
      const active = await fetchActiveSession(userId);
      if (active) {
        setSessionId(active.id);
        setDifficulty(active.difficulty);
        setAnswer(active.answer);
        setStartedAtMs(Date.parse(active.started_at));
        setEndedAtMs(null);
      }
    })();
  }, [userId]);

  // Load word lists whenever difficulty changes.
  useEffect(() => {
    loadWordLists(difficulty).then(({ allowed, solutions }) => {
      setAllowed(allowed);
      setSolutions(solutions);
    });
  }, [difficulty]);

  // Load played words for this user + difficulty.
  useEffect(() => {
    if (!userId) return;
    fetchPlayedWords(userId, difficulty).then((played) => {
      setPlayedWords(played);
    });
  }, [userId, difficulty]);

  // Load remote stats whenever user or difficulty changes.
  useEffect(() => {
    // Always keep local stats in sync for the selected difficulty.
    const local = loadStats(difficulty);
    setStats(local);

    if (!userId) return;

    (async () => {
      const remote = await fetchRemoteStats(userId, difficulty);
      if (remote) {
        const pick = (remote.updatedAt ?? 0) >= (local.updatedAt ?? 0) ? remote : local;
        setStats(pick);
      }
    })();
  }, [userId, difficulty]);

  useEffect(() => {
    applyTheme();
  }, [theme]);

  useEffect(() => {
    if (!solutions.length) return;

    const persisted = loadGameState();
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
  }, [solutions.length, difficulty]);

  useEffect(() => {
    saveStats(difficulty, stats);
    if (!userId) return;
    void upsertRemoteStats(userId, difficulty, stats);
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
    });
  }, [difficulty, answer, rows, current, startedAtMs, endedAtMs, hintUsed]);

  useEffect(() => {
    saveDifficulty(difficulty);
  }, [difficulty]);

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
    if (gameOver.done) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [gameOver.done]);

  const activeRowIndex = useMemo(() => {
    const idx = rows.findIndex((r) => r.marks === null);
    return idx === -1 ? MAX_TRIES - 1 : idx;
  }, [rows]);

  useEffect(() => {
    if (!gameOver.done) return;
    if (!startedAtMs) return;
    setEndedAtMs((prev) => prev ?? Date.now());
  }, [gameOver.done, startedAtMs]);

  const durationSec = useMemo(() => {
    if (!startedAtMs) return 0;
    const effectiveNow = endedAtMs ?? nowMs;
    return Math.max(0, (effectiveNow - startedAtMs) / 1000);
  }, [startedAtMs, nowMs, endedAtMs]);

  const keyMarks = useMemo(() => {
    const best: Record<string, Mark> = {};
    const rank = (m: Mark) => (m === "correct" ? 3 : m === "present" ? 2 : 1);

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
    saveGameState(null);

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

    // Reset everything FIRST, then set answer LAST (prevents flash of new word)
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

    // Answer LAST - grid is already cleared
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

    // End the active session if we have one.
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

    // If for some reason sessionId isn't set, still try to end any active session
    // so it can't override difficulty on refresh.
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
    // Ensure no active session remains that could override difficulty on refresh.
    await endAnyActiveSession();

    setDifficulty(d);
    saveGameState(null);
    setSettingsOpen(false);
  }

  function requestDifficultyChange(d: Difficulty) {
    if (d === difficulty) {
      setSettingsOpen(false);
      return;
    }

    // If the user has started playing, changing difficulty counts as a forfeit/loss.
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
    if (gameOver.done) return;
    if (!answer) return;
    if (!startedAtMs) setStartedAtMs(Date.now());

    // Ensure `current` is updated before committing (React state batching).
    flushSync(() => setCurrent(answer));
    commitGuess();
  }

  async function devLose() {
    if (gameOver.done) return;
    if (!allowed.length) return;
    if (!startedAtMs) setStartedAtMs(Date.now());

    // Pick a valid wrong word to satisfy normal validation.
    const wrong = (allowed.find((w) => w.toUpperCase() !== answer.toUpperCase()) ?? "AAAAA").toUpperCase();

    // Fill remaining rows with wrong guesses.
    for (let i = committedCount; i < MAX_TRIES; i++) {
      flushSync(() => setCurrent(wrong));
      commitGuess();
      // Let React paint between commits.
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
      showToast("Nice 🎉");
      setStats(
        applyGameResult(stats, {
          outcome: "win",
          guessesUsed: (idx + 1) as 1 | 2 | 3 | 4 | 5 | 6,
          durationSec,
        })
      );
      if (userId) {
        void trackPlayedWord(userId, difficulty, answer);
      }
    } else if (lost) {
      showToast(`Answer: ${answer}`);
      setStats(applyGameResult(stats, { outcome: "lose", durationSec }));
      if (userId) {
        void trackPlayedWord(userId, difficulty, answer);
      }
      if (sessionId) {
        void endSession({
          sessionId,
          outcome: "lose",
          guessesUsed: null,
          durationSec,
          endedAtMs: Date.now(),
        });
      }
    }
  }

  async function share() {
    const scored = rows.filter((r) => r.marks);
    if (scored.length === 0) return;

    const lines = scored.map((r) => marksToEmoji(r.marks!));
    const header = `WordsTypeShi • ${gameOver.won ? scored.length : "X"}/${MAX_TRIES} • ${formatDuration(
      Math.round(durationSec)
    )}`;
    const text = [header, ...lines].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard");
    } catch {
      showToast("Copy failed");
    }
  }

  const ghost = current.padEnd(5, " ");

  // Show empty grid if no answer yet (prevents flash of new word)
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
    if (h.type === "reveal") showToast(`Revealed ${h.letter} at ${h.index + 1}`);
    else showToast(h.letters.length ? `Not in word: ${h.letters.join(", ")}` : "");
  }

  const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const distMax = Math.max(1, ...Object.values(stats.distribution));

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="outline-none"
      onKeyDown={(e) => {
        const t = e.target as HTMLElement | null;
        const isTypingField =
          t instanceof HTMLInputElement ||
          t instanceof HTMLTextAreaElement ||
          (t?.isContentEditable ?? false);

        if (isTypingField || settingsOpen || leaderboardOpen || statsOpen) {
          return;
        }

        if (e.key === "Enter") onKey("ENTER");
        else if (e.key === "Backspace") onKey("BACKSPACE");
        else {
          const k = e.key.toUpperCase();
          if (/^[A-Z]$/.test(k)) onKey(k);
        }
      }}
    >
      {/* Main container: CSS Grid layout for guaranteed header/content/footer fit */}
      <div
        className="grid h-[100dvh] w-full overflow-hidden bg-[color:var(--bg)] text-[color:var(--fg)]"
        style={{
          gridTemplateRows: "auto 1fr auto",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* Subtle background blurs */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-yellow-500/15 blur-3xl" />
        </div>

        {/* HEADER: TopBar with timer + hint */}
        <TopBar
          onNew={requestReset}
          onShare={share}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenStats={() => setStatsOpen(true)}
          difficulty={difficulty}
          timerText={formatDuration(Math.round(durationSec))}
          hintSlot={
            !gameOver.done ? (
              <Hint
                disabled={hintUsed || committedCount === 0}
                revealedMarks={committedRows}
                answerLength={5}
                onHint={onHint}
              />
            ) : null
          }
          actionsSlot={
            <div className="flex items-center gap-1">
              {/* Reset button: appears after the first committed guess; asks for confirmation (forfeit) */}
              {committedCount > 0 && !gameOver.done ? (
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  title="Reset"
                  aria-label="Reset"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                >
                  <RotateCcw size={16} />
                </button>
              ) : null}

              {/* Dev-only helpers */}
              {isDev ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void devLose();
                      window.setTimeout(() => containerRef.current?.focus(), 0);
                    }}
                    title="Simulate lose"
                    aria-label="Simulate lose"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                  >
                    <Skull size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void devSolve();
                      window.setTimeout(() => containerRef.current?.focus(), 0);
                    }}
                    title="Simulate solve"
                    aria-label="Simulate solve"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                </>
              ) : null}
            </div>
          }
        />

        {/* MAIN: Scrollable content area with Grid */}
        <main className="flex min-h-0 flex-col items-center justify-center overflow-hidden px-4">
          {/* Toast */}
          <div className="h-6 text-center text-sm text-[color:var(--muted)]">{toast}</div>

          {/* Game over banner */}
          <div className="h-10 flex items-center justify-center">
            {gameOver.won ? (
              <div className="text-2xl font-extrabold tracking-[0.15em] text-emerald-300 drop-shadow">
                YOU WON
              </div>
            ) : gameOver.lost ? (
              <div className="text-2xl font-extrabold tracking-[0.15em] text-rose-400 drop-shadow">
                GAME OVER
              </div>
            ) : null}
          </div>

          {/* Grid */}
          <div className="py-2">
            <Grid rows={viewRows} activeRowIndex={activeRowIndex} shakeRowNonce={shakeNonce} onDeleteChar={onDeleteChar} />
          </div>

          {/* Answer reveal on loss */}
          {gameOver.lost && committedCount > 0 && (
            <div className="pt-2 text-center">
              <div className="text-xs text-[color:var(--muted)]">The word was:</div>
              <div className="text-xl font-bold text-[color:var(--fg)] uppercase tracking-widest">
                {answer}
              </div>
            </div>
          )}
        </main>

        {/* FOOTER: Keyboard (fixed to bottom) */}
        <div
          ref={keyboardRef}
          className="border-t border-[color:var(--border)] bg-[color:var(--bg)]/92 backdrop-blur"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto w-full max-w-[560px] px-3 py-2">
            {gameOver.done ? (
              <div className="pb-2">
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      newGame();
                      window.setTimeout(() => containerRef.current?.focus(), 0);
                    }}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--fg)] shadow-sm transition hover:bg-[color:var(--surface2)]"
                  >
                    New Game
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--fg)] shadow-sm transition hover:bg-[color:var(--surface2)]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M20 19V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M12 19V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M8 19V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M16 19V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>Results</span>
                  </button>
                </div>
              </div>
            ) : null}

            <Keyboard keyMarks={keyMarks} onKey={onKey} disabled={gameOver.done} />
          </div>
        </div>
      </div>

      <Leaderboard open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        difficulty={difficulty}
        onDifficultyChange={requestDifficultyChange}
      />

      <Modal
        open={confirmResetOpen}
        title="Reset game?"
        onClose={() => setConfirmResetOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmResetOpen(false)}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmResetOpen(false);
                forfeitCurrentGameAndReset();
              }}
              className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30"
            >
              Reset (counts as loss)
            </button>
          </div>
        }
      >
        <div className="text-sm text-[color:var(--fg)]/85">
          You already made guesses. Resetting now will count as a loss.
        </div>
      </Modal>

      <Modal
        open={confirmDifficultyOpen}
        title="Change difficulty?"
        onClose={() => {
          setConfirmDifficultyOpen(false);
          setPendingDifficulty(null);
        }}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmDifficultyOpen(false);
                setPendingDifficulty(null);
              }}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const next = pendingDifficulty;
                setConfirmDifficultyOpen(false);
                setPendingDifficulty(null);
                // Count as forfeit/loss, then switch difficulty.
                // IMPORTANT: don't start a new game on the old difficulty.
                void (async () => {
                  await forfeitCurrentGame();
                  if (next) await applyDifficultyChange(next);
                })();
              }}
              className="rounded-xl border border-[color:var(--border)] bg-rose-500/20 px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-rose-500/30"
            >
              Switch (counts as loss)
            </button>
          </div>
        }
      >
        <div className="text-sm text-[color:var(--fg)]/85">
          You already made guesses. Switching difficulty now will forfeit this game and count as a loss.
        </div>
      </Modal>

      <Modal
        open={statsOpen}
        title="Stats"
        onClose={() => {
          setStatsOpen(false);
        }}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={share}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
            >
              Share
            </button>
            <button
              type="button"
              onClick={() => {
                setStatsOpen(false);
                setLeaderboardOpen(true);
              }}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
            >
              Leaderboard
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Played" value={stats.played} />
          <StatCard label="Win rate" value={`${winRate}%`} />
          <StatCard label="Streak" value={stats.currentStreak} />
          <StatCard label="Max streak" value={stats.maxStreak} />
          <StatCard
            label="Best time"
            value={stats.bestTimeSec == null ? "–" : formatDuration(stats.bestTimeSec)}
          />
          <StatCard
            label="Avg time"
            value={stats.avgTimeSec == null ? "–" : formatDuration(stats.avgTimeSec)}
          />
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            Guess distribution
          </div>
          <div className="grid gap-2">
            {(Array.from({ length: 6 }).map((_, i) => (i + 1) as 1 | 2 | 3 | 4 | 5 | 6)).map((n) => (
              <BarRow key={n} n={n} value={stats.distribution[n]} max={distMax} />
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
      <div className="mt-1 text-lg font-bold text-[color:var(--fg)]">{value}</div>
    </div>
  );
}

function BarRow({ n, value, max }: { n: number; value: number; max: number }) {
  const pct = Math.round((value / Math.max(1, max)) * 100);

  const barColor =
    n === 1 ? "bg-emerald-500/60" :
      n === 2 ? "bg-lime-500/50" :
        n === 3 ? "bg-yellow-500/50" :
          n === 4 ? "bg-amber-500/50" :
            n === 5 ? "bg-orange-500/50" :
              "bg-red-500/50";

  return (
    <div className="flex items-center gap-3">
      <div className="w-4 text-right text-xs font-semibold text-[color:var(--muted)]">{n}</div>
      <div className="relative h-7 flex-1 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
        <div
          className={`h-full rounded-xl ${barColor}`}
          style={{ width: `${pct}%` }}
          aria-label={`${n}: ${value}`}
        />
        <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-semibold text-[color:var(--fg)]">
          {value}
        </div>
      </div>
    </div>
  );
}