/**
 * Hint storage utilities.
 * Manages daily hint limits per difficulty and "don't remind" preference.
 */
import type { Difficulty } from "./difficulty";

const HINT_DATE_KEY = "batas-wordle-hint-date";
const HINT_NO_REMIND_KEY = "batas-wordle-hint-no-remind";

// Prefix for difficulty-specific counts
const HINT_COUNT_PREFIX = "batas-wordle-hint-count-";

export const DIFFICULTY_HINT_LIMITS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

/**
 * Get today's date as YYYY-MM-DD string.
 */
function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get the number of hints used today for a specific difficulty.
 */
export function getHintsUsedToday(difficulty: Difficulty): number {
  if (typeof window === "undefined") return 0;
  
  const storedDate = localStorage.getItem(HINT_DATE_KEY);
  const today = getTodayKey();
  const key = `${HINT_COUNT_PREFIX}${difficulty}`;
  
  // Reset counts if it's a new day
  if (storedDate !== today) {
    // We only need to reset once conceptually, but easier to just check date matches
    // Note: This logic might be slightly racy across tabs if not careful, but fine for this app.
    // Ideally we clear ALL difficulty keys.
    localStorage.setItem(HINT_DATE_KEY, today);
    // Clear all specific keys
    (["easy", "medium", "hard"] as Difficulty[]).forEach(d => {
      localStorage.removeItem(`${HINT_COUNT_PREFIX}${d}`);
    });
    return 0;
  }
  
  return parseInt(localStorage.getItem(key) || "0", 10);
}

/**
 * Get remaining hints for today based on difficulty.
 */
export function getRemainingHints(difficulty: Difficulty): number {
  const limit = DIFFICULTY_HINT_LIMITS[difficulty];
  return Math.max(0, limit - getHintsUsedToday(difficulty));
}

/**
 * Check if hints are available today.
 */
export function canUseHint(difficulty: Difficulty): boolean {
  return getRemainingHints(difficulty) > 0;
}

/**
 * Consume a hint (increment today's count for specific difficulty).
 */
export function consumeHint(difficulty: Difficulty): void {
  if (typeof window === "undefined") return;
  
  const today = getTodayKey();
  const storedDate = localStorage.getItem(HINT_DATE_KEY);
  
  // If date changed, reset everything first
  if (storedDate !== today) {
    localStorage.setItem(HINT_DATE_KEY, today);
    (["easy", "medium", "hard"] as Difficulty[]).forEach(d => {
      localStorage.removeItem(`${HINT_COUNT_PREFIX}${d}`);
    });
  }
  
  const key = `${HINT_COUNT_PREFIX}${difficulty}`;
  const current = getHintsUsedToday(difficulty); // This call also checks date, redundant but safe
  localStorage.setItem(key, String(current + 1));
}

/**
 * Check if "don't remind me again" is set.
 */
export function getHintNoRemind(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(HINT_NO_REMIND_KEY) === "true";
}

/**
 * Set "don't remind me again" preference.
 */
export function setHintNoRemind(value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HINT_NO_REMIND_KEY, value ? "true" : "false");
}
