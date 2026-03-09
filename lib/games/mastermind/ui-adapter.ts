/**
 * Mastermind - UI Adapter
 * 
 * Converts game state to a render model for the UI.
 */

import type { UIAdapter, RenderModel, InputConfig } from '../sdk/types';
import type { MastermindState, Feedback } from './engine';
import { MASTERMIND_COLORS } from './ruleset';

// ============================================================================
// Render Model Types
// ============================================================================

export interface MastermindRenderModel extends RenderModel {
  data: {
    /** Number of colors available */
    numColors: number;
    /** Code length */
    codeLength: number;
    /** Max attempts allowed */
    maxAttempts: number;
    /** Current attempt number (1-indexed for display) */
    currentAttempt: number;
    /** History of attempts with feedback */
    attempts: Array<{
      guess: number[];
      feedback: Feedback;
    }>;
    /** The secret (only available when game is terminal) */
    secret: number[] | null;
    /** Color palette for rendering */
    colors: readonly string[];
    /** Remaining attempts */
    remainingAttempts: number;
  };
}

// ============================================================================
// UI Adapter Implementation
// ============================================================================

/**
 * Convert Mastermind state to render model.
 */
function toRenderModel(state: MastermindState): MastermindRenderModel {
  const isTerminal = state.status !== 'playing';
  
  return {
    status: state.status,
    isTerminal,
    data: {
      numColors: state.config.numColors,
      codeLength: state.config.codeLength,
      maxAttempts: state.config.maxAttempts,
      currentAttempt: state.currentAttempt + 1,
      attempts: state.attempts.map(a => ({
        guess: a.guess,
        feedback: a.feedback,
      })),
      // Only reveal secret when game is over
      secret: isTerminal ? state.secret : null,
      colors: MASTERMIND_COLORS.slice(0, state.config.numColors),
      remainingAttempts: state.config.maxAttempts - state.currentAttempt,
    },
  };
}

/**
 * Get input configuration for Mastermind.
 */
function getInputConfig(): InputConfig {
  return {
    type: 'color-picker',
    numOptions: 6, // Default, will be overridden by state
    optionColors: [...MASTERMIND_COLORS],
  };
}

// ============================================================================
// Export Adapter
// ============================================================================

export const mastermindUIAdapter: UIAdapter<MastermindState> = {
  toRenderModel,
  getInputConfig,
};
