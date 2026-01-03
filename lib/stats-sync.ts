import { createClient } from "@/lib/supabase/client";
import type { Stats } from "@/lib/storage";

export type RemoteStatsRow = {
  user_id: string; // uuid
  stats: Stats;
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

export async function fetchRemoteStats(userId: string): Promise<Stats | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stats")
    .select("stats, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  const stats = (data?.stats as Stats | undefined) ?? null;
  if (!stats) return null;

  // If DB updated_at exists, ensure stats.updatedAt is at least that value (ms epoch)
  if (data?.updated_at) {
    const dbMs = Date.parse(data.updated_at);
    if (!Number.isNaN(dbMs) && (stats.updatedAt ?? 0) < dbMs) {
      stats.updatedAt = dbMs;
    }
  }

  return stats;
}

export async function upsertRemoteStats(userId: string, stats: Stats): Promise<void> {
  const supabase = createClient();

  // Store the full JSON blob; schema stays stable as you add fields.
  await supabase.from("stats").upsert(
    {
      user_id: userId,
      stats,
      updated_at: new Date(stats.updatedAt).toISOString(),
    },
    { onConflict: "user_id" },
  );
}
