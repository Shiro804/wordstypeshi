import { createClient } from "@/lib/supabase/client";
import type { Difficulty } from "@/lib/difficulty";

export interface StoredWordDefinition {
  id: string;
  word: string;
  part_of_speech: string | null;
  meaning: string;
  meaning_german: string | null;
  solved_at: string;
  difficulty: Difficulty;
}

/**
 * Save a word definition after solving a word.
 * Uses upsert to avoid duplicates.
 */
export async function saveWordDefinition(
  userId: string,
  word: string,
  definition: {
    partOfSpeech?: string;
    meaning: string;
    meaningGerman?: string;
  },
  difficulty: Difficulty
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.from("word_definitions").upsert(
    {
      user_id: userId,
      word: word.toUpperCase(),
      part_of_speech: definition.partOfSpeech || null,
      meaning: definition.meaning,
      meaning_german: definition.meaningGerman || null,
      difficulty,
      solved_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,word,difficulty",
    }
  );

  if (error) {
    console.error("Failed to save word definition", error);
    return false;
  }

  return true;
}

/**
 * Fetch all word definitions for a user, optionally filtered by difficulty.
 * Returns words sorted by most recently solved first.
 */
export async function fetchWordHistory(
  userId: string,
  difficulty?: Difficulty
): Promise<StoredWordDefinition[]> {
  const supabase = createClient();

  let query = supabase
    .from("word_definitions")
    .select("id, word, part_of_speech, meaning, meaning_german, solved_at, difficulty")
    .eq("user_id", userId)
    .order("solved_at", { ascending: false });

  if (difficulty) {
    query = query.eq("difficulty", difficulty);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch word history", error);
    return [];
  }

  return (data ?? []) as StoredWordDefinition[];
}
