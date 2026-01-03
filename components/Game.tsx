"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mark, marksToEmoji, pickRandom, scoreGuess } from "@/lib/game";
import { loadWordLists } from "@/lib/words";
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

const MAX_TRIES = 6;

export default function Game() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [allowed, setAllowed] = useState<string[]>([]);
  const [solutions, setSolutions] = useState<string[]>([]);

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

  const [stats, setStats] = useState<Stats>(() => loadStats());
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [hintUsed, setHintUsed] = useState(false);

  const [theme, setTheme] = useState<Theme>(() => "dark");

  // timer
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setTheme(loadTheme());

    // Auth + remote stats
    getCurrentUserId().then(async (uid) => {
      setUserId(uid);
      if (!uid) return;

      const remote = await fetchRemoteStats(uid);
      if (remote) {
        // Keep whichever one is newer (lets you keep playing offline too)
        const local = loadStats();
        const pick = (remote.updatedAt ?? 0) >= (local.updatedAt ?? 0) ? remote : local;
        setStats(pick);
      }
    });

    loadWordLists().then(({ allowed, solutions }) => {
      setAllowed(allowed);
      setSolutions(solutions);
    });
  }, []);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!solutions.length) return;
    newGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solutions.length]);

  useEffect(() => {
    saveStats(stats);

    // Best-effort remote persistence (non-blocking)
    if (!userId) return;
    void upsertRemoteStats(userId, stats);
  }, [stats, userId]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
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

  const activeRowIndex = useMemo(() => {
    const idx = rows.findIndex((r) => r.marks === null);
    return idx === -1 ? MAX_TRIES - 1 : idx;
  }, [rows]);

  const durationSec = useMemo(() => {
    if (!startedAtMs) return 0;
    return Math.max(0, (nowMs - startedAtMs) / 1000);
  }, [startedAtMs, nowMs]);

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

  function newGame() {
    if (!solutions.length) return;
    const a = pickRandom(solutions);
    setAnswer(a);
    setRows(
      Array.from({ length: MAX_TRIES }, () => ({ guess: "", marks: null, revealed: false }))
    );
    setCurrent("");
    setToast("");
    setShakeNonce(0);
    setHintUsed(false);
    setStartedAtMs(Date.now());
    window.setTimeout(() => containerRef.current?.focus(), 0);
  }

  function bumpShake() {
    setShakeNonce((n) => n + 1);
  }

  function onKey(k: string) {
    if (k === "ENTER") return commitGuess();
    if (k === "BACKSPACE") return setCurrent((s) => s.slice(0, -1));
    if (gameOver.done) return;

    if (!/^[A-Z]$/.test(k)) return;
    setCurrent((s) => (s.length < 5 ? s + k : s));
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
      return showToast("Not in word list");
    }

    const idx = rows.findIndex((r) => r.marks === null);
    if (idx === -1) return;

    const marks = scoreGuess(guess, answer);

    const next = rows.slice();
    next[idx] = { guess, marks, revealed: true };
    setRows(next);
    setCurrent("");

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
      window.setTimeout(() => setStatsOpen(true), 650);
    } else if (lost) {
      showToast(`Answer: ${answer}`);
      setStats(applyGameResult(stats, { outcome: "lose", durationSec }));
      window.setTimeout(() => setStatsOpen(true), 650);
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
    if (h.type === "reveal") showToast(`Confirmed: position ${h.index + 1} = ${h.letter}`);
    else showToast(h.letters.length ? `Avoid: ${h.letters.join(", ")}` : "No hints yet");
  }

  const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const distMax = Math.max(1, ...Object.values(stats.distribution));

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="outline-none"
      onKeyDown={(e) => {
        if (e.key === "Enter") onKey("ENTER");
        else if (e.key === "Backspace") onKey("BACKSPACE");
        else {
          const k = e.key.toUpperCase();
          if (/^[A-Z]$/.test(k)) onKey(k);
        }
      }}
    >
      <div className="relative min-h-dvh w-full bg-zinc-950 text-white safe-top safe-bottom">
        {/* subtle background */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-yellow-500/15 blur-3xl" />
        </div>

        <div className="sticky top-0 z-10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <TopBar
            onNew={newGame}
            onShare={share}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenStats={() => setStatsOpen(true)}
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            actionsSlot={
              <>
                {process.env.NODE_ENV !== "production" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrent(answer);
                      window.setTimeout(() => containerRef.current?.focus(), 0);
                    }}
                    title="Dev: fill answer"
                    aria-label="Dev solve"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-xs font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                  >
                    Solve
                  </button>
                ) : null}
              </>
            }
          />
        </div>

        <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-white/60">
              Time: <span className="font-semibold text-white/90">{formatDuration(Math.round(durationSec))}</span>
            </div>
            <div className="text-xs text-white/60 flex items-center justify-end">
              {gameOver.done ? (
                gameOver.won ? (
                  <span className="font-semibold text-emerald-300">Solved</span>
                ) : (
                  <span className="font-semibold text-rose-300">Failed</span>
                )
              ) : (
                <Hint
                  disabled={hintUsed || committedCount === 0}
                  revealedMarks={committedRows}
                  answerLength={5}
                  onHint={onHint}
                />
              )}
            </div>
          </div>

          <div className="min-h-5 pt-2 text-center text-sm text-white/70">{toast}</div>

          {/* center area */}
          <div className="flex flex-1 flex-col items-center justify-center">
            <Grid rows={viewRows} activeRowIndex={activeRowIndex} shakeRowNonce={shakeNonce} />
          </div>

          {/* keyboard pinned to bottom */}
          <div className="pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            <Keyboard keyMarks={keyMarks} onKey={onKey} disabled={gameOver.done} />

            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="text-xs text-white/50">Enter = guess • Backspace = delete</div>
              {gameOver.done ? (
                <button
                  type="button"
                  onClick={newGame}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10"
                >
                  Play again
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Leaderboard open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Modal
        open={statsOpen}
        title="Stats (MVP)"
        onClose={() => setStatsOpen(false)}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={share}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Share
            </button>
            <button
              type="button"
              onClick={newGame}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              New game
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
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
            Guess distribution
          </div>
          <div className="grid gap-2">
            {(Array.from({ length: 6 }).map((_, i) => (i + 1) as 1 | 2 | 3 | 4 | 5 | 6)).map((n) => (
              <BarRow key={n} n={n} value={stats.distribution[n]} max={distMax} />
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Sync</div>
          <div className="mt-1 text-sm text-white/70">
            {userId
              ? "Stats are saved to your account (and also cached locally for offline use)."
              : "Stats are stored locally. Log in to enable cloud sync."}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function BarRow({ n, value, max }: { n: number; value: number; max: number }) {
  const pct = Math.round((value / Math.max(1, max)) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-4 text-right text-xs font-semibold text-white/70">{n}</div>
      <div className="relative h-7 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div
          className="h-full rounded-xl bg-emerald-500/40"
          style={{ width: `${pct}%` }}
          aria-label={`${n}: ${value}`}
        />
        <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-semibold text-white/80">
          {value}
        </div>
      </div>
    </div>
  );
}
