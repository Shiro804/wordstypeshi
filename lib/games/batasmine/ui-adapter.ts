/**
 * BatasMine - UI Adapter
 *
 * Converts game state to a render model for the UI.
 */

import type { UIAdapter, RenderModel, InputConfig } from '../sdk/types';
import type { BatasMineState, Cell } from './engine';
import type { CellState } from './ruleset';

// ============================================================================
// Render Model Types
// ============================================================================

export interface CellRenderData {
  /** Cell display state */
  state: CellState;
  /** Number of adjacent mines (only meaningful when revealed) */
  adjacentMines: number;
  /** Position in grid */
  position: number;
}

export interface BatasMineRenderModel extends RenderModel {
  data: {
    /** Grid dimensions */
    rows: number;
    cols: number;
    /** Total mine count */
    totalMines: number;
    /** Cells with render data */
    cells: CellRenderData[];
    /** Cells revealed so far */
    cellsRevealed: number;
    /** Total safe cells to reveal */
    totalSafe: number;
    /** Flags placed */
    flagsPlaced: number;
    /** Remaining mines (mines - flags) */
    remainingMines: number;
  };
}

// ============================================================================
// UI Adapter Implementation
// ============================================================================

function cellToRenderData(cell: Cell, position: number): CellRenderData {
  return {
    state: cell.state,
    adjacentMines: cell.adjacentMines,
    position,
  };
}

function toRenderModel(state: BatasMineState): BatasMineRenderModel {
  const isTerminalState = state.status !== 'playing';

  return {
    status: state.status,
    isTerminal: isTerminalState,
    data: {
      rows: state.config.rows,
      cols: state.config.cols,
      totalMines: state.config.mines,
      cells: state.grid.map((cell, i) => cellToRenderData(cell, i)),
      cellsRevealed: state.cellsRevealed,
      totalSafe: state.totalSafe,
      flagsPlaced: state.flagsPlaced,
      remainingMines: state.config.mines - state.flagsPlaced,
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

export const batasMineUIAdapter: UIAdapter<BatasMineState> = {
  toRenderModel,
  getInputConfig,
};
