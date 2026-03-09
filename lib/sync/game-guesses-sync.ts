import { createClient } from "@/lib/supabase/client";

export interface GuessData {
  // Wordle
  word?: string;
  marks?: string[];
  // Mastermind
  colors?: number[];
  // WordSearch
  path?: Array<{ r: number; c: number }>;
  wordFound?: string;
}

export interface GuessFeedback {
  // Mastermind
  black?: number;
  white?: number;
}

/**
 * Track a guess in the game_guesses table
 */
export async function trackGuess(params: {
  sessionId: string;
  guessNumber: number;
  guessData: GuessData;
  feedback?: GuessFeedback;
}): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.from("game_guesses").insert({
    session_id: params.sessionId,
    guess_number: params.guessNumber,
    guess_data: params.guessData,
    feedback: params.feedback ?? null,
  });

  if (error) {
    console.error("Failed to track guess", error);
    return false;
  }

  return true;
}

/**
 * Fetch all guesses for a session
 */
export async function fetchSessionGuesses(
  sessionId: string
): Promise<Array<{ guessNumber: number; guessData: GuessData; feedback: GuessFeedback | null }>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("game_guesses")
    .select("guess_number, guess_data, feedback")
    .eq("session_id", sessionId)
    .order("guess_number", { ascending: true });

  if (error) {
    console.error("Failed to fetch guesses", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    guessNumber: row.guess_number,
    guessData: row.guess_data as GuessData,
    feedback: row.feedback as GuessFeedback | null,
  }));
}
