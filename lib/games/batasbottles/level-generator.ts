/**
 * BatasBottles - Level Generator
 *
 * Deterministic 1..1000 level progression.
 *
 * The generator maps a level number to a `LevelConfig<BatasBottlesLevelParams>`
 * consumed by the engine. It is a pure function: `generateLevel(n)` always
 * returns the same config for the same `n`.
 *
 * Scaling runs in five phases:
 *   1–50    Tutorial : 4–6 bottles,  3  colors,  cap 4, 2 empty, no limit
 *   51–200  Easy     : 6–10 bottles, 4–5 colors, cap 5, 1–2 empty, generous
 *   201–500 Medium   : 10–14 bottles,5–6 colors, cap 5, 1 empty, moderate
 *   501–800 Hard     : 14–18 bottles,6–7 colors, cap 6, 1 empty, tight
 *   801–1000 Expert  : 18–22 bottles,7–8 colors, cap 6, 0–1 empty, very tight
 *
 * Star thresholds and the move limit are derived from the greedy solver's
 * actual move count on the generated puzzle, so they track the true
 * difficulty of the specific shuffle instead of a blind heuristic.
 *
 * NOTE: exotic variant mechanics (locked layers, poison, rainbow,
 * frozen bottles, blind mode, gravity flip, combo bonus, rotating target)
 * are deliberately NOT implemented yet. The `variants` hook on the
 * `LevelConfig` is reserved so they can be layered in later without
 * breaking existing configs.
 */

import {
  levelSeed,
  lerpInPhase,
  type LevelConfig,
  type LevelSystem,
  type LevelPhase,
} from '../sdk/levels';
import { BATASBOTTLES_LEVEL_COUNT, BOTTLE_COLORS } from './ruleset';
import { generatePuzzle, type BottlesPuzzle } from './puzzle-generator';

// ============================================================================
// Types
// ============================================================================

/**
 * Game-specific parameters a level binds the engine to.
 * Everything the engine needs to build the initial state.
 */
export interface BatasBottlesLevelParams {
  numSmallBottles: number;
  numEmptyBottles: number;
  numColors: number;
  smallBottleCapacity: number;
  bigBottleCapacity: number;
}

// ============================================================================
// Phase descriptors
// ============================================================================

export const BATASBOTTLES_PHASES: LevelPhase[] = [
  { startLevel: 1,   endLevel: 50,   label: 'Tutorial', accent: '#10B981' },
  { startLevel: 51,  endLevel: 200,  label: 'Easy',     accent: '#0EA5E9' },
  { startLevel: 201, endLevel: 500,  label: 'Medium',   accent: '#F59E0B' },
  { startLevel: 501, endLevel: 800,  label: 'Hard',     accent: '#F43F5E' },
  { startLevel: 801, endLevel: 1000, label: 'Expert',   accent: '#A855F7' },
];

function phaseOf(level: number): LevelPhase {
  for (const p of BATASBOTTLES_PHASES) {
    if (level >= p.startLevel && level <= p.endLevel) return p;
  }
  // Defensive: out-of-range levels clamp to the nearest phase.
  return level < 1
    ? BATASBOTTLES_PHASES[0]
    : BATASBOTTLES_PHASES[BATASBOTTLES_PHASES.length - 1];
}

// ============================================================================
// Scaling
// ============================================================================

/**
 * Per-phase linear scaling for raw puzzle parameters.
 * Returns the *nominal* bottle count, color count, capacity and empties.
 * The level number's sub-range inside the phase determines how far along
 * the phase curve we are.
 */
function scaleParams(level: number): BatasBottlesLevelParams {
  const p = phaseOf(level);
  const maxColors = BOTTLE_COLORS.length; // 10 — hard ceiling

  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));

  let numSmallBottles: number;
  let numColors: number;
  let smallBottleCapacity: number;
  let numEmptyBottles: number;
  let bigBottleCapacity: number;

  switch (p.label) {
    case 'Tutorial': {
      // Start at 5 filled-bottle slots (5 small bottles, 2 empty). With
      // smallCap=4 that gives 12 filled cells vs. bigCap=6, so every
      // tutorial level has a healthy filler surplus. This avoids the
      // "every filled bottle is all-target" degenerate case that the
      // generator rejects as trivial.
      numSmallBottles = Math.round(lerpInPhase(level, 1, 50, 5, 7));
      numColors = 3;
      smallBottleCapacity = 4;
      numEmptyBottles = 2;
      bigBottleCapacity = 6;
      break;
    }
    case 'Easy': {
      numSmallBottles = Math.round(lerpInPhase(level, 51, 200, 6, 10));
      numColors = Math.round(lerpInPhase(level, 51, 200, 4, 5));
      smallBottleCapacity = 5;
      // 51-125 → 2 empties, 126-200 → 1 empty
      numEmptyBottles = level <= 125 ? 2 : 1;
      bigBottleCapacity = 10;
      break;
    }
    case 'Medium': {
      numSmallBottles = Math.round(lerpInPhase(level, 201, 500, 10, 14));
      numColors = Math.round(lerpInPhase(level, 201, 500, 5, 6));
      smallBottleCapacity = 5;
      numEmptyBottles = 1;
      bigBottleCapacity = 10;
      break;
    }
    case 'Hard': {
      numSmallBottles = Math.round(lerpInPhase(level, 501, 800, 14, 18));
      numColors = Math.round(lerpInPhase(level, 501, 800, 6, 7));
      smallBottleCapacity = 6;
      numEmptyBottles = 1;
      bigBottleCapacity = 12;
      break;
    }
    case 'Expert':
    default: {
      numSmallBottles = Math.round(lerpInPhase(level, 801, 1000, 18, 22));
      numColors = Math.round(lerpInPhase(level, 801, 1000, 7, 8));
      smallBottleCapacity = 6;
      // Expert keeps exactly one empty maneuvering slot — going to zero
      // empties makes most shuffles unsolvable by any human strategy
      // (the solver needs at least one buffer to peel blocking layers).
      numEmptyBottles = 1;
      bigBottleCapacity = 12;
      break;
    }
  }

  numColors = clamp(numColors, 2, maxColors);

  // Safety: the puzzle generator needs at least one non-empty small bottle
  // and enough filled cells to hold bigBottleCapacity target units.
  const filledBottles = numSmallBottles - numEmptyBottles;
  const filledCells = filledBottles * smallBottleCapacity;
  if (filledCells < bigBottleCapacity) {
    // Shrink the big bottle rather than change the layout the player sees.
    bigBottleCapacity = Math.max(2, filledCells);
  }

  return {
    numSmallBottles,
    numEmptyBottles,
    numColors,
    smallBottleCapacity,
    bigBottleCapacity,
  };
}

// ============================================================================
// Move limit + star thresholds
// ============================================================================

/**
 * Derive the three star thresholds and the move limit from the greedy
 * solver's actual move count on the puzzle we just generated.
 *
 * The greedy solver is a near-optimal heuristic for this puzzle family,
 * so its move count S is a realistic baseline for a competent human run.
 * We anchor 3 stars at S itself (matching or beating the solver) and let
 * the lower tiers fan out from there:
 *   - 3 stars if moves ≤ S
 *   - 2 stars if moves ≤ ceil(S * 1.35)
 *   - 1 star  if moves ≤ ceil(S * 1.75)
 *   - moveLimit scales by phase from generous → tight.
 *
 * Previously this used 0.65 * S as the 3-star bar, which demanded a
 * solution materially better than the greedy solver — effectively
 * unreachable on most layouts, so even the optimal human path only
 * earned 1 star.
 *
 * Tutorial levels get a null move limit so the player can mash the board
 * freely while learning the mechanics.
 */
function deriveLimitsAndStars(
  level: number,
  solverMoves: number
): { moveLimit: number | null; starThresholds: [number, number, number] } {
  const phase = phaseOf(level).label;

  // Floor 1 so the thresholds are never 0 on very short puzzles.
  const baseline = Math.max(1, solverMoves);
  const t1 = baseline;
  const t2 = Math.max(t1 + 1, Math.ceil(baseline * 1.35));
  const t3 = Math.max(t2 + 1, Math.ceil(baseline * 1.75));

  let moveLimit: number | null;
  switch (phase) {
    case 'Tutorial':
      moveLimit = null; // no limit
      break;
    case 'Easy':
      moveLimit = t3 + 12; // generous — always room to recover
      break;
    case 'Medium':
      moveLimit = t3 + 6;  // moderate
      break;
    case 'Hard':
      moveLimit = t3 + 2;  // tight — barely above 1-star threshold
      break;
    case 'Expert':
    default:
      moveLimit = Math.max(t3, Math.floor(t3 * 0.98)); // very tight
      break;
  }

  return { moveLimit, starThresholds: [t1, t2, t3] };
}

// ============================================================================
// Public API
// ============================================================================

export const BATASBOTTLES_GAME_ID = 'batasbottles';

/**
 * Generate the complete, deterministic configuration for a single level.
 * Clamps out-of-range inputs into [1, BATASBOTTLES_LEVEL_COUNT].
 */
export function generateLevel(
  level: number
): LevelConfig<BatasBottlesLevelParams> {
  const clamped = Math.max(1, Math.min(BATASBOTTLES_LEVEL_COUNT, Math.floor(level)));
  const params = scaleParams(clamped);
  const seed = levelSeed(BATASBOTTLES_GAME_ID, clamped);

  // Generate the puzzle once to read the solver's move count — we use it
  // to set star thresholds. Generating again at engine-init time is cheap
  // because the seed is the same and the generator is deterministic.
  const puzzle: BottlesPuzzle = generatePuzzle(seed, params);
  const { moveLimit, starThresholds } = deriveLimitsAndStars(
    clamped,
    puzzle.solverMoves
  );

  return {
    level: clamped,
    seed,
    params,
    moveLimit,
    starThresholds,
    phaseLabel: phaseOf(clamped).label,
    // variants: reserved for future exotic mechanics (locked/poison/…).
    variants: undefined,
  };
}

/**
 * The `LevelSystem` implementation registered on the game definition.
 * Exposed so the shared level-select UI can drive any game generically.
 */
export const batasBottlesLevelSystem: LevelSystem<BatasBottlesLevelParams> = {
  maxLevel: BATASBOTTLES_LEVEL_COUNT,
  generateLevel,
  phases: BATASBOTTLES_PHASES,
};
