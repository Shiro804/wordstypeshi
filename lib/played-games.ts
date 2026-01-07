/**
 * Generic played games/puzzles tracking.
 * Works for any game module to prevent replaying the same puzzle.
 */

import { createClient } from "@/lib/supabase/client";
import type { Difficulty } from "@/lib/difficulty";

/**
 * Fetch all puzzle seeds the user has already played for a specific game/difficulty
 */
export async function fetchPlayedSeeds(
  userId: string,
  gameId: string,
  difficulty: Difficulty
): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("runs")
    .select("seed")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .eq("mode", difficulty)
    .eq("status", "completed");

  if (error) {
    console.error("Failed to fetch played seeds", error);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.seed));
}

/**
 * Track a completed puzzle run
 */
export async function trackPlayedGame(
  userId: string,
  gameId: string,
  difficulty: Difficulty,
  seed: string,
  summary: {
    solved: boolean;
    durationMs: number;
    score?: number;
    details?: Record<string, unknown>;
  }
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("runs")
    .insert({
      user_id: userId,
      game_id: gameId,
      mode: difficulty,
      seed,
      status: "completed",
      started_at: new Date(Date.now() - summary.durationMs).toISOString(),
      ended_at: new Date().toISOString(),
      duration_ms: summary.durationMs,
      solved: summary.solved,
      score: summary.score,
      summary: summary.details || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to track played game", error);
    return null;
  }

  return data?.id ?? null;
}

/**
 * Check if a specific seed has been played
 */
export async function hasPlayedSeed(
  userId: string,
  gameId: string,
  difficulty: Difficulty,
  seed: string
): Promise<boolean> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .eq("mode", difficulty)
    .eq("seed", seed)
    .eq("status", "completed");

  if (error) {
    console.error("Failed to check played seed", error);
    return false;
  }

  return (count ?? 0) > 0;
}
