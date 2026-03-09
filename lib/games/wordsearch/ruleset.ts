/**
 * Word Search - Ruleset Configuration
 * Version: 1.0.0
 */

export const WORDSEARCH_RULESET_VERSION = '1.0.0';

/**
 * Direction vectors for word placement
 */
export const DIRECTIONS = {
  // Forward directions (easy mode)
  RIGHT: { dr: 0, dc: 1, name: 'right' },
  DOWN: { dr: 1, dc: 0, name: 'down' },
  // Diagonal forward (medium mode adds these)
  DOWN_RIGHT: { dr: 1, dc: 1, name: 'down-right' },
  DOWN_LEFT: { dr: 1, dc: -1, name: 'down-left' },
  // Backward directions (hard mode adds these)
  LEFT: { dr: 0, dc: -1, name: 'left' },
  UP: { dr: -1, dc: 0, name: 'up' },
  UP_RIGHT: { dr: -1, dc: 1, name: 'up-right' },
  UP_LEFT: { dr: -1, dc: -1, name: 'up-left' },
} as const;

export type DirectionKey = keyof typeof DIRECTIONS;

/**
 * Get allowed directions for a difficulty
 */
export function getDirectionsForDifficulty(difficulty: 'easy' | 'medium' | 'hard'): DirectionKey[] {
  switch (difficulty) {
    case 'easy':
      return ['RIGHT', 'DOWN'];
    case 'medium':
      return ['RIGHT', 'DOWN', 'DOWN_RIGHT', 'DOWN_LEFT'];
    case 'hard':
      return Object.keys(DIRECTIONS) as DirectionKey[];
  }
}

/**
 * Game mode configurations
 */
export const WORDSEARCH_MODES = {
  easy: {
    rows: 10,
    cols: 10,
    wordCount: 8,
    minWordLength: 3,
    maxWordLength: 6,
    allowReverse: false,
    showWordList: true, // Words visible
  },
  medium: {
    rows: 12,
    cols: 12,
    wordCount: 10,
    minWordLength: 4,
    maxWordLength: 7,
    allowReverse: false,
    showWordList: false, // Words hidden!
  },
  hard: {
    rows: 14,
    cols: 14,
    wordCount: 12,
    minWordLength: 4,
    maxWordLength: 8,
    allowReverse: true,
    showWordList: false, // Words hidden!
  },
} as const;

export type WordSearchModeId = keyof typeof WORDSEARCH_MODES;

/**
 * Fill characters for empty grid cells
 */
export const FILL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Scoring configuration
 */
export const SCORING = {
  /** Base score for completing the puzzle */
  baseScore: 1000,
  /** Points deducted per second of solve time */
  timeDeduction: 1,
  /** Max time for scoring (5 minutes) */
  maxTimeMs: 300000,
  /** Penalty per misselect */
  misselectPenalty: 10,
  /** Penalty per hint used */
  hintPenalty: 50,
} as const;

/**
 * Calculate score for a completed game
 */
export function calculateScore(
  solved: boolean,
  durationMs: number,
  misselects: number,
  hintsUsed: number
): number {
  if (!solved) return 0;
  
  const seconds = Math.floor(durationMs / 1000);
  const timeDeduction = Math.min(seconds * SCORING.timeDeduction, SCORING.baseScore / 2);
  const misselectDeduction = misselects * SCORING.misselectPenalty;
  const hintDeduction = hintsUsed * SCORING.hintPenalty;
  
  return Math.max(0, SCORING.baseScore - timeDeduction - misselectDeduction - hintDeduction);
}
