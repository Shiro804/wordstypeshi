/**
 * useGameStats - Shared stats sync hook for all games
 * 
 * Provides consistent stats loading, syncing, and updating.
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Stats } from "@/lib/storage";
import { applyGameResult, type GameResult } from "@/lib/storage";
import {
  getCurrentUserId,
  loadLocalStats,
  saveLocalStats,
  syncGameStats,
  upsertRemoteGameStats,
} from "@/lib/game-stats-sync";

export interface UseGameStatsOptions {
  /** Game identifier (e.g., 'wordle', 'mastermind', 'wordsearch') */
  gameId: string;
  /** Current mode/difficulty */
  mode: string;
}

export interface UseGameStatsReturn {
  /** Current user ID (null if not logged in) */
  userId: string | null;
  /** Current stats */
  stats: Stats;
  /** Whether stats are currently syncing */
  isSyncing: boolean;
  /** Update stats with a game result */
  recordGameResult: (result: GameResult) => void;
  /** Force sync with remote */
  forceSync: () => Promise<void>;
}

function defaultStats(): Stats {
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

export function useGameStats({ gameId, mode }: UseGameStatsOptions): UseGameStatsReturn {
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(() => loadLocalStats(gameId, mode));
  const [isSyncing, setIsSyncing] = useState(false);

  // Get current user ID on mount
  useEffect(() => {
    getCurrentUserId().then((uid) => setUserId(uid));
  }, []);

  // Load and sync stats when user or mode changes
  useEffect(() => {
    const local = loadLocalStats(gameId, mode);
    setStats(local);

    if (!userId) return;

    setIsSyncing(true);
    syncGameStats(userId, gameId, mode, local)
      .then((synced) => {
        setStats(synced);
        saveLocalStats(gameId, mode, synced);
      })
      .finally(() => setIsSyncing(false));
  }, [userId, gameId, mode]);

  // Record a game result
  const recordGameResult = useCallback(
    (result: GameResult) => {
      const newStats = applyGameResult(stats, result);
      setStats(newStats);
      saveLocalStats(gameId, mode, newStats);

      if (userId) {
        upsertRemoteGameStats(userId, gameId, mode, newStats);
      }
    },
    [stats, gameId, mode, userId]
  );

  // Force sync with remote
  const forceSync = useCallback(async () => {
    if (!userId) return;

    setIsSyncing(true);
    try {
      const synced = await syncGameStats(userId, gameId, mode, stats);
      setStats(synced);
      saveLocalStats(gameId, mode, synced);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, gameId, mode, stats]);

  return {
    userId,
    stats,
    isSyncing,
    recordGameResult,
    forceSync,
  };
}
