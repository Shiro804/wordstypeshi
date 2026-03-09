/**
 * BatasColors - Game Engine
 * 
 * Pure, deterministic game logic for BatasColors color mixing game.
 * All functions are side-effect free and reproducible.
 */

import type { 
  GameEngine, 
  ActionResult, 
  GameEvent, 
  GameSummary,
  BaseGameState,
  GameParams 
} from '../sdk/types';
import { createSeededRandom } from '../sdk';
import { 
  BATASCOLORS_MODES, 
  calculateScore, 
  type BatasColorsModeId,
  type RGB,
  BASE_COLORS,
  rgbToHex,
} from './ruleset';

// ============================================================================
// Types
// ============================================================================

export interface BatasColorsParams extends GameParams {
  numSegments: number;
  paletteSize: number;
  maxAttempts: number;
}

export interface Segment {
  /** Percentage this segment contributes (0-100) */
  percentage: number;
  /** Color index assigned by player (-1 if empty) */
  colorIndex: number;
}

export interface Attempt {
  /** Color indices for each segment */
  segmentColors: number[];
  /** Resulting mixed color */
  mixedColor: RGB;
  /** Accuracy percentage (0-100) */
  accuracy: number;
}

export interface BatasColorsState extends BaseGameState {
  /** Game configuration */
  config: BatasColorsParams;
  /** The target color to match */
  targetColor: RGB;
  /** Color palette for this game (RGB values) */
  palette: RGB[];
  /** Segment percentages (fixed for the game) */
  segmentPercentages: number[];
  /** The solution (color indices that give 100% accuracy) */
  solution: number[];
  /** History of attempts */
  attempts: Attempt[];
  /** Current attempt number (0-indexed) */
  currentAttempt: number;
}

export interface BatasColorsAction {
  type: 'submit_guess';
  /** Color index for each segment */
  segmentColors: number[];
}

// ============================================================================
// Core Algorithm: Color Mixing
// ============================================================================

/**
 * Mix colors based on segment percentages.
 * Uses weighted RGB average.
 */
export function mixColors(
  segments: { color: RGB; percentage: number }[]
): RGB {
  let r = 0, g = 0, b = 0;
  
  for (const seg of segments) {
    r += seg.color.r * (seg.percentage / 100);
    g += seg.color.g * (seg.percentage / 100);
    b += seg.color.b * (seg.percentage / 100);
  }
  
  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}

/**
 * Calculate accuracy between mixed color and target.
 * Returns 0-100 where 100 is perfect match.
 */
export function calculateAccuracy(mixed: RGB, target: RGB): number {
  const maxDiff = 255 * 3; // Max possible RGB difference
  const diff = Math.abs(mixed.r - target.r) + 
               Math.abs(mixed.g - target.g) + 
               Math.abs(mixed.b - target.b);
  return Math.round((1 - diff / maxDiff) * 100);
}

// ============================================================================
// Puzzle Generation
// ============================================================================

/**
 * Generate random segment percentages that sum to 100.
 * Ensures no segment is less than 10% for visibility.
 */
function generateSegmentPercentages(
  numSegments: number, 
  random: () => number
): number[] {
  const minPercentage = 10;
  const remaining = 100 - (minPercentage * numSegments);
  
  // Generate random distribution for remaining percentage
  const randomParts: number[] = [];
  for (let i = 0; i < numSegments; i++) {
    randomParts.push(random());
  }
  const total = randomParts.reduce((a, b) => a + b, 0);
  
  // Distribute remaining percentage proportionally
  const percentages = randomParts.map(p => 
    Math.round(minPercentage + (p / total) * remaining)
  );
  
  // Adjust last segment to ensure sum is exactly 100
  const sum = percentages.reduce((a, b) => a + b, 0);
  percentages[percentages.length - 1] += 100 - sum;
  
  return percentages;
}

/**
 * Generate a puzzle with guaranteed 100% solution.
 * Ensures the target is always a true mix (at least 2 different colors).
 */
function generatePuzzle(
  seed: string,
  params: BatasColorsParams
): {
  targetColor: RGB;
  palette: RGB[];
  segmentPercentages: number[];
  solution: number[];
} {
  const random = createSeededRandom(seed);
  
  // Generate segment percentages
  const segmentPercentages = generateSegmentPercentages(params.numSegments, random);
  
  // Shuffle base colors and pick palette
  const shuffledColors = [...BASE_COLORS];
  for (let i = shuffledColors.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledColors[i], shuffledColors[j]] = [shuffledColors[j], shuffledColors[i]];
  }
  const palette = shuffledColors.slice(0, params.paletteSize);
  
  // Generate random solution that uses at least 2 different colors
  // This ensures the target is always a true mix, not a single palette color
  let solution: number[] = [];
  let attempts = 0;
  const maxAttempts = 100;
  
  do {
    solution = [];
    for (let i = 0; i < params.numSegments; i++) {
      solution.push(Math.floor(random() * params.paletteSize));
    }
    attempts++;
    // Check if at least 2 different colors are used
    const uniqueColors = new Set(solution);
    if (uniqueColors.size >= 2) break;
  } while (attempts < maxAttempts);
  
  // Fallback: If random didn't produce variety, force different colors
  if (new Set(solution).size < 2 && params.numSegments >= 2) {
    // Ensure at least first two segments have different colors
    solution[1] = (solution[0] + 1) % params.paletteSize;
  }
  
  // Calculate target color based on solution
  const segments = segmentPercentages.map((percentage, i) => ({
    color: palette[solution[i]],
    percentage,
  }));
  const targetColor = mixColors(segments);
  
  return { targetColor, palette, segmentPercentages, solution };
}

// ============================================================================
// Game Engine Implementation
// ============================================================================

/**
 * Initialize a new BatasColors game.
 */
function init(seed: string, params: BatasColorsParams): BatasColorsState {
  const puzzle = generatePuzzle(seed, params);
  
  return {
    status: 'playing',
    startedAtMs: Date.now(),
    endedAtMs: null,
    config: params,
    targetColor: puzzle.targetColor,
    palette: puzzle.palette,
    segmentPercentages: puzzle.segmentPercentages,
    solution: puzzle.solution,
    attempts: [],
    currentAttempt: 0,
  };
}

/**
 * Validate a guess action.
 */
function validateAction(
  state: BatasColorsState, 
  action: BatasColorsAction
): string | null {
  if (action.type !== 'submit_guess') {
    return 'Unknown action type';
  }
  
  if (state.status !== 'playing') {
    return 'Game is already finished';
  }
  
  if (action.segmentColors.length !== state.config.numSegments) {
    return `Must provide exactly ${state.config.numSegments} colors`;
  }
  
  for (const colorIdx of action.segmentColors) {
    if (!Number.isInteger(colorIdx) || colorIdx < 0 || colorIdx >= state.palette.length) {
      return `Invalid color index: ${colorIdx}. Must be 0-${state.palette.length - 1}`;
    }
  }
  
  return null;
}

/**
 * Apply an action to the game state.
 */
function applyAction(
  state: BatasColorsState, 
  action: BatasColorsAction
): ActionResult<BatasColorsState> {
  const validationError = validateAction(state, action);
  if (validationError) {
    return {
      state,
      events: [],
      invalidReason: validationError,
    };
  }
  
  // Calculate mixed color
  const segments = state.segmentPercentages.map((percentage, i) => ({
    color: state.palette[action.segmentColors[i]],
    percentage,
  }));
  const mixedColor = mixColors(segments);
  const accuracy = calculateAccuracy(mixedColor, state.targetColor);
  
  const attempt: Attempt = {
    segmentColors: action.segmentColors,
    mixedColor,
    accuracy,
  };
  
  const newAttempts = [...state.attempts, attempt];
  const newAttemptCount = state.currentAttempt + 1;
  
  // Check win/lose conditions
  const won = accuracy === 100;
  const lost = !won && newAttemptCount >= state.config.maxAttempts;
  
  const newStatus = won ? 'won' : lost ? 'lost' : 'playing';
  const endedAtMs = newStatus !== 'playing' ? Date.now() : null;
  
  const events: GameEvent[] = [
    {
      type: 'guess_evaluated',
      payload: {
        segmentColors: action.segmentColors,
        mixedColor,
        accuracy,
        attemptNumber: newAttemptCount,
      },
    },
  ];
  
  if (newStatus !== 'playing') {
    events.push({
      type: 'game_ended',
      payload: {
        outcome: newStatus,
        solution: state.solution,
        targetColor: state.targetColor,
      },
    });
  }
  
  return {
    state: {
      ...state,
      attempts: newAttempts,
      currentAttempt: newAttemptCount,
      status: newStatus,
      endedAtMs,
    },
    events,
  };
}

/**
 * Check if the game is in a terminal state.
 */
function isTerminal(state: BatasColorsState): boolean {
  return state.status !== 'playing';
}

/**
 * Get the score for the current state.
 */
function getScore(state: BatasColorsState, durationMs: number): number {
  return calculateScore(
    state.status === 'won',
    state.currentAttempt,
    state.config.maxAttempts,
    durationMs
  );
}

/**
 * Get a summary of the completed game.
 */
function getSummary(state: BatasColorsState): GameSummary {
  const durationMs = state.endedAtMs 
    ? state.endedAtMs - state.startedAtMs 
    : Date.now() - state.startedAtMs;
  
  return {
    outcome: state.status === 'won' ? 'win' : state.status === 'lost' ? 'lose' : 'forfeit',
    score: getScore(state, durationMs),
    attemptsUsed: state.currentAttempt,
    durationMs,
    details: {
      solution: state.solution,
      targetColor: state.targetColor,
      attempts: state.attempts,
    },
  };
}

/**
 * Verify a game by replaying actions.
 */
function verify(
  seed: string, 
  params: BatasColorsParams, 
  actions: BatasColorsAction[]
): GameSummary {
  let state = init(seed, params);
  
  for (const action of actions) {
    const result = applyAction(state, action);
    if (result.invalidReason) {
      throw new Error(`Invalid action during verification: ${result.invalidReason}`);
    }
    state = result.state;
  }
  
  return getSummary(state);
}

// ============================================================================
// Export Engine
// ============================================================================

export const batascolorsEngine: GameEngine<BatasColorsState, BatasColorsAction, BatasColorsParams> = {
  init,
  applyAction,
  isTerminal,
  getScore,
  getSummary,
  verify,
};

/**
 * Helper: Get params for a mode.
 */
export function getModeParams(modeId: BatasColorsModeId): BatasColorsParams {
  return { ...BATASCOLORS_MODES[modeId] };
}

/**
 * Helper: Get palette as hex strings for UI.
 */
export function getPaletteHex(state: BatasColorsState): string[] {
  return state.palette.map(rgbToHex);
}
