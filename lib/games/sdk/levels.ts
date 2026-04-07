/**
 * Game SDK - Generic Level System
 *
 * Optional opt-in infrastructure for games that want to expose a
 * progression of numbered levels (1..N) instead of (or in addition to)
 * raw difficulty modes.
 *
 * A game opts in by providing a `LevelSystem<TParams>` on its
 * `GameDefinition`. The game's engine then accepts a `level` parameter
 * and looks up the concrete `LevelConfig` via the system.
 *
 * Design goals:
 *   - Existing games that don't use levels are unaffected.
 *   - Shared UI (level-select grid, star badges) can render any
 *     game that has a `levelSystem`.
 *   - Star calculation + progress merging happen in one place so
 *     every game gets the same contract for free.
 */

import { createSeededRandom } from './prng';

// ============================================================================
// Core types
// ============================================================================

/** How many stars a player has earned for a level. 0 = not completed. */
export type StarCount = 0 | 1 | 2 | 3;

/**
 * Immutable, deterministic configuration for a single numbered level.
 * Produced by `LevelSystem.generateLevel(n)`.
 *
 * `TParams` is the game-specific parameter shape (e.g. for BatasBottles
 * this describes bottle count / colors / capacity).
 */
export interface LevelConfig<TParams> {
  /** 1-based level number. */
  level: number;
  /** Deterministic seed used for any PRNG the game needs. */
  seed: string;
  /** Game-specific parameters consumed by the engine. */
  params: TParams;
  /**
   * Maximum allowed moves before the level counts as lost.
   * `null` = no limit (tutorial levels).
   */
  moveLimit: number | null;
  /**
   * Inclusive star thresholds on move count (ascending):
   *   [0] = 3 stars if moves <= thresholds[0]
   *   [1] = 2 stars if moves <= thresholds[1]
   *   [2] = 1 star  if moves <= thresholds[2]
   *   otherwise 0 stars (still a win if below moveLimit)
   */
  starThresholds: [number, number, number];
  /** Optional human-readable phase label (e.g. "Tutorial", "Expert"). */
  phaseLabel?: string;
  /**
   * Optional extension hook for future variant mechanics
   * (locked/poison/rainbow layers, frozen bottles, blind mode, …).
   * Games are free to inspect this but it is deliberately unstructured
   * so adding new variants later doesn't break older configs.
   */
  variants?: Record<string, unknown>;
}

/**
 * Describes a contiguous difficulty phase within a level system.
 * Purely descriptive — used by the level-select UI for colouring and
 * grouping. Games define their own phases.
 */
export interface LevelPhase {
  /** 1-based inclusive start level. */
  startLevel: number;
  /** 1-based inclusive end level. */
  endLevel: number;
  /** Short label, e.g. "Tutorial". */
  label: string;
  /** Optional Tailwind-friendly accent color (hex or CSS). */
  accent?: string;
}

/**
 * Games opt in to the level system by providing this on their
 * `GameDefinition`. The UI / stats layer discovers it via
 * `definition.levelSystem` and renders accordingly.
 */
export interface LevelSystem<TParams> {
  /** Total number of levels the game exposes. */
  maxLevel: number;
  /**
   * Deterministic: `generateLevel(n)` must always return the same
   * config for the same `n`.
   */
  generateLevel(level: number): LevelConfig<TParams>;
  /** Ordered phase descriptors covering 1..maxLevel without gaps. */
  phases: LevelPhase[];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Compute the stars earned for a completed level given the move count.
 * Players who exceed `thresholds[2]` but finish within `moveLimit`
 * still get a 0-star win — the level is marked "completed" but not
 * starred. That matches the common Angry Birds / color-sort convention.
 */
export function calculateStars(
  moveCount: number,
  thresholds: [number, number, number]
): StarCount {
  if (moveCount <= thresholds[0]) return 3;
  if (moveCount <= thresholds[1]) return 2;
  if (moveCount <= thresholds[2]) return 1;
  return 0;
}

/**
 * Canonical seed for a level. Using a stable format means replays,
 * leaderboards and verification all agree on the same puzzle.
 */
export function levelSeed(gameId: string, level: number): string {
  return `${gameId}-level-${String(level).padStart(4, '0')}`;
}

/**
 * Linear interpolation clamped to the given phase.
 * Returns a float in [from..to] based on where `level` sits within
 * [phaseStart..phaseEnd]. Useful for scaling difficulty smoothly
 * across a phase.
 */
export function lerpInPhase(
  level: number,
  phaseStart: number,
  phaseEnd: number,
  from: number,
  to: number
): number {
  if (phaseEnd <= phaseStart) return from;
  const clamped = Math.max(phaseStart, Math.min(phaseEnd, level));
  const t = (clamped - phaseStart) / (phaseEnd - phaseStart);
  return from + (to - from) * t;
}

/**
 * Expose the SDK PRNG under a level-friendly name so level generators
 * can import just from `./levels`.
 */
export function levelRandom(seed: string): () => number {
  return createSeededRandom(seed);
}

// ============================================================================
// Level progress — per-game persistent data
// ============================================================================

/**
 * Compact record of the player's progress across a game's levels.
 * Stored inside `Stats.levelProgress` so it rides on the existing
 * `game_stats` jsonb column with zero schema changes.
 *
 * `stars` is keyed by stringified level number ("1", "2", …) to keep
 * it JSON-safe.
 */
export interface LevelProgress {
  /** Highest level the player has completed (won) so far. 0 = none. */
  maxLevelReached: number;
  /** Star rating per completed level. Missing keys = not played. */
  stars: Record<string, StarCount>;
  /** Total stars earned across all levels. Cached for leaderboard sort. */
  totalStars: number;
  /** Best (lowest) move count per level, for "personal best" display. */
  bestMoves: Record<string, number>;
}

export function emptyLevelProgress(): LevelProgress {
  return {
    maxLevelReached: 0,
    stars: {},
    totalStars: 0,
    bestMoves: {},
  };
}

/**
 * Pure reducer: apply a level completion result to progress.
 * Only improves — never regresses — on prior attempts.
 */
export function recordLevelResult(
  prev: LevelProgress,
  level: number,
  stars: StarCount,
  moveCount: number
): LevelProgress {
  const key = String(level);
  const prevStars = prev.stars[key] ?? 0;
  const bestStars = Math.max(prevStars, stars) as StarCount;

  const prevBest = prev.bestMoves[key];
  const newBest =
    prevBest == null ? moveCount : Math.min(prevBest, moveCount);

  const nextStars = { ...prev.stars, [key]: bestStars };
  const nextBest = { ...prev.bestMoves, [key]: newBest };

  const totalStars = Object.values(nextStars).reduce<number>(
    (sum, s) => sum + s,
    0
  );

  return {
    maxLevelReached: Math.max(prev.maxLevelReached, level),
    stars: nextStars,
    totalStars,
    bestMoves: nextBest,
  };
}

/**
 * Merge two progress records by always taking the *better* value.
 * Used by sync to reconcile local and remote progress.
 */
export function mergeLevelProgress(
  a: LevelProgress | undefined,
  b: LevelProgress | undefined
): LevelProgress | undefined {
  if (!a) return b;
  if (!b) return a;

  const stars: Record<string, StarCount> = {};
  const keys = new Set([...Object.keys(a.stars), ...Object.keys(b.stars)]);
  for (const k of keys) {
    stars[k] = Math.max(a.stars[k] ?? 0, b.stars[k] ?? 0) as StarCount;
  }

  const bestMoves: Record<string, number> = {};
  const moveKeys = new Set([
    ...Object.keys(a.bestMoves),
    ...Object.keys(b.bestMoves),
  ]);
  for (const k of moveKeys) {
    const av = a.bestMoves[k];
    const bv = b.bestMoves[k];
    if (av == null) bestMoves[k] = bv!;
    else if (bv == null) bestMoves[k] = av;
    else bestMoves[k] = Math.min(av, bv);
  }

  const totalStars = Object.values(stars).reduce<number>(
    (sum, s) => sum + s,
    0
  );

  return {
    maxLevelReached: Math.max(a.maxLevelReached, b.maxLevelReached),
    stars,
    totalStars,
    bestMoves,
  };
}
