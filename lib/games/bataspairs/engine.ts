/**
 * BatasPairs - Game Engine
 *
 * Pure, deterministic game logic for BatasPairs (Memory Card Matching).
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
import { createSeededRandom, pickRandomSeeded } from '../sdk';
import { CARD_ICONS, calculateScore, BATASPAIRS_MODES, type BatasPairsModeId } from './ruleset';

// ============================================================================
// Types
// ============================================================================

export interface BatasPairsParams extends GameParams {
  rows: number;
  cols: number;
  numPairs: number;
}

export type CardStatus = 'hidden' | 'revealed' | 'matched';

export interface Card {
  /** Index into CARD_ICONS array */
  iconIndex: number;
  /** Current card status */
  status: CardStatus;
}

export interface BatasPairsState extends BaseGameState {
  /** Game configuration */
  config: BatasPairsParams;
  /** Grid of cards (row-major order) */
  grid: Card[];
  /** Currently flipped cards (0, 1, or 2 positions) */
  flipped: number[];
  /** Number of pairs found */
  matchesFound: number;
  /** Total number of card flips */
  totalFlips: number;
  /** Number of mismatches (wrong pairs) */
  mismatches: number;
  /** Whether we're in checking state (2 cards revealed, waiting for resolution) */
  isChecking: boolean;
}

export interface BatasPairsAction {
  type: 'flip_card' | 'resolve_check';
  /** Card position in grid (for flip_card) */
  position?: number;
}

// ============================================================================
// Grid Generation
// ============================================================================

/**
 * Generate a shuffled grid of card pairs from a seed.
 */
function generateGrid(seed: string, params: BatasPairsParams): Card[] {
  const random = createSeededRandom(seed);
  const totalCards = params.rows * params.cols;

  // Pick random icons for this game
  const selectedIcons = pickRandomSeeded(
    Array.from({ length: CARD_ICONS.length }, (_, i) => i),
    params.numPairs,
    random
  );

  // Create pairs
  const cardIndices: number[] = [];
  for (const iconIndex of selectedIcons) {
    cardIndices.push(iconIndex, iconIndex);
  }

  // Fill remaining slots if grid is larger than pairs*2 (shouldn't happen with current config)
  while (cardIndices.length < totalCards) {
    cardIndices.push(selectedIcons[0]);
  }

  // Fisher-Yates shuffle
  for (let i = cardIndices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cardIndices[i], cardIndices[j]] = [cardIndices[j], cardIndices[i]];
  }

  return cardIndices.map(iconIndex => ({
    iconIndex,
    status: 'hidden' as CardStatus,
  }));
}

// ============================================================================
// Game Engine Implementation
// ============================================================================

/**
 * Initialize a new BatasPairs game.
 */
function init(seed: string, params: BatasPairsParams): BatasPairsState {
  const grid = generateGrid(seed, params);

  return {
    status: 'playing',
    startedAtMs: Date.now(),
    endedAtMs: null,
    config: params,
    grid,
    flipped: [],
    matchesFound: 0,
    totalFlips: 0,
    mismatches: 0,
    isChecking: false,
  };
}

/**
 * Validate an action.
 */
function validateAction(
  state: BatasPairsState,
  action: BatasPairsAction
): string | null {
  if (state.status !== 'playing') {
    return 'Game is already finished';
  }

  if (action.type === 'flip_card') {
    if (action.position === undefined) {
      return 'Position is required for flip_card action';
    }

    if (action.position < 0 || action.position >= state.grid.length) {
      return `Invalid position: ${action.position}`;
    }

    const card = state.grid[action.position];
    if (card.status !== 'hidden') {
      return 'Card is already revealed or matched';
    }

    if (state.isChecking) {
      return 'Resolve current check first';
    }

    if (state.flipped.length >= 2) {
      return 'Two cards already flipped';
    }

    return null;
  }

  if (action.type === 'resolve_check') {
    if (!state.isChecking) {
      return 'Not in checking state';
    }
    return null;
  }

  return 'Unknown action type';
}

/**
 * Apply an action to the game state.
 */
function applyAction(
  state: BatasPairsState,
  action: BatasPairsAction
): ActionResult<BatasPairsState> {
  const validationError = validateAction(state, action);
  if (validationError) {
    return {
      state,
      events: [],
      invalidReason: validationError,
    };
  }

  if (action.type === 'flip_card') {
    const position = action.position!;
    const newGrid = state.grid.map((card, i) =>
      i === position ? { ...card, status: 'revealed' as CardStatus } : card
    );
    const newFlipped = [...state.flipped, position];
    const newTotalFlips = state.totalFlips + 1;

    const events: GameEvent[] = [{
      type: 'card_flipped',
      payload: { position, iconIndex: state.grid[position].iconIndex },
    }];

    // If this is the second card, check for match
    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      const isMatch = newGrid[first].iconIndex === newGrid[second].iconIndex;

      if (isMatch) {
        // Mark both as matched
        const matchedGrid = newGrid.map((card, i) =>
          i === first || i === second ? { ...card, status: 'matched' as CardStatus } : card
        );
        const newMatchesFound = state.matchesFound + 1;
        const won = newMatchesFound === state.config.numPairs;

        events.push({
          type: 'pair_matched',
          payload: { positions: [first, second], iconIndex: matchedGrid[first].iconIndex },
        });

        if (won) {
          events.push({
            type: 'game_ended',
            payload: { outcome: 'won' },
          });
        }

        return {
          state: {
            ...state,
            grid: matchedGrid,
            flipped: [],
            matchesFound: newMatchesFound,
            totalFlips: newTotalFlips,
            isChecking: false,
            status: won ? 'won' : 'playing',
            endedAtMs: won ? Date.now() : null,
          },
          events,
        };
      } else {
        // No match - enter checking state (UI will show both cards briefly)
        events.push({
          type: 'pair_mismatched',
          payload: { positions: [first, second] },
        });

        return {
          state: {
            ...state,
            grid: newGrid,
            flipped: newFlipped,
            totalFlips: newTotalFlips,
            mismatches: state.mismatches + 1,
            isChecking: true,
          },
          events,
        };
      }
    }

    // First card flipped
    return {
      state: {
        ...state,
        grid: newGrid,
        flipped: newFlipped,
        totalFlips: newTotalFlips,
      },
      events,
    };
  }

  if (action.type === 'resolve_check') {
    // Flip the mismatched cards back
    const [first, second] = state.flipped;
    const newGrid = state.grid.map((card, i) =>
      i === first || i === second ? { ...card, status: 'hidden' as CardStatus } : card
    );

    return {
      state: {
        ...state,
        grid: newGrid,
        flipped: [],
        isChecking: false,
      },
      events: [{
        type: 'cards_hidden',
        payload: { positions: [first, second] },
      }],
    };
  }

  return { state, events: [] };
}

/**
 * Check if the game is in a terminal state.
 */
function isTerminal(state: BatasPairsState): boolean {
  return state.status !== 'playing';
}

/**
 * Get the score for the current state.
 */
function getScore(state: BatasPairsState, durationMs: number): number {
  return calculateScore(state.mismatches, durationMs);
}

/**
 * Get a summary of the completed game.
 */
function getSummary(state: BatasPairsState): GameSummary {
  const durationMs = state.endedAtMs
    ? state.endedAtMs - state.startedAtMs
    : Date.now() - state.startedAtMs;

  return {
    outcome: state.status === 'won' ? 'win' : 'forfeit',
    score: getScore(state, durationMs),
    attemptsUsed: state.totalFlips,
    durationMs,
    details: {
      matchesFound: state.matchesFound,
      mismatches: state.mismatches,
      totalFlips: state.totalFlips,
    },
  };
}

/**
 * Verify a game by replaying actions.
 */
function verify(
  seed: string,
  params: BatasPairsParams,
  actions: BatasPairsAction[]
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

export const batasPairsEngine: GameEngine<BatasPairsState, BatasPairsAction, BatasPairsParams> = {
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
export function getModeParams(modeId: BatasPairsModeId): BatasPairsParams {
  return { ...BATASPAIRS_MODES[modeId] };
}
