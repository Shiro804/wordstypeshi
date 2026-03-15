/**
 * BatasFlow - Ruleset Configuration
 * Version: 1.0.0
 *
 * Flow puzzle: connect pairs of colored dots by drawing paths.
 */

export const BATASFLOW_RULESET_VERSION = '1.0.0';

/**
 * Game mode configurations.
 */
export const BATASFLOW_MODES = {
  easy: {
    gridSize: 5,
    numFlows: 5,
  },
  medium: {
    gridSize: 7,
    numFlows: 7,
  },
  hard: {
    gridSize: 9,
    numFlows: 9,
  },
} as const;

export type BatasFlowModeId = keyof typeof BATASFLOW_MODES;

/**
 * 10 clearly distinguishable flow colors.
 */
export const FLOW_COLORS = [
  '#EF4444', // red
  '#3B82F6', // blue
  '#22C55E', // green
  '#F59E0B', // yellow
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#14B8A6', // teal
] as const;

/**
 * Scoring configuration.
 */
export const SCORING = {
  /** Base score for winning */
  baseScore: 1000,
  /** Points deducted per move */
  movePenalty: 5,
  /** Max time bonus window in ms (5 minutes) */
  maxTimeBonusMs: 300000,
  /** Max time bonus points */
  maxTimeBonus: 500,
} as const;

/**
 * Calculate score for a completed game.
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
