/**
 * BatasColors - UI Adapter
 * 
 * Converts game state to a render model for the UI.
 */

import type { UIAdapter, RenderModel, InputConfig } from '../sdk/types';
import type { BatasColorsState } from './engine';
import { rgbToHex, type RGB } from './ruleset';

// ============================================================================
// Render Model Types
// ============================================================================

export interface BatasColorsRenderModel extends RenderModel {
  data: {
    /** Number of segments */
    numSegments: number;
    /** Max attempts allowed */
    maxAttempts: number;
    /** Current attempt number (1-indexed for display) */
    currentAttempt: number;
    /** Remaining attempts */
    remainingAttempts: number;
    /** Target color (hex) */
    targetColor: string;
    /** Target color (RGB) */
    targetColorRgb: RGB;
    /** Last mixed color (hex), null before the first mix */
    mixedColor: string | null;
    /** Color palette (hex strings) */
    palette: string[];
    /** Segment percentages */
    segmentPercentages: number[];
    /** Solution (only available when game is terminal) */
    solution: number[] | null;
    /** History of attempts */
    attempts: Array<{
      segmentColors: number[];
      mixedColor: string;
      mixedColorRgb: RGB;
      accuracy: number;
    }>;
    /** Best accuracy so far */
    bestAccuracy: number;
  };
}

// ============================================================================
// UI Adapter Implementation
// ============================================================================

/**
 * Convert BatasColors state to render model.
 */
function toRenderModel(state: BatasColorsState): BatasColorsRenderModel {
  const isTerminal = state.status !== 'playing';
  
  const attempts = state.attempts.map(a => ({
    segmentColors: a.segmentColors,
    mixedColor: rgbToHex(a.mixedColor),
    mixedColorRgb: a.mixedColor,
    accuracy: a.accuracy,
  }));
  
  const bestAccuracy = attempts.length > 0 
    ? Math.max(...attempts.map(a => a.accuracy))
    : 0;
  
  return {
    status: state.status,
    isTerminal,
    data: {
      numSegments: state.config.numSegments,
      maxAttempts: state.config.maxAttempts,
      currentAttempt: state.currentAttempt + 1,
      remainingAttempts: state.config.maxAttempts - state.currentAttempt,
      targetColor: rgbToHex(state.targetColor),
      targetColorRgb: state.targetColor,
      mixedColor: attempts.length > 0 ? attempts[attempts.length - 1].mixedColor : null,
      palette: state.palette.map(rgbToHex),
      segmentPercentages: state.segmentPercentages,
      // Only reveal solution when game is over
      solution: isTerminal ? state.solution : null,
      attempts,
      bestAccuracy,
    },
  };
}

/**
 * Get input configuration for BatasColors.
 */
function getInputConfig(): InputConfig {
  return {
    type: 'color-picker',
    numOptions: 6, // Default, will be overridden by state
  };
}

// ============================================================================
// Export Adapter
// ============================================================================

export const batascolorsUIAdapter: UIAdapter<BatasColorsState> = {
  toRenderModel,
  getInputConfig,
};
