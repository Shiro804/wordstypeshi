/**
 * BatasFlow - UI Adapter
 *
 * Converts game state to a render model for the UI.
 */

import type { UIAdapter, RenderModel, InputConfig } from '../sdk/types';
import type { BatasFlowState } from './engine';
import type { Dot } from './puzzle-generator';
import { FLOW_COLORS } from './ruleset';

// ============================================================================
// Render Model Types
// ============================================================================

export interface FlowCellRenderData {
  /** Color hex string or null for empty */
  color: string | null;
  /** Whether this cell is a fixed dot (endpoint) */
  isDot: boolean;
  /** Whether this cell is part of a completed path */
  isPath: boolean;
  /** Whether this cell is part of the currently active path */
  isCurrentPath: boolean;
}

export interface BatasFlowRenderModel extends RenderModel {
  data: {
    /** 2D grid with color info per cell */
    grid: FlowCellRenderData[][];
    /** Number of completed flows */
    completedFlows: number;
    /** Total flows to connect */
    totalFlows: number;
    /** Total extend moves made */
    moveCount: number;
    /** Whether the player is currently drawing a path */
    currentlyDrawing: boolean;
    /** Grid size (N×N) */
    gridSize: number;
  };
}

// ============================================================================
// Helpers
// ============================================================================

function getDotSet(dots: Dot[]): Set<string> {
  const set = new Set<string>();
  for (const dot of dots) {
    set.add(`${dot.row},${dot.col}`);
  }
  return set;
}

function getColorForPairId(dots: Dot[], pairId: number): string {
  const dot = dots.find(d => d.pairId === pairId);
  return dot?.color ?? FLOW_COLORS[pairId % FLOW_COLORS.length];
}

// ============================================================================
// UI Adapter Implementation
// ============================================================================

function toRenderModel(state: BatasFlowState): BatasFlowRenderModel {
  const isTerminalState = state.status !== 'playing';
  const dotSet = getDotSet(state.dots);

  // Build sets of current path cells for quick lookup
  const currentPathCells = new Set<string>();
  if (state.currentPath) {
    for (const cell of state.currentPath.cells) {
      currentPathCells.add(`${cell.row},${cell.col}`);
    }
  }

  // Build set of completed path cells
  const completedPathCells = new Set<string>();
  const paths = state.paths instanceof Map
    ? state.paths
    : new Map(Object.entries(state.paths as unknown as Record<string, { row: number; col: number }[]>).map(
        ([k, v]) => [Number(k), v]
      ));
  for (const [, path] of paths) {
    for (const cell of path) {
      completedPathCells.add(`${cell.row},${cell.col}`);
    }
  }

  const completedFlows = state.completedFlows instanceof Set
    ? state.completedFlows
    : new Set(state.completedFlows as unknown as number[]);

  // Build 2D render grid
  const grid: FlowCellRenderData[][] = [];
  for (let r = 0; r < state.gridSize; r++) {
    const row: FlowCellRenderData[] = [];
    for (let c = 0; c < state.gridSize; c++) {
      const key = `${r},${c}`;
      const cellValue = state.grid[r][c];
      const isDot = dotSet.has(key);
      const isCurrentPathCell = currentPathCells.has(key);
      const isCompletedPathCell = completedPathCells.has(key);

      let color: string | null = null;
      if (cellValue !== null) {
        color = getColorForPairId(state.dots, cellValue);
      }

      row.push({
        color,
        isDot,
        isPath: isCompletedPathCell || isDot,
        isCurrentPath: isCurrentPathCell,
      });
    }
    grid.push(row);
  }

  return {
    status: state.status,
    isTerminal: isTerminalState,
    data: {
      grid,
      completedFlows: completedFlows.size,
      totalFlows: state.flowsTotal,
      moveCount: state.moveCount,
      currentlyDrawing: state.currentPath !== null,
      gridSize: state.gridSize,
    },
  };
}

function getInputConfig(): InputConfig {
  return {
    type: 'custom',
  };
}

// ============================================================================
// Export Adapter
// ============================================================================

export const batasFlowUIAdapter: UIAdapter<BatasFlowState> = {
  toRenderModel,
  getInputConfig,
};
