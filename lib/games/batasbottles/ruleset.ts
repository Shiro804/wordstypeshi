/**
 * BatasBottles - Ruleset Configuration
 * Version: 1.0.0
 *
 * Color-sort / bottle-pour puzzle: pour liquid between small bottles and
 * fill the big central target bottle with a single uniform target color.
 */

export const BATASBOTTLES_RULESET_VERSION = '1.0.0';

/**
 * Capacity (= number of stackable color layers) of the big central
 * target bottle. It is twice the height of a small bottle.
 */
export const BIG_BOTTLE_CAPACITY = 12;

/**
 * Capacity of a small source bottle — "6 stacks of color" as spec'd.
 */
export const SMALL_BOTTLE_CAPACITY = 6;

/**
 * Game mode configurations.
 *
 * numSmallBottles  — total small bottles surrounding the target
 * numEmptyBottles  — of those, how many start completely empty
 *                    (buffer space needed for maneuvering)
 * numColors        — total distinct colors (including the target)
 */
export const BATASBOTTLES_MODES = {
  easy: {
    numSmallBottles: 6,
    numEmptyBottles: 2,
    numColors: 3,
  },
  medium: {
    numSmallBottles: 8,
    numEmptyBottles: 2,
    numColors: 5,
  },
  hard: {
    numSmallBottles: 12,
    numEmptyBottles: 2,
    numColors: 7,
  },
} as const;

export type BatasBottlesModeId = keyof typeof BATASBOTTLES_MODES;

/**
 * Vivid, clearly distinguishable liquid colors.
 *
 * Hand-picked so that any pair in the list is easily told apart on a dark
 * background — no near-duplicate reds/pinks, no overlapping greens/limes,
 * no twin cyan/teal, no amber/orange clash.
 */
export const BOTTLE_COLORS = [
  '#DC2626', // red       — pure vivid red
  '#F97316', // orange    — clearly warm orange
  '#FACC15', // yellow    — saturated school-bus yellow
  '#22C55E', // green     — pure green
  '#06B6D4', // cyan      — bright cyan
  '#2563EB', // blue      — royal blue (clearly cooler than cyan)
  '#9333EA', // purple    — saturated violet
  '#EC4899', // magenta   — hot pink (clearly cooler than red)
  '#F8FAFC', // white     — off-white "milky" liquid
  '#92400E', // brown     — earthy brown (clearly darker than orange)
] as const;

/**
 * Scoring configuration — mirrors the rest of the hub.
 */
export const SCORING = {
  /** Base score for winning */
  baseScore: 1500,
  /** Points deducted per pour move */
  movePenalty: 10,
  /** Max time-bonus window (6 minutes) */
  maxTimeBonusMs: 360000,
  /** Max time bonus points */
  maxTimeBonus: 600,
} as const;

/**
 * Calculate score for a completed game.
 *
 * Fewer moves + faster = higher score. Minimum is 0.
 */
export function calculateScore(
  moveCount: number,
  durationMs: number
): number {
  const moveDeduction = moveCount * SCORING.movePenalty;
  const baseScore = Math.max(0, SCORING.baseScore - moveDeduction);

  const timeFactor = Math.max(0, 1 - (durationMs / SCORING.maxTimeBonusMs));
  const timeBonus = Math.floor(timeFactor * SCORING.maxTimeBonus);

  return baseScore + timeBonus;
}
