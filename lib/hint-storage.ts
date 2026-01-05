/**
 * Hint storage utilities.
 * Manages daily hint limits and "don't remind" preference.
 */

const HINT_COUNT_KEY = "batas-wordle-hint-count";
const HINT_DATE_KEY = "batas-wordle-hint-date";
const HINT_NO_REMIND_KEY = "batas-wordle-hint-no-remind";

const MAX_HINTS_PER_DAY = 3;

/**
 * Get today's date as YYYY-MM-DD string.
 */
function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get the number of hints used today.
 */
export function getHintsUsedToday(): number {
  if (typeof window === "undefined") return 0;
  
  const storedDate = localStorage.getItem(HINT_DATE_KEY);
  const today = getTodayKey();
  
  // Reset count if it's a new day
  if (storedDate !== today) {
    localStorage.setItem(HINT_DATE_KEY, today);
    localStorage.setItem(HINT_COUNT_KEY, "0");
    return 0;
  }
  
  return parseInt(localStorage.getItem(HINT_COUNT_KEY) || "0", 10);
}

/**
 * Get remaining hints for today.
 */
export function getRemainingHints(): number {
  return Math.max(0, MAX_HINTS_PER_DAY - getHintsUsedToday());
}

/**
 * Check if hints are available today.
 */
export function canUseHint(): boolean {
  return getRemainingHints() > 0;
}

/**
 * Use a hint (increment today's count).
 */
export function consumeHint(): void {
  if (typeof window === "undefined") return;
  
  const today = getTodayKey();
  localStorage.setItem(HINT_DATE_KEY, today);
  
  const current = getHintsUsedToday();
  localStorage.setItem(HINT_COUNT_KEY, String(current + 1));
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
