import { createClient } from "@/lib/supabase/client";
import type { Difficulty } from "@/lib/difficulty";

/**
 * Fetch all words the user has already played in a specific game and difficulty
 */
export async function fetchPlayedWords(
  userId: string,
  difficulty: Difficulty,
  gameId: string = "wordle"
): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("played_words")
    .select("word")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .eq("difficulty", difficulty);

  if (error) {
    console.error("Failed to fetch played words", error);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.word.toUpperCase()));
}

/**
 * Add a word to the user's played words list
 * This prevents them from getting the same word again
 */
export async function trackPlayedWord(
  userId: string,
  difficulty: Difficulty,
  word: string,
  gameId: string = "wordle"
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.from("played_words").insert({
    user_id: userId,
    game_id: gameId,
    difficulty,
    word: word.toUpperCase(),
  });

  if (error) {
    // If it's a unique constraint violation, that's okay - word was already tracked
    if (error.code === "23505") {
      return true;
    }
    console.error("Failed to track played word", error);
    return false;
  }

  return true;
}
