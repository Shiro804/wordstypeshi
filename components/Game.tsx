"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Clock3, RotateCcw, Sparkles } from "lucide-react";
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
import { applyTheme, loadTheme, saveTheme, type Theme } from "@/lib/theme";
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [hintUsed, setHintUsed] = useState(false);

  const [theme, setTheme] = useState<Theme>(() => "dark");

  // timer
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [endedAtMs, setEndedAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setTheme(loadTheme());

    // Auth + remote stats + active session
    getCurrentUserId().then(async (uid) => {
      setUserId(uid);
      if (!uid) return;

      const active = await fetchActiveSession(uid);
      if (active) {
        setSessionId(active.id);
        setDifficulty(active.difficulty);
        setAnswer(active.answer);
        setStartedAtMs(Date.parse(active.started_at));
        setEndedAtMs(null);
      }

      const remote = await fetchRemoteStats(uid, difficulty);
      if (remote) {
        // Keep whichever one is newer (lets you keep playing offline too)
        const local = loadStats(difficulty);
        const pick = (remote.updatedAt ?? 0) >= (local.updatedAt ?? 0) ? remote : local;
        setStats(pick);
      } else {
        setStats(loadStats(difficulty));
      }
    });

    loadWordLists(difficulty).then(({ allowed, solutions }) => {
      setAllowed(allowed);
      setSolutions(solutions);
    });

    // Load previously played words for this difficulty
    if (userId) {
      fetchPlayedWords(userId, difficulty).then((played) => {
        setPlayedWords(played);
      });
    }
  }, [difficulty, userId]);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
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

    // Best-effort remote persistence (non-blocking)
    if (!userId) return;
    void upsertRemoteStats(userId, difficulty, stats);
  }, [difficulty, stats, userId]);

  // Persist active game locally to prevent reload-cheating.
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

  // Measure keyboard height so the grid can reserve space (prevents clipping on small iPhones).
  useLayoutEffect(() => {
    const measure = () => {
      const h = keyboardRef.current?.offsetHeight ?? 0;
      setKeyboardHeight(h);
    };

    measure();
    window.addEventListener("resize", measure);
    // iOS Safari: visualViewport changes when the URL bar collapses/expands
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
    // Freeze timer on first transition to game over.
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
    // starting a new game invalidates persisted state
    saveGameState(null);

    if (!solutions.length) return;

    // Pick a word that hasn't been played yet
    // Filter out already-played words
    const availableWords = solutions.filter((word) => !playedWords.has(word.toUpperCase()));

    if (availableWords.length === 0) {
      // If all words have been played, reset and pick any word
      showToast("You've played all words! Starting fresh...");
      setPlayedWords(new Set());
      var a = pickRandom(solutions);
    } else {
      var a = pickRandom(availableWords);
    }

    setAnswer(a);

    // Don't start the timer yet - it will start after the first guess
    setStartedAtMs(null);
    setEndedAtMs(null);

    // Create an active session in Supabase if logged in (prevents reload cheating across devices)
    if (userId) {
      const s = await createOrReuseActiveSession({
        userId,
        difficulty,
        answer: a,
        startedAtMs: Date.now(), // Session is created now, but timer hasn't started
      });
      if (s) setSessionId(s.id);
    } else {
      setSessionId(null);
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
    window.setTimeout(() => containerRef.current?.focus(), 0);
  }

  function newGame() {
    void startNewGameInternal();
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

  function onKey(k: string) {
    if (k === "ENTER") return commitGuess();
    if (k === "BACKSPACE") return setCurrent((s) => {
      if (s.length === 0) return s;
      // Remove last non-space character, or last character if all spaces at end
      const lastNonSpaceIdx = s.search(/\S(?=\s*$)/);
      if (lastNonSpaceIdx === -1) return s.slice(0, -1);
      return s.slice(0, lastNonSpaceIdx) + " " + s.slice(lastNonSpaceIdx + 1);
    });
    if (gameOver.done) return;

    if (!/^[A-Z]$/.test(k)) return;

    // Prevent typing letters that are marked as absent (greyed out)
    if (keyMarks[k] === "absent") return;

    setCurrent((s) => {
      // Check if there's a gap (space) to fill from left to right
      const gapIndex = s.indexOf(" ");
      if (gapIndex !== -1) {
        // Replace first gap from left (even if s.length === 5)
        return s.slice(0, gapIndex) + k + s.slice(gapIndex + 1);
      }

      // No gaps, only append if length < 5
      if (s.length >= 5) return s;

      // No gaps, append to the end
      return s + k;
    });
  }

  function onDeleteChar(index: number) {
    // Replace character at index with space (keep position, don't shift)
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

    // Start timer on first guess
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
      // Track the word as played
      if (userId) {
        void trackPlayedWord(userId, difficulty, answer);
      }
    } else if (lost) {
      showToast(`Answer: ${answer}`);
      setStats(applyGameResult(stats, { outcome: "lose", durationSec }));
      // Track the word as played (even if lost)
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
  const viewRows: GridRow[] = rows.map((r, i) => {
    if (r.marks) return r;
    if (i === activeRowIndex) return { guess: ghost, marks: null, revealed: false };
    return { guess: "     ", marks: null, revealed: false };
  });

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
        // Block game typing when a modal is open or when focusing an input.
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
      <div className="relative h-dvh w-full overflow-hidden bg-[color:var(--bg)] text-[color:var(--fg)] safe-top safe-bottom">
        {/* subtle background */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-yellow-500/15 blur-3xl" />
        </div>

        <div className="shrink-0" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <TopBar
            onNew={requestReset}
            onShare={share}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenStats={() => setStatsOpen(true)}
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            actionsSlot={
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Reset the whole game
                      requestReset();
                      window.setTimeout(() => containerRef.current?.focus(), 0);
                    }}
                    title="Reset"
                    aria-label="Reset"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              </>
            }
          />
        </div>

        <div
          className="mx-auto flex h-full w-full max-w-[560px] flex-col px-4 py-2"
          style={{ paddingBottom: `calc(${keyboardHeight}px + max(0.5rem, env(safe-area-inset-bottom)))` }}
        >
          {/* top status row (fixed height to prevent layout shift) */}
          <div className="flex h-10 items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-[color:var(--fg)]">
              <Clock3 size={14} className="text-[color:var(--muted)]" />
              <span>{formatDuration(Math.round(durationSec))}</span>
            </div>

            <div className="flex h-10 items-center justify-end">
              {!gameOver.done ? (
                <Hint
                  disabled={hintUsed || committedCount === 0}
                  revealedMarks={committedRows}
                  answerLength={5}
                  onHint={onHint}
                />
              ) : (
                <div className="h-10 w-10" />
              )}
            </div>
          </div>

          {/* toast slot (fixed height to prevent layout shift) */}
          <div className="h-6 pt-1 text-center text-xs text-[color:var(--muted)]">{toast}</div>

          {/* center area */}
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="h-8">
              {gameOver.won ? (
                <div className="text-center text-3xl font-extrabold tracking-[0.18em] text-emerald-300 drop-shadow">
                  YOU WON
                </div>
              ) : gameOver.lost ? (
                <div className="text-center text-3xl font-extrabold tracking-[0.18em] text-rose-400 drop-shadow">
                  GAME OVER
                </div>
              ) : null}
            </div>

            <Grid rows={viewRows} activeRowIndex={activeRowIndex} shakeRowNonce={shakeNonce} onDeleteChar={onDeleteChar} />

            {gameOver.lost && committedCount > 0 && (
              <div className="mt-4 text-center">
                <div className="text-sm text-[color:var(--muted)]">The word was:</div>
                <div className="text-2xl font-bold text-[color:var(--fg)] uppercase tracking-widest">
                  {answer}
                </div>
              </div>
            )}

            <div className="h-8" />
          </div>

          {/* keyboard: fixed to bottom (iOS-friendly) */}
          <div
            ref={keyboardRef}
            className="fixed bottom-0 left-0 right-0 z-20 border-t border-[color:var(--border)] bg-[color:var(--bg)]/92 backdrop-blur"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="mx-auto w-full max-w-[560px] px-4 py-3">
              {gameOver.done ? (
                <div className="pb-3">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        newGame();
                        window.setTimeout(() => containerRef.current?.focus(), 0);
                      }}
                      className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm font-semibold text-[color:var(--fg)] shadow-sm transition hover:bg-[color:var(--surface2)]"
                    >
                      Start New Game
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatsOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm font-semibold text-[color:var(--fg)] shadow-sm transition hover:bg-[color:var(--surface2)]"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

              <div className="flex items-center justify-end pt-2" />
            </div>
          </div>
        </div>
      </div>

      <Leaderboard open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        difficulty={difficulty}
        onDifficultyChange={(d) => {
          setDifficulty(d);
          // also reset current game state when switching difficulty
          saveGameState(null);
        }}
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
                const ended = Date.now();
                const d = startedAtMs ? Math.max(0, (ended - startedAtMs) / 1000) : 0;

                // Count as a loss/forfeit once at least one guess was committed
                setStats(applyGameResult(stats, { outcome: "lose", durationSec: d }));

                // Track the word as played (forfeit counts as played)
                if (userId) {
                  void trackPlayedWord(userId, difficulty, answer);
                }

                if (sessionId) {
                  void endSession({
                    sessionId,
                    outcome: "forfeit",
                    guessesUsed: committedCount,
                    durationSec: d,
                    endedAtMs: ended,
                  });
                }

                newGame();
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

  // Color gradient: 1 (green) → 6 (red)
  const barColor =
    n === 1 ? "bg-emerald-500/60" :    // Green (best)
      n === 2 ? "bg-lime-500/50" :       // Light green
        n === 3 ? "bg-yellow-500/50" :     // Yellow
          n === 4 ? "bg-amber-500/50" :      // Orange
            n === 5 ? "bg-orange-500/50" :     // Dark orange
              "bg-red-500/50";                   // Red (worst)

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
