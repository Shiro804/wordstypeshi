/**
 * BatasBottles - UI Adapter
 *
 * Converts engine state into a render model the React component can
 * consume without touching any engine internals.
 */

import type { UIAdapter, RenderModel, InputConfig } from '../sdk/types';
import type { BatasBottlesState, Bottle } from './engine';
import { canPour, topColorOf, topRunSizeOf } from './engine';
import { TARGET_BOTTLE_ID } from './puzzle-generator';

// ============================================================================
// Render model types
// ============================================================================

export interface BottleRenderData {
  id: number;
  capacity: number;
  /** Layers from bottom to top. */
  layers: string[];
  isTarget: boolean;
  /** True if this bottle is currently the pour-source selection. */
  isSelected: boolean;
  /** True if tapping would be a legal pour from the currently selected source. */
  isLegalDestination: boolean;
  /** Top color of the bottle, or null if empty. */
  topColor: string | null;
  /** Size of the top same-color run. Useful for UI hints / animation. */
  topRunSize: number;
  /** How many free layers the bottle still has. */
  spaceLeft: number;
}

export interface BatasBottlesRenderModel extends RenderModel {
  data: {
    /** Full list of bottles. Index 0 is the big target bottle. */
    bottles: BottleRenderData[];
    /** Convenience alias for the big bottle render data. */
    target: BottleRenderData;
    /** The color the player is racing to fill the big bottle with. */
    targetColor: string;
    /** All colors used in this puzzle, in a stable order. */
    palette: string[];
    /** Bottle id currently selected as pour source, or null. */
    selectedBottleId: number | null;
    /** Total pour moves the player has made. */
    moveCount: number;
    /** How many layers the big bottle already holds. 0…capacity. */
    filledLayers: number;
    /** capacity of the big bottle (= totalLayersNeeded). */
    totalLayers: number;
    /** Whether the undo stack has anything to unwind. */
    canUndo: boolean;
  };
}

// ============================================================================
// Conversion
// ============================================================================

function renderBottle(
  bottle: Bottle,
  selectedBottleId: number | null,
  selectedBottle: Bottle | null,
  targetColor: string
): BottleRenderData {
  const isSelected = bottle.id === selectedBottleId;
  const isLegalDestination =
    selectedBottle !== null && !isSelected
      ? canPour(selectedBottle, bottle, targetColor)
      : false;

  return {
    id: bottle.id,
    capacity: bottle.capacity,
    layers: [...bottle.layers],
    isTarget: bottle.isTarget,
    isSelected,
    isLegalDestination,
    topColor: topColorOf(bottle),
    topRunSize: topRunSizeOf(bottle),
    spaceLeft: bottle.capacity - bottle.layers.length,
  };
}

function toRenderModel(state: BatasBottlesState): BatasBottlesRenderModel {
  const isTerminal = state.status !== 'playing';

  const selectedBottle =
    state.selectedBottleId !== null
      ? state.bottles.find(b => b.id === state.selectedBottleId) ?? null
      : null;

  const renderedBottles: BottleRenderData[] = state.bottles.map(b =>
    renderBottle(b, state.selectedBottleId, selectedBottle, state.targetColor)
  );

  const target = renderedBottles[TARGET_BOTTLE_ID];

  return {
    status: state.status,
    isTerminal,
    data: {
      bottles: renderedBottles,
      target,
      targetColor: state.targetColor,
      palette: state.palette,
      selectedBottleId: state.selectedBottleId,
      moveCount: state.moveCount,
      filledLayers: target.layers.length,
      totalLayers: target.capacity,
      canUndo: state.history.length > 0,
    },
  };
}

function getInputConfig(): InputConfig {
  return { type: 'custom' };
}

// ============================================================================
// Export
// ============================================================================

export const batasBottlesUIAdapter: UIAdapter<BatasBottlesState> = {
  toRenderModel,
  getInputConfig,
};
