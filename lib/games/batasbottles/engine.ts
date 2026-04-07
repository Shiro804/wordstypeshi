/**
 * BatasBottles - Game Engine
 *
 * Pure, deterministic game logic for the bottle-pour puzzle.
 *
 * Core rules:
 *   - Tap a small bottle to select it as the pour source.
 *   - Tap any other bottle to pour the top same-color run from source to it.
 *   - Pours are accepted iff the destination is empty OR its top color
 *     matches the source's top color.
 *   - The big target bottle (id 0) only accepts pours of the target color.
 *   - Tap the selected bottle again to deselect.
 *   - Undo reverts the last pour; restart reverts to the initial state.
 *
 * Win condition: the big target bottle is completely filled with the
 * target color.
 *
 * There is no hard loss. Forfeits are surfaced by the UI layer.
 */

import type {
  GameEngine,
  ActionResult,
  GameEvent,
  GameSummary,
  BaseGameState,
  GameParams,
} from '../sdk/types';
import {
  generatePuzzle,
  TARGET_BOTTLE_ID,
  type BottleSnapshot,
  type BottlesPuzzle,
} from './puzzle-generator';
import {
  BIG_BOTTLE_CAPACITY,
  SMALL_BOTTLE_CAPACITY,
  BATASBOTTLES_MODES,
  type BatasBottlesModeId,
  SCORING,
} from './ruleset';

// ============================================================================
// Types
// ============================================================================

export interface BatasBottlesParams extends GameParams {
  /** Mode id — drives numSmallBottles / numEmptyBottles / numColors. */
  mode: BatasBottlesModeId;
}

export interface Bottle {
  id: number;
  capacity: number;
  /** Layers from bottom to top. */
  layers: string[];
  isTarget: boolean;
}

export interface BatasBottlesState extends BaseGameState {
  /** Index 0 is always the big target bottle. */
  bottles: Bottle[];
  targetColor: string;
  palette: string[];
  /** Bottle id currently selected as pour source, or null. */
  selectedBottleId: number | null;
  /** Total pour moves made. */
  moveCount: number;
  /** Undo stack of prior bottle states (most recent last). */
  history: Bottle[][];
  /** The mode used to init the game — surfaced for persistence. */
  mode: BatasBottlesModeId;
}

export type BatasBottlesAction =
  /** Tap a bottle. If none is selected it becomes the source. If one is
   *  already selected it's the destination — or deselection if the same id. */
  | { type: 'tap_bottle'; bottleId: number }
  /** Explicitly clear the current selection. */
  | { type: 'deselect' }
  /** Undo the most recent pour. */
  | { type: 'undo' }
  /** Restart the current puzzle — resets bottles to initial state. */
  | { type: 'restart' };

// ============================================================================
// Helpers — pure
// ============================================================================

function cloneBottles(bottles: Bottle[]): Bottle[] {
  return bottles.map(b => ({ ...b, layers: [...b.layers] }));
}

function topColorOf(bottle: Bottle): string | null {
  return bottle.layers.length > 0 ? bottle.layers[bottle.layers.length - 1] : null;
}

function spaceLeftOf(bottle: Bottle): number {
  return bottle.capacity - bottle.layers.length;
}

/**
 * Size of the consecutive same-color run on top of the bottle.
 * Returns 0 for empty bottles.
 */
function topRunSizeOf(bottle: Bottle): number {
  if (bottle.layers.length === 0) return 0;
  const top = bottle.layers[bottle.layers.length - 1];
  let n = 0;
  for (let i = bottle.layers.length - 1; i >= 0 && bottle.layers[i] === top; i--) {
    n++;
  }
  return n;
}

/**
 * Decide whether a pour from `from` to `to` is legal.
 *
 * - Bottles must be different
 * - Source must not be empty
 * - Destination must have at least one free layer
 * - Destination must be empty OR its top color must match the source's top
 * - The big target bottle only accepts pours of the target color
 */
export function canPour(
  from: Bottle,
  to: Bottle,
  targetColor: string
): boolean {
  if (from.id === to.id) return false;
  if (from.layers.length === 0) return false;
  if (spaceLeftOf(to) === 0) return false;

  const srcTop = topColorOf(from);
  if (srcTop === null) return false;

  if (to.isTarget && srcTop !== targetColor) return false;

  if (to.layers.length > 0 && topColorOf(to) !== srcTop) return false;

  return true;
}

/**
 * How many layers would actually move in a legal pour.
 * Caller must have checked `canPour` first.
 */
export function pourAmount(from: Bottle, to: Bottle): number {
  return Math.min(topRunSizeOf(from), spaceLeftOf(to));
}

/**
 * Apply a pour on cloned bottles and return the new array.
 * This function does NOT validate legality — callers must check `canPour`.
 */
function performPour(
  bottles: Bottle[],
  fromId: number,
  toId: number
): { bottles: Bottle[]; movedLayers: number; color: string } {
  const next = cloneBottles(bottles);
  const from = next[fromId];
  const to = next[toId];
  const amount = pourAmount(from, to);
  const color = from.layers[from.layers.length - 1];

  for (let i = 0; i < amount; i++) {
    to.layers.push(from.layers.pop()!);
  }

  return { bottles: next, movedLayers: amount, color };
}

function isWonState(bottles: Bottle[], targetColor: string): boolean {
  const big = bottles[TARGET_BOTTLE_ID];
  if (!big || !big.isTarget) return false;
  if (big.layers.length !== big.capacity) return false;
  return big.layers.every(c => c === targetColor);
}

function puzzleToBottles(puzzle: BottlesPuzzle): Bottle[] {
  return puzzle.bottles.map((b: BottleSnapshot) => ({
    id: b.id,
    capacity: b.capacity,
    layers: [...b.layers],
    isTarget: b.isTarget,
  }));
}

function modeParams(mode: BatasBottlesModeId): {
  numSmallBottles: number;
  numEmptyBottles: number;
  numColors: number;
} {
  const m = BATASBOTTLES_MODES[mode];
  return {
    numSmallBottles: m.numSmallBottles,
    numEmptyBottles: m.numEmptyBottles,
    numColors: m.numColors,
  };
}

// ============================================================================
// Scoring
// ============================================================================

function calculateScore(moveCount: number, durationMs: number): number {
  const moveDeduction = moveCount * SCORING.movePenalty;
  const baseScore = Math.max(0, SCORING.baseScore - moveDeduction);
  const timeFactor = Math.max(0, 1 - (durationMs / SCORING.maxTimeBonusMs));
  const timeBonus = Math.floor(timeFactor * SCORING.maxTimeBonus);
  return baseScore + timeBonus;
}

// ============================================================================
// Engine implementation
// ============================================================================

function init(seed: string, params: BatasBottlesParams): BatasBottlesState {
  const mode = params.mode;
  const puzzle = generatePuzzle(seed, modeParams(mode));

  return {
    status: 'playing',
    startedAtMs: Date.now(),
    endedAtMs: null,
    bottles: puzzleToBottles(puzzle),
    targetColor: puzzle.targetColor,
    palette: puzzle.palette,
    selectedBottleId: null,
    moveCount: 0,
    history: [],
    mode,
  };
}

function validateAction(
  state: BatasBottlesState,
  action: BatasBottlesAction
): string | null {
  if (state.status !== 'playing') return 'Game is already finished';

  switch (action.type) {
    case 'tap_bottle': {
      const { bottleId } = action;
      const bottle = state.bottles.find(b => b.id === bottleId);
      if (!bottle) return 'Bottle does not exist';
      // If nothing is selected, the tapped bottle becomes the source —
      // but only non-empty, non-target bottles can be selected as source.
      if (state.selectedBottleId === null) {
        if (bottle.isTarget) return 'Cannot pour from the target bottle';
        if (bottle.layers.length === 0) return 'Cannot select an empty bottle';
      }
      return null;
    }
    case 'deselect':
      return null;
    case 'undo':
      if (state.history.length === 0) return 'Nothing to undo';
      return null;
    case 'restart':
      return null;
    default:
      return 'Unknown action';
  }
}

function applyAction(
  state: BatasBottlesState,
  action: BatasBottlesAction
): ActionResult<BatasBottlesState> {
  const invalid = validateAction(state, action);
  if (invalid) return { state, events: [], invalidReason: invalid };

  switch (action.type) {
    case 'tap_bottle': {
      const { bottleId } = action;

      // First tap → select as source
      if (state.selectedBottleId === null) {
        return {
          state: { ...state, selectedBottleId: bottleId },
          events: [
            { type: 'bottle_selected', payload: { bottleId } },
          ],
        };
      }

      // Tap same bottle → deselect
      if (state.selectedBottleId === bottleId) {
        return {
          state: { ...state, selectedBottleId: null },
          events: [
            { type: 'bottle_deselected', payload: { bottleId } },
          ],
        };
      }

      // Otherwise this is the destination of a pour.
      const fromId = state.selectedBottleId;
      const toId = bottleId;
      const from = state.bottles.find(b => b.id === fromId)!;
      const to = state.bottles.find(b => b.id === toId)!;

      if (!canPour(from, to, state.targetColor)) {
        // Illegal pour — keep the source selected so the player can retry.
        return {
          state,
          events: [
            { type: 'pour_rejected', payload: { fromId, toId } },
          ],
          invalidReason: 'Illegal pour',
        };
      }

      const fromIndex = state.bottles.findIndex(b => b.id === fromId);
      const toIndex = state.bottles.findIndex(b => b.id === toId);
      const snapshot = cloneBottles(state.bottles);
      const { bottles: newBottles, movedLayers, color } = performPour(
        state.bottles,
        fromIndex,
        toIndex
      );

      const won = isWonState(newBottles, state.targetColor);

      const events: GameEvent[] = [
        {
          type: 'poured',
          payload: { fromId, toId, layers: movedLayers, color },
        },
      ];
      if (won) {
        events.push({ type: 'game_ended', payload: { outcome: 'won' } });
      }

      return {
        state: {
          ...state,
          bottles: newBottles,
          selectedBottleId: null,
          moveCount: state.moveCount + 1,
          history: [...state.history, snapshot],
          status: won ? 'won' : 'playing',
          endedAtMs: won ? Date.now() : null,
        },
        events,
      };
    }

    case 'deselect': {
      if (state.selectedBottleId === null) {
        return { state, events: [] };
      }
      return {
        state: { ...state, selectedBottleId: null },
        events: [{ type: 'bottle_deselected', payload: { bottleId: state.selectedBottleId } }],
      };
    }

    case 'undo': {
      const prior = state.history[state.history.length - 1];
      const newHistory = state.history.slice(0, -1);
      return {
        state: {
          ...state,
          bottles: cloneBottles(prior),
          history: newHistory,
          selectedBottleId: null,
          // moveCount stays the same — undo is a free action but we also
          // never decrement below the count of productive pours performed.
        },
        events: [{ type: 'undone', payload: {} }],
      };
    }

    case 'restart': {
      // Replay to the very first snapshot in the history if it exists,
      // otherwise the state is already the initial one.
      if (state.history.length === 0) {
        return {
          state: { ...state, selectedBottleId: null },
          events: [{ type: 'restarted', payload: {} }],
        };
      }
      const initialBottles = cloneBottles(state.history[0]);
      return {
        state: {
          ...state,
          bottles: initialBottles,
          history: [],
          selectedBottleId: null,
          moveCount: 0,
        },
        events: [{ type: 'restarted', payload: {} }],
      };
    }
  }
}

function isTerminal(state: BatasBottlesState): boolean {
  return state.status !== 'playing';
}

function getScore(state: BatasBottlesState, durationMs: number): number {
  if (state.status !== 'won') return 0;
  return calculateScore(state.moveCount, durationMs);
}

function getSummary(state: BatasBottlesState): GameSummary {
  const durationMs = state.endedAtMs
    ? state.endedAtMs - state.startedAtMs
    : Date.now() - state.startedAtMs;

  return {
    outcome: state.status === 'won' ? 'win' : 'forfeit',
    score: getScore(state, durationMs),
    attemptsUsed: state.moveCount,
    durationMs,
    details: {
      moveCount: state.moveCount,
      mode: state.mode,
      targetColor: state.targetColor,
      smallBottleCount: state.bottles.length - 1,
    },
  };
}

function verify(
  seed: string,
  params: BatasBottlesParams,
  actions: BatasBottlesAction[]
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
// Exports
// ============================================================================

export const batasBottlesEngine: GameEngine<
  BatasBottlesState,
  BatasBottlesAction,
  BatasBottlesParams
> = {
  init,
  applyAction,
  isTerminal,
  getScore,
  getSummary,
  verify,
};

// Also export helpers used by the UI / tests.
export {
  TARGET_BOTTLE_ID,
  BIG_BOTTLE_CAPACITY,
  SMALL_BOTTLE_CAPACITY,
  topColorOf,
  spaceLeftOf,
  topRunSizeOf,
  isWonState,
  calculateScore,
};
