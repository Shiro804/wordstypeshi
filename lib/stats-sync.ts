import { createClient } from "@/lib/supabase/client";
import type { Stats } from "@/lib/storage";
import type { Difficulty } from "@/lib/difficulty";

export type RemoteStatsRow = {
  user_id: string; // uuid
  difficulty: Difficulty;
  played: number;
  wins: number;
  losses: number;
  current_streak: number;
  max_streak: number;
  dist_1: number;
  dist_2: number;
  dist_3: number;
  dist_4: number;
  dist_5: number;
  dist_6: number;
  best_time_sec: number | null;
  avg_time_sec: number | null;
  last_times_sec: number[];
  updated_at: string; // timestamptz
};

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Convert remote row data to Stats object.
 */
function rowToStats(data: {
  played?: number | null;
  wins?: number | null;
  losses?: number | null;
  current_streak?: number | null;
  max_streak?: number | null;
  dist_1?: number | null;
  dist_2?: number | null;
  dist_3?: number | null;
  dist_4?: number | null;
  dist_5?: number | null;
  dist_6?: number | null;
  best_time_sec?: number | null;
  avg_time_sec?: number | null;
  last_times_sec?: number[] | null;
  updated_at?: string | null;
}): Stats {
  const updatedAtMs = data.updated_at
    ? Date.parse(data.updated_at)
    : Date.now();

  return {
    played: data.played ?? 0,
    wins: data.wins ?? 0,
    losses: data.losses ?? 0,
    currentStreak: data.current_streak ?? 0,
    maxStreak: data.max_streak ?? 0,
    distribution: {
      1: data.dist_1 ?? 0,
      2: data.dist_2 ?? 0,
      3: data.dist_3 ?? 0,
      4: data.dist_4 ?? 0,
      5: data.dist_5 ?? 0,
      6: data.dist_6 ?? 0,
    },
    bestTimeSec: data.best_time_sec ?? null,
    avgTimeSec: data.avg_time_sec ?? null,
    lastTimesSec: Array.isArray(data.last_times_sec)
      ? (data.last_times_sec as number[])
      : [],
    updatedAt: Number.isNaN(updatedAtMs) ? Date.now() : updatedAtMs,
  };
}

export async function fetchRemoteStats(
  userId: string,
  difficulty: Difficulty
): Promise<Stats | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stats")
    .select(
      "played,wins,losses,current_streak,max_streak,dist_1,dist_2,dist_3,dist_4,dist_5,dist_6,best_time_sec,avg_time_sec,last_times_sec,updated_at"
    )
    .eq("user_id", userId)
    .eq("difficulty", difficulty)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;

  return rowToStats(data);
}

/**
 * Upsert stats to remote database.
 * This is the source of truth for cross-device/context consistency.
 */
export async function upsertRemoteStats(
  userId: string,
  difficulty: Difficulty,
  stats: Stats
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("stats").upsert(
    {
      user_id: userId,
      difficulty,
      played: stats.played,
      wins: stats.wins,
      losses: stats.losses,
      current_streak: stats.currentStreak,
      max_streak: stats.maxStreak,
      dist_1: stats.distribution[1] ?? 0,
      dist_2: stats.distribution[2] ?? 0,
      dist_3: stats.distribution[3] ?? 0,
      dist_4: stats.distribution[4] ?? 0,
      dist_5: stats.distribution[5] ?? 0,
      dist_6: stats.distribution[6] ?? 0,
      best_time_sec: stats.bestTimeSec,
      avg_time_sec: stats.avgTimeSec,
      last_times_sec: stats.lastTimesSec,
      updated_at: new Date(stats.updatedAt).toISOString(),
    },
    { onConflict: "user_id,difficulty" }
  );

  if (error) {
    // This will show the real root cause (e.g. missing unique constraint, RLS, bad column type)
    console.error("Failed to upsert remote stats", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }
}

/**
 * Merge strategy: take the maximum of cumulative stats.
 * This handles cases where localStorage and remote have diverged.
 */
export function mergeStats(local: Stats, remote: Stats): Stats {
  // Use the one with more games played as baseline
  // If remote has newer timestamp and more games, trust remote
  // If local has more games (somehow), keep local but merge maxes
  
  const remoteNewer = (remote.updatedAt ?? 0) > (local.updatedAt ?? 0);
  const remoteMoreGames = remote.played > local.played;
  
  // If remote is strictly newer and has more games, use remote entirely
  if (remoteNewer && remoteMoreGames) {
    return remote;
  }
  
  // If local has more games, it might have offline progress - merge conservatively
  // Take max of cumulative stats to not lose progress
  return {
    played: Math.max(local.played, remote.played),
    wins: Math.max(local.wins, remote.wins),
    losses: Math.max(local.losses, remote.losses),
    // Streak is tricky - take remote if newer, else local
    currentStreak: remoteNewer ? remote.currentStreak : local.currentStreak,
    maxStreak: Math.max(local.maxStreak, remote.maxStreak),
    distribution: {
      1: Math.max(local.distribution[1] ?? 0, remote.distribution[1] ?? 0),
      2: Math.max(local.distribution[2] ?? 0, remote.distribution[2] ?? 0),
      3: Math.max(local.distribution[3] ?? 0, remote.distribution[3] ?? 0),
      4: Math.max(local.distribution[4] ?? 0, remote.distribution[4] ?? 0),
      5: Math.max(local.distribution[5] ?? 0, remote.distribution[5] ?? 0),
      6: Math.max(local.distribution[6] ?? 0, remote.distribution[6] ?? 0),
    },
    bestTimeSec: 
      local.bestTimeSec == null ? remote.bestTimeSec :
      remote.bestTimeSec == null ? local.bestTimeSec :
      Math.min(local.bestTimeSec, remote.bestTimeSec),
    avgTimeSec: remoteNewer ? remote.avgTimeSec : local.avgTimeSec,
    lastTimesSec: remoteNewer ? remote.lastTimesSec : local.lastTimesSec,
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
  };
}

/**
 * Sync stats between local and remote.
 * Returns the authoritative stats after sync.
 * 
 * Strategy: Server-first
 * 1. Fetch remote stats
 * 2. Merge with local (preserving max values)
 * 3. If merged differs from remote, upsert back
 * 4. Return merged stats
 */
export async function syncStats(
  userId: string,
  difficulty: Difficulty,
  localStats: Stats
): Promise<Stats> {
  const remote = await fetchRemoteStats(userId, difficulty);
  
  if (!remote) {
    // No remote stats yet - push local to remote
    await upsertRemoteStats(userId, difficulty, localStats);
    return localStats;
  }
  
  const merged = mergeStats(localStats, remote);
  
  // If merged has more data than remote, push it back
  if (merged.played > remote.played || merged.updatedAt > (remote.updatedAt ?? 0)) {
    await upsertRemoteStats(userId, difficulty, merged);
  }
  
  return merged;
}
