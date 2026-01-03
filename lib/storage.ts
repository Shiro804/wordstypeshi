// lib/storage.ts

export type GuessDistribution = Record<1 | 2 | 3 | 4 | 5 | 6, number>;

export type Stats = {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  distribution: GuessDistribution;
  // times in seconds
  bestTimeSec: number | null;
  avgTimeSec: number | null;
  lastTimesSec: number[]; // most recent first
  updatedAt: number;
};

const STORAGE_KEY = "wordstypeshi.stats.v1";
const LEGACY_STORAGE_KEY = "lovdle.stats.v1";

export function defaultStats(): Stats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    bestTimeSec: null,
    avgTimeSec: null,
    lastTimesSec: [],
    updatedAt: Date.now(),
  };
}

export function loadStats(): Stats {
  if (typeof window === "undefined") return defaultStats();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as Stats;

    if (typeof parsed.played !== "number" || typeof parsed.wins !== "number") return defaultStats();

    return {
      ...defaultStats(),
      ...parsed,
      distribution: { ...defaultStats().distribution, ...(parsed.distribution ?? {}) },
      lastTimesSec: Array.isArray(parsed.lastTimesSec) ? parsed.lastTimesSec : [],
    };
  } catch {
    return defaultStats();
  }
}

export function saveStats(stats: Stats) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export type GameResult =
  | { outcome: "win"; guessesUsed: 1 | 2 | 3 | 4 | 5 | 6; durationSec: number }
  | { outcome: "lose"; durationSec: number };

function roundSec(sec: number) {
  return Math.max(0, Math.round(sec));
}

export function applyGameResult(prev: Stats, result: GameResult): Stats {
  const next: Stats = {
    ...prev,
    played: prev.played + 1,
    updatedAt: Date.now(),
  };

  const duration = roundSec(result.durationSec);

  // time aggregates
  const times = [duration, ...prev.lastTimesSec].slice(0, 20);
  next.lastTimesSec = times;

  const allTimes = [duration, ...prev.lastTimesSec];
  next.avgTimeSec = Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length);
  next.bestTimeSec = prev.bestTimeSec == null ? duration : Math.min(prev.bestTimeSec, duration);

  if (result.outcome === "win") {
    next.wins = prev.wins + 1;
    next.currentStreak = prev.currentStreak + 1;
    next.maxStreak = Math.max(prev.maxStreak, next.currentStreak);
    next.distribution = {
      ...prev.distribution,
      [result.guessesUsed]: (prev.distribution[result.guessesUsed] ?? 0) + 1,
    };
  } else {
    next.currentStreak = 0;
  }

  return next;
}

export function formatDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}
