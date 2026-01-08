// lib/storage.ts

import type { Difficulty } from "@/lib/difficulty";

export type GuessDistribution = Record<number, number>;

export type Stats = {
  played: number;
  wins: number;
  losses: number;
  currentStreak: number;
  maxStreak: number;
  distribution: GuessDistribution;
  // times in seconds
  bestTimeSec: number | null;
  avgTimeSec: number | null;
  lastTimesSec: number[]; // most recent first
  updatedAt: number;
};

const STORAGE_KEY_V2 = "batagames.stats.v2";
const STORAGE_KEY_V1 = "batagames.stats.v1";
const LEGACY_STORAGE_KEY = "lovdle.stats.v1";

type StatsByDifficulty = Partial<Record<Difficulty, Stats>>;

export function defaultStats(): Stats {
  return {
    played: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    bestTimeSec: null,
    avgTimeSec: null,
    lastTimesSec: [],
    updatedAt: Date.now(),
  };
}

export function loadStats(difficulty: Difficulty = "medium"): Stats {
  if (typeof window === "undefined") return defaultStats();
  try {
    // v2 stores a map of difficulty -> Stats
    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as StatsByDifficulty;
      const s = parsed?.[difficulty];
      if (s && typeof s.played === "number" && typeof s.wins === "number") {
        return {
          ...defaultStats(),
          ...s,
          distribution: {
            ...defaultStats().distribution,
            ...(s.distribution ?? {}),
          },
          lastTimesSec: Array.isArray(s.lastTimesSec) ? s.lastTimesSec : [],
        };
      }
      return defaultStats();
    }

    // migrate v1 -> v2 (treat old stats as "medium")
    const rawV1 =
      window.localStorage.getItem(STORAGE_KEY_V1) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!rawV1) return defaultStats();
    const parsedV1 = JSON.parse(rawV1) as Stats;
    if (
      typeof parsedV1.played !== "number" ||
      typeof parsedV1.wins !== "number"
    )
      return defaultStats();

    const migrated: StatsByDifficulty = {
      medium: { ...defaultStats(), ...parsedV1 },
    };
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
    return {
      ...defaultStats(),
      ...parsedV1,
      distribution: {
        ...defaultStats().distribution,
        ...(parsedV1.distribution ?? {}),
      },
      lastTimesSec: Array.isArray(parsedV1.lastTimesSec)
        ? parsedV1.lastTimesSec
        : [],
    };
  } catch {
    return defaultStats();
  }
}

export function saveStats(difficulty: Difficulty, stats: Stats) {
  if (typeof window === "undefined") return;
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    const parsed =
      (rawV2 ? (JSON.parse(rawV2) as StatsByDifficulty) : {}) ?? {};
    parsed[difficulty] = stats;
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(parsed));
  } catch {
    // fallback: still store nothing if storage is broken
  }
}

export type GameResult =
  | { outcome: "win"; guessesUsed: number; durationSec: number }
  | { outcome: "lose"; durationSec: number };

function roundSec(sec: number) {
  if (!Number.isFinite(sec)) return 0;
  return Math.max(0, Math.round(sec));
}

export function applyGameResult(prev: Stats, result: GameResult): Stats {
  const next: Stats = {
    ...prev,
    played: prev.played + 1,
    updatedAt: Date.now(),
  };

  if (result.outcome === "win") {
    const duration = roundSec(result.durationSec);

    // Time-based stats should reflect *completed wins* only.
    // Keep only the most recent 20 win times.
    const times = [duration, ...prev.lastTimesSec].slice(0, 20);
    next.lastTimesSec = times;

    next.avgTimeSec = times.length
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : null;

    next.bestTimeSec =
      prev.bestTimeSec == null ? duration : Math.min(prev.bestTimeSec, duration);

    next.wins = prev.wins + 1;
    next.currentStreak = prev.currentStreak + 1;
    next.maxStreak = Math.max(prev.maxStreak, next.currentStreak);
    next.distribution = {
      ...prev.distribution,
      [result.guessesUsed]: (prev.distribution[result.guessesUsed] ?? 0) + 1,
    };
  } else {
    // Losses should not affect win-time aggregates.
    next.losses = prev.losses + 1;
    next.currentStreak = 0;
  }

  return next;
}

export function formatDuration(sec: number) {
  const totalSec = Math.max(0, Math.floor(sec));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;

  // Show minutes:seconds format only if >= 60 seconds
  if (m > 0) {
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  // Show only seconds if < 60 seconds
  return `${s}s`;
}
