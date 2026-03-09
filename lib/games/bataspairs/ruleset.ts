/**
 * BatasPairs - Ruleset Configuration
 * Version: 1.0.0
 */

export const BATASPAIRS_RULESET_VERSION = '1.0.0';

/**
 * Game mode configurations.
 */
export const BATASPAIRS_MODES = {
  easy: {
    rows: 3,
    cols: 4,
    numPairs: 6,
  },
  medium: {
    rows: 4,
    cols: 4,
    numPairs: 8,
  },
  hard: {
    rows: 4,
    cols: 5,
    numPairs: 10,
  },
} as const;

export type BatasPairsModeId = keyof typeof BATASPAIRS_MODES;

/**
 * Card icons (emoji) used as card faces.
 * At least 10 needed for hard mode (10 pairs).
 */
export const CARD_ICONS = [
  '🌟', '⚡', '🎯', '🎨', '🎵',
  '🎲', '🍀', '🔥', '💎', '🌙',
  '🦋', '🎪', '🌈', '🍄', '🎃',
] as const;

/**
 * Scoring configuration.
 */
export const SCORING = {
  /** Base score for completing the game */
  baseScore: 1000,
  /** Points deducted per mismatch */
  mismatchPenalty: 20,
  /** Max time bonus in ms (3 minutes) */
  maxTimeBonusMs: 180000,
  /** Max time bonus points */
  maxTimeBonus: 500,
} as const;

/**
 * Calculate score for a completed game.
 */
export function calculateScore(
  mismatches: number,
  durationMs: number
): number {
  // Mismatch penalty
  const mismatchDeduction = mismatches * SCORING.mismatchPenalty;
  const baseScore = Math.max(0, SCORING.baseScore - mismatchDeduction);

  // Time bonus: linear decrease from max to 0 based on time
  const timeFactor = Math.max(0, 1 - (durationMs / SCORING.maxTimeBonusMs));
  const timeBonus = Math.floor(timeFactor * SCORING.maxTimeBonus);

  return baseScore + timeBonus;
}
