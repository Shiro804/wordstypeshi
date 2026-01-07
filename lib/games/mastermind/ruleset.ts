/**
 * Mastermind - Ruleset Configuration
 * Version: 1.0.0
 */

export const MASTERMIND_RULESET_VERSION = '1.0.0';

/**
 * Game mode configurations.
 */
export const MASTERMIND_MODES = {
  classic_4x6: {
    codeLength: 4,
    numColors: 6,
    maxAttempts: 10,
    allowDuplicates: true,
  },
  classic_4x8: {
    codeLength: 4,
    numColors: 8,
    maxAttempts: 10,
    allowDuplicates: true,
  },
  hard_5x8: {
    codeLength: 5,
    numColors: 8,
    maxAttempts: 12,
    allowDuplicates: true,
  },
  daily: {
    codeLength: 4,
    numColors: 6,
    maxAttempts: 10,
    allowDuplicates: true,
  },
} as const;

export type MastermindModeId = keyof typeof MASTERMIND_MODES;

/**
 * Color palette for the game UI.
 */
export const MASTERMIND_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Orange/Yellow
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
] as const;

/**
 * Scoring configuration.
 */
export const SCORING = {
  /** Base score for winning */
  baseScore: 1000,
  /** Bonus per unused attempt */
  attemptBonus: 100,
  /** Max time bonus in ms (5 minutes) */
  maxTimeBonusMs: 300000,
  /** Max time bonus points */
  maxTimeBonus: 200,
} as const;

/**
 * Calculate score for a completed game.
 */
export function calculateScore(
  won: boolean,
  attemptsUsed: number,
  maxAttempts: number,
  durationMs: number
): number {
  if (!won) return 0;
  
  // Attempt bonus: more points for fewer attempts
  const unusedAttempts = maxAttempts - attemptsUsed;
  const attemptScore = SCORING.baseScore + (unusedAttempts * SCORING.attemptBonus);
  
  // Time bonus: linear decrease from max to 0 based on time
  const timeFactor = Math.max(0, 1 - (durationMs / SCORING.maxTimeBonusMs));
  const timeBonus = Math.floor(timeFactor * SCORING.maxTimeBonus);
  
  return attemptScore + timeBonus;
}
