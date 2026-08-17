/**
 * BatasBottles - Puzzle Generator
 *
 * Generates always-solvable bottle-pour puzzles.
 *
 * Algorithm:
 * 1. Pick a target color and N−1 filler colors from the palette
 * 2. Build a pool containing exactly `bigBottleCapacity` target units
 *    plus enough filler units to saturate the non-empty small bottles
 * 3. Seed-shuffle the pool and distribute it into the non-empty small
 *    bottles layer-by-layer
 * 4. Verify the result is actually solvable using a bounded greedy solver
 *    that only requires the empty-bottle safety margin — reshuffle if not
 *
 * The greedy solver is intentionally weaker than an optimal one so that
 * puzzles passing the check are *robustly* solvable by mere humans.
 *
 * Version 2.0.0: bottle capacities are now per-puzzle parameters so the
 * level system can vary difficulty without touching engine internals.
 */

import { createSeededRandom } from '../sdk/prng';
import {
  BIG_BOTTLE_CAPACITY,
  SMALL_BOTTLE_CAPACITY,
  BOTTLE_COLORS,
} from './ruleset';

// ============================================================================
// Types
// ============================================================================

/** Index 0 is always the big target bottle. Indices ≥1 are small bottles. */
export const TARGET_BOTTLE_ID = 0;

export interface BottleSnapshot {
  id: number;
  capacity: number;
  /** Layers from bottom to top — `layers[0]` is at the bottom of the bottle. */
  layers: string[];
  isTarget: boolean;
}

export interface BottlesPuzzle {
  /** The color the player is racing to fill the big bottle with. */
  targetColor: string;
  /** All colors present in the puzzle (target + fillers). */
  palette: string[];
  /** Initial bottle states. Index 0 = target bottle. */
  bottles: BottleSnapshot[];
  /**
   * Number of moves the greedy solver needed to solve the puzzle.
   * This is the "reference" difficulty used to compute star thresholds.
   */
  solverMoves: number;
}

export interface PuzzleParams {
  numSmallBottles: number;
  numEmptyBottles: number;
  numColors: number;
  /** Capacity of each small bottle. Defaults to `SMALL_BOTTLE_CAPACITY`. */
  smallBottleCapacity?: number;
  /** Capacity of the big target bottle. Defaults to `BIG_BOTTLE_CAPACITY`. */
  bigBottleCapacity?: number;
}

// ============================================================================
// Generation helpers
// ============================================================================

function shuffleInPlace<T>(arr: T[], random: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function clone(bottles: BottleSnapshot[]): BottleSnapshot[] {
  return bottles.map(b => ({ ...b, layers: [...b.layers] }));
}

function topColor(bottle: BottleSnapshot): string | null {
  return bottle.layers.length > 0 ? bottle.layers[bottle.layers.length - 1] : null;
}

function spaceLeft(bottle: BottleSnapshot): number {
  return bottle.capacity - bottle.layers.length;
}

/**
 * How many consecutive same-color layers sit on top of the bottle.
 * Returns 0 if the bottle is empty.
 */
function topRunSize(bottle: BottleSnapshot): number {
  if (bottle.layers.length === 0) return 0;
  const top = bottle.layers[bottle.layers.length - 1];
  let n = 0;
  for (let i = bottle.layers.length - 1; i >= 0 && bottle.layers[i] === top; i--) {
    n++;
  }
  return n;
}

// ============================================================================
// Solvability check — bounded greedy solver
// ============================================================================

/**
 * Attempt to solve the puzzle greedily. Returns `{ solved, moves }` where
 * `moves` is the number of pours the solver actually performed. When the
 * solver couldn't finish, `solved` is false and `moves` reflects the
 * partial progress (not meaningful for difficulty tuning).
 *
 * Priority:
 *   1. Pour ready target runs straight into the big bottle.
 *   2. If the big bottle still needs more target, peel the closest buried
 *      target by dumping its blockers onto valid small-bottle destinations.
 *   3. Consolidate matching small-bottle tops to free up slots.
 */
function greedySolve(
  initial: BottleSnapshot[],
  targetColor: string,
  maxSteps: number
): { solved: boolean; moves: number } {
  const bottles = clone(initial);
  const big = bottles[TARGET_BOTTLE_ID];
  const smalls = () => bottles.filter(b => !b.isTarget);
  let moves = 0;

  const pour = (fromId: number, toId: number): boolean => {
    const from = bottles[fromId];
    const to = bottles[toId];
    if (from.layers.length === 0) return false;
    if (spaceLeft(to) === 0) return false;

    const runColor = from.layers[from.layers.length - 1];
    if (to.isTarget && runColor !== targetColor) return false;
    if (to.layers.length > 0 && topColor(to) !== runColor) return false;

    const runSize = topRunSize(from);
    const moveAmount = Math.min(runSize, spaceLeft(to));
    for (let i = 0; i < moveAmount; i++) {
      to.layers.push(from.layers.pop()!);
    }
    moves++;
    return true;
  };

  const isWon = () =>
    big.layers.length === big.capacity &&
    big.layers.every(c => c === targetColor);

  for (let step = 0; step < maxSteps; step++) {
    if (isWon()) return { solved: true, moves };

    // 1. Any small bottle whose top is the target color → pour into big.
    let poured = false;
    for (const b of smalls()) {
      if (topColor(b) === targetColor && spaceLeft(big) > 0) {
        if (pour(b.id, big.id)) {
          poured = true;
          break;
        }
      }
    }
    if (poured) continue;

    // 2. Peel the least-buried target somewhere.
    type Candidate = { bottleId: number; blockersToRemove: number };
    let best: Candidate | null = null;
    for (const b of smalls()) {
      const idx = b.layers.lastIndexOf(targetColor);
      if (idx === -1) continue;
      const blockers = b.layers.length - 1 - idx;
      if (blockers === 0) continue; // already on top — handled above
      if (best === null || blockers < best.blockersToRemove) {
        best = { bottleId: b.id, blockersToRemove: blockers };
      }
    }

    if (best !== null) {
      const source = bottles[best.bottleId];
      const blockerColor = topColor(source);
      if (blockerColor === null) return { solved: false, moves };

      let moved = false;
      for (const dest of smalls()) {
        if (dest.id === source.id) continue;
        if (spaceLeft(dest) === 0) continue;
        if (dest.layers.length > 0 && topColor(dest) !== blockerColor) continue;
        if (pour(source.id, dest.id)) {
          moved = true;
          break;
        }
      }
      if (moved) continue;
    }

    // 3. Last resort — merge matching-top runs elsewhere to free a slot.
    let consolidated = false;
    for (const src of smalls()) {
      if (src.layers.length === 0) continue;
      const srcTop = topColor(src);
      if (srcTop === targetColor) continue; // handled by rule 1
      for (const dst of smalls()) {
        if (src.id === dst.id) continue;
        if (dst.layers.length === 0) continue; // skip empties — we want merge
        if (spaceLeft(dst) === 0) continue;
        if (topColor(dst) !== srcTop) continue;
        if (pour(src.id, dst.id)) {
          consolidated = true;
          break;
        }
      }
      if (consolidated) break;
    }
    if (consolidated) continue;

    // No progress possible.
    return { solved: isWon(), moves };
  }

  return { solved: isWon(), moves };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate a solvable BatasBottles puzzle from a seed and parameters.
 *
 * The generator retries on the rare unsolvable shuffle; if nothing valid is
 * found within the retry budget, the seed is perturbed and we try again.
 */
export function generatePuzzle(
  seed: string,
  params: PuzzleParams,
  _retryDepth: number = 0
): BottlesPuzzle {
  if (_retryDepth > 8) {
    throw new Error(
      `generatePuzzle: unable to produce a valid shuffle after ${_retryDepth} seed perturbations — ` +
        `params are too constrained (numSmallBottles=${params.numSmallBottles}, ` +
        `numEmptyBottles=${params.numEmptyBottles}, numColors=${params.numColors}, ` +
        `smallBottleCapacity=${params.smallBottleCapacity}, bigBottleCapacity=${params.bigBottleCapacity})`
    );
  }
  const {
    numSmallBottles,
    numEmptyBottles,
    numColors,
    smallBottleCapacity = SMALL_BOTTLE_CAPACITY,
    bigBottleCapacity = BIG_BOTTLE_CAPACITY,
  } = params;

  if (numColors < 2) throw new Error('numColors must be ≥ 2');
  if (numColors > BOTTLE_COLORS.length) {
    throw new Error(`numColors cannot exceed palette size (${BOTTLE_COLORS.length})`);
  }
  if (numEmptyBottles >= numSmallBottles) {
    throw new Error('numEmptyBottles must be strictly less than numSmallBottles');
  }
  if (smallBottleCapacity < 2) throw new Error('smallBottleCapacity must be ≥ 2');
  if (bigBottleCapacity < 2) throw new Error('bigBottleCapacity must be ≥ 2');

  const random = createSeededRandom(seed);

  // Pick palette: target + (numColors - 1) fillers
  const paletteShuffled = [...BOTTLE_COLORS];
  shuffleInPlace(paletteShuffled, random);
  const palette = paletteShuffled.slice(0, numColors);
  const targetColor = palette[0];
  const fillerColors = palette.slice(1);

  const filledBottleCount = numSmallBottles - numEmptyBottles;
  const totalFilledCells = filledBottleCount * smallBottleCapacity;

  if (totalFilledCells < bigBottleCapacity) {
    throw new Error(
      `Not enough small bottle capacity (${totalFilledCells}) to hold all ${bigBottleCapacity} target units`
    );
  }

  const fillerUnitsTotal = totalFilledCells - bigBottleCapacity;

  const maxAttempts = 60;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Build the content pool
    const pool: string[] = [];
    for (let i = 0; i < bigBottleCapacity; i++) pool.push(targetColor);

    if (fillerColors.length > 0) {
      // Distribute filler units across filler colors as evenly as possible
      // with a bit of random jitter so puzzles feel varied.
      const perColor = Math.floor(fillerUnitsTotal / fillerColors.length);
      const remainder = fillerUnitsTotal - perColor * fillerColors.length;
      const counts = fillerColors.map(() => perColor);
      for (let i = 0; i < remainder; i++) {
        counts[i]++;
      }
      for (let i = 0; i < fillerColors.length; i++) {
        for (let j = 0; j < counts[i]; j++) pool.push(fillerColors[i]);
      }
    }

    shuffleInPlace(pool, random);

    // Assemble bottles
    const bottles: BottleSnapshot[] = [];
    bottles.push({
      id: 0,
      capacity: bigBottleCapacity,
      layers: [],
      isTarget: true,
    });

    // Decide which small bottles start empty (random selection).
    const smallIds = Array.from({ length: numSmallBottles }, (_, i) => i + 1);
    shuffleInPlace(smallIds, random);
    const emptyIds = new Set(smallIds.slice(0, numEmptyBottles));

    let cursor = 0;
    for (let i = 1; i <= numSmallBottles; i++) {
      const isEmpty = emptyIds.has(i);
      const layers: string[] = [];
      if (!isEmpty) {
        for (let j = 0; j < smallBottleCapacity; j++) {
          layers.push(pool[cursor++]);
        }
      }
      bottles.push({
        id: i,
        capacity: smallBottleCapacity,
        layers,
        isTarget: false,
      });
    }

    // Reject trivial cases: a small bottle that is already all-target.
    const trivial = bottles
      .filter(b => !b.isTarget && b.layers.length === smallBottleCapacity)
      .some(b => b.layers.every(c => c === targetColor));
    if (trivial) continue;

    // Verify solvability with a bounded greedy solver.
    const moveCap = 600;
    const { solved, moves } = greedySolve(bottles, targetColor, moveCap);
    if (solved) {
      return { targetColor, palette, bottles, solverMoves: moves };
    }
  }

  // Fallback: perturb the seed and try again. Extremely rare in practice.
  return generatePuzzle(seed + '_r', params, _retryDepth + 1);
}
