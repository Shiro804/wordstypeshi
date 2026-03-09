/**
 * Mastermind - Game Engine
 * 
 * Pure, deterministic game logic for Mastermind.
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
import { MASTERMIND_MODES, calculateScore, type MastermindModeId } from './ruleset';

// ============================================================================
// Types
// ============================================================================

export interface MastermindParams extends GameParams {
  codeLength: number;
  numColors: number;
  maxAttempts: number;
  allowDuplicates: boolean;
}

export interface Feedback {
  /** Correct color in correct position */
  black: number;
  /** Correct color in wrong position */
  white: number;
}

export interface Attempt {
  guess: number[];
  feedback: Feedback;
}

export interface MastermindState extends BaseGameState {
  /** Game configuration */
  config: MastermindParams;
  /** The secret code (array of color indices) */
  secret: number[];
  /** History of attempts */
  attempts: Attempt[];
  /** Current attempt number (0-indexed) */
  currentAttempt: number;
}

export interface MastermindAction {
  type: 'submit_guess';
  guess: number[];
}

// ============================================================================
// Core Algorithm: Feedback Computation
// ============================================================================

/**
 * Compute Mastermind feedback for a guess against the secret.
 * 
 * Black pegs: correct color in correct position
 * White pegs: correct color in wrong position
 * 
 * Standard algorithm:
 * 1. First pass: count exact matches (black)
 * 2. Second pass: count color matches in remaining positions (white)
 */
export function computeFeedback(guess: number[], secret: number[]): Feedback {
  if (guess.length !== secret.length) {
    throw new Error('Guess and secret must have same length');
  }
  
  let black = 0;
  const secretCounts = new Map<number, number>();
  const guessCounts = new Map<number, number>();
  
  // Pass 1: Count exact matches (black pegs)
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) {
      black++;
    } else {
      // Track unmatched colors for white peg calculation
      secretCounts.set(secret[i], (secretCounts.get(secret[i]) ?? 0) + 1);
      guessCounts.set(guess[i], (guessCounts.get(guess[i]) ?? 0) + 1);
    }
  }
  
  // Pass 2: Count color matches in wrong positions (white pegs)
  let white = 0;
  for (const [color, count] of guessCounts) {
    white += Math.min(count, secretCounts.get(color) ?? 0);
  }
  
  return { black, white };
}

// ============================================================================
// Game Engine Implementation
// ============================================================================

/**
 * Generate a secret code from a seed.
 */
function generateSecret(seed: string, params: MastermindParams): number[] {
  const random = createSeededRandom(seed);
  const secret: number[] = [];
  
  if (params.allowDuplicates) {
    // With duplicates: simple random selection
    for (let i = 0; i < params.codeLength; i++) {
      secret.push(Math.floor(random() * params.numColors));
    }
  } else {
    // Without duplicates: Fisher-Yates shuffle and take first N
    const colors = Array.from({ length: params.numColors }, (_, i) => i);
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    for (let i = 0; i < params.codeLength; i++) {
      secret.push(colors[i]);
    }
  }
  
  return secret;
}

/**
 * Initialize a new Mastermind game.
 */
function init(seed: string, params: MastermindParams): MastermindState {
  const secret = generateSecret(seed, params);
  
  return {
    status: 'playing',
    startedAtMs: Date.now(),
    endedAtMs: null,
    config: params,
    secret,
    attempts: [],
    currentAttempt: 0,
  };
}

/**
 * Validate a guess action.
 */
function validateAction(
  state: MastermindState, 
  action: MastermindAction
): string | null {
  if (action.type !== 'submit_guess') {
    return 'Unknown action type';
  }
  
  if (state.status !== 'playing') {
    return 'Game is already finished';
  }
  
  if (action.guess.length !== state.config.codeLength) {
    return `Guess must have exactly ${state.config.codeLength} colors`;
  }
  
  for (const color of action.guess) {
    if (!Number.isInteger(color) || color < 0 || color >= state.config.numColors) {
      return `Invalid color: ${color}. Must be 0-${state.config.numColors - 1}`;
    }
  }
  
  return null;
}

/**
 * Apply an action to the game state.
 */
function applyAction(
  state: MastermindState, 
  action: MastermindAction
): ActionResult<MastermindState> {
  const validationError = validateAction(state, action);
  if (validationError) {
    return {
      state,
      events: [],
      invalidReason: validationError,
    };
  }
  
  const feedback = computeFeedback(action.guess, state.secret);
  const attempt: Attempt = { guess: action.guess, feedback };
  
  const newAttempts = [...state.attempts, attempt];
  const newAttemptCount = state.currentAttempt + 1;
  
  // Check win/lose conditions
  const won = feedback.black === state.config.codeLength;
  const lost = !won && newAttemptCount >= state.config.maxAttempts;
  
  const newStatus = won ? 'won' : lost ? 'lost' : 'playing';
  const endedAtMs = newStatus !== 'playing' ? Date.now() : null;
  
  const events: GameEvent[] = [
    {
      type: 'guess_evaluated',
      payload: {
        guess: action.guess,
        feedback,
        attemptNumber: newAttemptCount,
      },
    },
  ];
  
  if (newStatus !== 'playing') {
    events.push({
      type: 'game_ended',
      payload: {
        outcome: newStatus,
        secret: state.secret,
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
function isTerminal(state: MastermindState): boolean {
  return state.status !== 'playing';
}

/**
 * Get the score for the current state.
 */
function getScore(state: MastermindState, durationMs: number): number {
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
function getSummary(state: MastermindState): GameSummary {
  const durationMs = state.endedAtMs 
    ? state.endedAtMs - state.startedAtMs 
    : Date.now() - state.startedAtMs;
  
  return {
    outcome: state.status === 'won' ? 'win' : state.status === 'lost' ? 'lose' : 'forfeit',
    score: getScore(state, durationMs),
    attemptsUsed: state.currentAttempt,
    durationMs,
    details: {
      secret: state.secret,
      attempts: state.attempts,
    },
  };
}

/**
 * Verify a game by replaying actions.
 */
function verify(
  seed: string, 
  params: MastermindParams, 
  actions: MastermindAction[]
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

export const mastermindEngine: GameEngine<MastermindState, MastermindAction, MastermindParams> = {
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
export function getModeParams(modeId: MastermindModeId): MastermindParams {
  return { ...MASTERMIND_MODES[modeId] };
}
