/**
 * BatasPairs - UI Adapter
 *
 * Converts game state to a render model for the UI.
 */

import type { UIAdapter, RenderModel, InputConfig } from '../sdk/types';
import type { BatasPairsState, CardStatus } from './engine';
import { CARD_ICONS } from './ruleset';

// ============================================================================
// Render Model Types
// ============================================================================

export interface CardRenderData {
  /** Card icon (emoji) */
  icon: string;
  /** Card status */
  status: CardStatus;
  /** Position in grid */
  position: number;
}

export interface BatasPairsRenderModel extends RenderModel {
  data: {
    /** Grid dimensions */
    rows: number;
    cols: number;
    /** Number of pairs to find */
    numPairs: number;
    /** Cards with render data */
    cards: CardRenderData[];
    /** Number of pairs found */
    matchesFound: number;
    /** Total card flips */
    totalFlips: number;
    /** Number of mismatches */
    mismatches: number;
    /** Whether in checking state (2 mismatched cards shown) */
    isChecking: boolean;
    /** Remaining pairs to find */
    remainingPairs: number;
  };
}

// ============================================================================
// UI Adapter Implementation
// ============================================================================

/**
 * Convert BatasPairs state to render model.
 */
function toRenderModel(state: BatasPairsState): BatasPairsRenderModel {
  const isTerminalState = state.status !== 'playing';

  return {
    status: state.status,
    isTerminal: isTerminalState,
    data: {
      rows: state.config.rows,
      cols: state.config.cols,
      numPairs: state.config.numPairs,
      cards: state.grid.map((card, i) => ({
        icon: CARD_ICONS[card.iconIndex],
        status: card.status,
        position: i,
      })),
      matchesFound: state.matchesFound,
      totalFlips: state.totalFlips,
      mismatches: state.mismatches,
      isChecking: state.isChecking,
      remainingPairs: state.config.numPairs - state.matchesFound,
    },
  };
}

/**
 * Get input configuration for BatasPairs.
 */
function getInputConfig(): InputConfig {
  return {
    type: 'custom',
  };
}

// ============================================================================
// Export Adapter
// ============================================================================

export const batasPairsUIAdapter: UIAdapter<BatasPairsState> = {
  toRenderModel,
  getInputConfig,
};
