import { createClient } from "@/lib/supabase/client";
import type { Difficulty } from "@/lib/difficulty";

export type SessionOutcome = "win" | "lose" | "forfeit";

export type GameSessionRow = {
  id: string;
  user_id: string;
  game_id: string;
  difficulty: Difficulty;
  answer: string;
  status: "active" | "ended";
  started_at: string;
  ended_at: string | null;
  outcome: SessionOutcome | null;
  guesses_used: number | null;
  duration_sec: number | null;
  created_at: string;
  updated_at: string;
};

export async function fetchActiveSession(
  userId: string,
  gameId: string = "wordle"
): Promise<GameSessionRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .eq("status", "active")
    .maybeSingle();

  if (error) return null;
  return (data as GameSessionRow | null) ?? null;
}

export async function createOrReuseActiveSession(params: {
  userId: string;
  gameId?: string;
  difficulty: Difficulty;
  answer: string;
  startedAtMs: number;
}): Promise<GameSessionRow | null> {
  const supabase = createClient();
  const gameId = params.gameId ?? "wordle";

  // Try to reuse an existing active session for this user (prevents reload cheating).
  const existing = await supabase
    .from("game_sessions")
    .select("*")
    .eq("user_id", params.userId)
    .eq("game_id", gameId)
    .eq("status", "active")
    .maybeSingle();

  if (!existing.error && existing.data) {
    return existing.data as GameSessionRow;
  }

  const { data, error } = await supabase
    .from("game_sessions")
    .insert({
      user_id: params.userId,
      game_id: gameId,
      difficulty: params.difficulty,
      answer: params.answer,
      status: "active",
      started_at: new Date(params.startedAtMs).toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create session", error);
    return null;
  }

  return data as GameSessionRow;
}

export async function endSession(params: {
  sessionId: string;
  outcome: SessionOutcome;
  guessesUsed: number | null;
  durationSec: number;
  endedAtMs: number;
}): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("game_sessions")
    .update({
      status: "ended",
      outcome: params.outcome,
      guesses_used: params.guessesUsed,
      duration_sec: Math.max(0, Math.round(params.durationSec)),
      ended_at: new Date(params.endedAtMs).toISOString(),
    })
    .eq("id", params.sessionId);

  if (error) {
    console.error("Failed to end session", error);
  }
}

/**
 * Update the answer in an active session.
 * Called when answer changes to ensure DB always has the current word.
 */
export async function updateSessionAnswer(params: {
  sessionId: string;
  answer: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("game_sessions")
    .update({ answer: params.answer })
    .eq("id", params.sessionId);

  if (error) {
    console.error("Failed to update session answer", error);
  }
}
