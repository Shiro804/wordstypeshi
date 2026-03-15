/**
 * BatasMine - Ruleset Configuration
 * Version: 1.0.0
 *
 * Minesweeper-style game: reveal cells without hitting mines.
 */

export const BATASMINE_RULESET_VERSION = '1.0.0';

/**
 * Game mode configurations.
 */
export const BATASMINE_MODES = {
  easy: {
    rows: 8,
    cols: 8,
    mines: 10,
  },
  medium: {
    rows: 12,
    cols: 12,
    mines: 30,
  },
  hard: {
    rows: 16,
    cols: 16,
    mines: 60,
  },
} as const;

export type BatasMineModeId = keyof typeof BATASMINE_MODES;

/**
 * Cell states for display.
 */
export type CellState = 'hidden' | 'revealed' | 'flagged' | 'mine_exploded' | 'mine_revealed';

/**
 * Scoring configuration.
 */
export const SCORING = {
  /** Base score for winning */
  baseScore: 1000,
  /** Bonus per cell revealed (non-mine) */
  cellBonus: 5,
  /** Max time bonus in ms (5 minutes) */
  maxTimeBonusMs: 300000,
  /** Max time bonus points */
  maxTimeBonus: 500,
} as const;

/**
 * Calculate score for a completed game.
 */
export function calculateScore(
  cellsRevealed: number,
  durationMs: number
): number {
  const cellPoints = cellsRevealed * SCORING.cellBonus;
  const baseScore = SCORING.baseScore + cellPoints;

  // Time bonus: linear decrease from max to 0
  const timeFactor = Math.max(0, 1 - (durationMs / SCORING.maxTimeBonusMs));
  const timeBonus = Math.floor(timeFactor * SCORING.maxTimeBonus);

  return baseScore + timeBonus;
}
