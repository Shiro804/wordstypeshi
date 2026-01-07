import { createClient } from "@/lib/supabase/client";
import type { Stats } from "@/lib/storage/storage";

const LOCAL_STORAGE_PREFIX = "puzzlehub.stats";

/**
 * Get current authenticated user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function loadLocalStats(gameId: string, mode: string): Stats {
  if (typeof window === "undefined") {
    return createEmptyStats();
  }
  try {
    const key = `${LOCAL_STORAGE_PREFIX}.${gameId}.${mode}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return createEmptyStats();
    return JSON.parse(raw) as Stats;
  } catch {
    return createEmptyStats();
  }
}

export function saveLocalStats(gameId: string, mode: string, stats: Stats) {
  if (typeof window === "undefined") return;
  const key = `${LOCAL_STORAGE_PREFIX}.${gameId}.${mode}`;
  window.localStorage.setItem(key, JSON.stringify(stats));
}

function createEmptyStats(): Stats {
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

/**
 * Fetch generic game stats from Supabase
 */
export async function fetchRemoteGameStats(
  userId: string,
  gameId: string,
  mode: string
): Promise<Stats | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_stats")
    .select("stats, updated_at")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .eq("mode", mode)
    .maybeSingle();

  if (error || !data) return null;

  const rawStats = data.stats as Partial<Stats>;
  const updatedAtMs = data.updated_at ? Date.parse(data.updated_at) : Date.now();

  return {
    played: rawStats.played ?? 0,
    wins: rawStats.wins ?? 0,
    losses: rawStats.losses ?? 0,
    currentStreak: rawStats.currentStreak ?? 0,
    maxStreak: rawStats.maxStreak ?? 0,
    distribution: rawStats.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    bestTimeSec: rawStats.bestTimeSec ?? null,
    avgTimeSec: rawStats.avgTimeSec ?? null,
    lastTimesSec: rawStats.lastTimesSec ?? [],
    updatedAt: Number.isNaN(updatedAtMs) ? Date.now() : updatedAtMs,
  };
}

/**
 * Upsert generic game stats to Supabase
 */
export async function upsertRemoteGameStats(
  userId: string,
  gameId: string,
  mode: string,
  stats: Stats
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("game_stats").upsert(
    {
      user_id: userId,
      game_id: gameId,
      mode: mode,
      stats: stats, // Stored as JSONB
      updated_at: new Date(stats.updatedAt).toISOString(),
    },
    { onConflict: "user_id,game_id,mode" }
  );

  if (error) {
    console.error("Failed to upsert game stats", error);
  }
}

/**
 * Merge strategy: take the maximum of cumulative stats.
 */
export function mergeStats(local: Stats, remote: Stats): Stats {
  const remoteNewer = (remote.updatedAt ?? 0) > (local.updatedAt ?? 0);
  const remoteMoreGames = remote.played > local.played;

  if (remoteNewer && remoteMoreGames) {
    return remote;
  }

  return {
    played: Math.max(local.played, remote.played),
    wins: Math.max(local.wins, remote.wins),
    losses: Math.max(local.losses, remote.losses),
    currentStreak: remoteNewer ? remote.currentStreak : local.currentStreak,
    maxStreak: Math.max(local.maxStreak, remote.maxStreak),
    distribution: {
      ...remote.distribution,
      ...local.distribution,
      // Merging distribution keys specifically if needed, but simple spread usually OK if keys don't overlap or we trust one source.
      // Better strategy for distribution:
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
 * Sync stats between local and remote for generic games.
 */
export async function syncGameStats(
  userId: string,
  gameId: string,
  mode: string,
  localStats: Stats
): Promise<Stats> {
  const remote = await fetchRemoteGameStats(userId, gameId, mode);

  if (!remote) {
    await upsertRemoteGameStats(userId, gameId, mode, localStats);
    return localStats;
  }

  const merged = mergeStats(localStats, remote);

  if (merged.played > remote.played || merged.updatedAt > (remote.updatedAt ?? 0)) {
    await upsertRemoteGameStats(userId, gameId, mode, merged);
  }

  return merged;
}
