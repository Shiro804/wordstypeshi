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
  let paths: Map<number, { row: number; col: number }[]>;
  if (state.paths instanceof Map) {
    paths = state.paths;
  } else {
    const raw = state.paths as unknown;
    if (raw && typeof raw === 'object' && '__mapEntries' in raw && Array.isArray((raw as { __mapEntries: unknown }).__mapEntries)) {
      paths = new Map((raw as { __mapEntries: [number, { row: number; col: number }[]][] }).__mapEntries);
    } else if (raw && typeof raw === 'object') {
      const entries = Object.entries(raw as Record<string, { row: number; col: number }[]>);
      paths = new Map(entries.filter(([, v]) => Array.isArray(v)).map(([k, v]) => [Number(k), v]));
    } else {
      paths = new Map();
    }
  }
  for (const [, path] of paths) {
    for (const cell of path) {
      completedPathCells.add(`${cell.row},${cell.col}`);
    }
  }

  let completedFlows: Set<number>;
  if (state.completedFlows instanceof Set) {
    completedFlows = state.completedFlows;
  } else {
    const raw = state.completedFlows as unknown;
    if (raw && typeof raw === 'object' && '__setValues' in raw && Array.isArray((raw as { __setValues: unknown }).__setValues)) {
      completedFlows = new Set((raw as { __setValues: number[] }).__setValues);
    } else if (Array.isArray(raw)) {
      completedFlows = new Set(raw);
    } else {
      completedFlows = new Set();
    }
  }

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
