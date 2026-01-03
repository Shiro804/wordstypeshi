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

  const updatedAtMs = data.updated_at
    ? Date.parse(data.updated_at)
    : Date.now();

  const stats: Stats = {
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

  return stats;
}

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
