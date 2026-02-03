/**
 * BatasColors - Ruleset Configuration
 * Version: 1.0.0
 */

export const BATASCOLORS_RULESET_VERSION = '1.0.0';

/**
 * Game mode configurations.
 */
export const BATASCOLORS_MODES = {
  easy: {
    numSegments: 2,
    paletteSize: 5,
    maxAttempts: 6,
  },
  medium: {
    numSegments: 3,
    paletteSize: 6,
    maxAttempts: 6,
  },
  hard: {
    numSegments: 4,
    paletteSize: 7,
    maxAttempts: 6,
  },
} as const;

export type BatasColorsModeId = keyof typeof BATASCOLORS_MODES;

/**
 * RGB Color type
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Base color pool for generating palettes.
 * These are vibrant, distinguishable colors.
 */
export const BASE_COLORS: RGB[] = [
  { r: 239, g: 68, b: 68 },   // Red
  { r: 249, g: 115, b: 22 },  // Orange
  { r: 234, g: 179, b: 8 },   // Yellow
  { r: 34, g: 197, b: 94 },   // Green
  { r: 6, g: 182, b: 212 },   // Cyan
  { r: 59, g: 130, b: 246 },  // Blue
  { r: 139, g: 92, b: 246 },  // Purple
  { r: 236, g: 72, b: 153 },  // Pink
  { r: 244, g: 114, b: 182 }, // Light Pink
  { r: 132, g: 204, b: 22 },  // Lime
];

/**
 * Scoring configuration.
 */
export const SCORING = {
  /** Base score for winning */
  baseScore: 1000,
  /** Bonus per unused attempt */
  attemptBonus: 150,
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

/**
 * Convert RGB to hex string.
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert hex string to RGB.
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}
