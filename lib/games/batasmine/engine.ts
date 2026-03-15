/**
 * BatasMine - Game Engine
 *
 * Pure, deterministic game logic for BatasMine (Minesweeper).
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
import { calculateScore, BATASMINE_MODES, type BatasMineModeId, type CellState } from './ruleset';

// ============================================================================
// Types
// ============================================================================

export interface BatasMineParams extends GameParams {
  rows: number;
  cols: number;
  mines: number;
}

export interface Cell {
  /** Whether this cell contains a mine */
  hasMine: boolean;
  /** Number of adjacent mines (0-8) */
  adjacentMines: number;
  /** Current display state */
  state: CellState;
}

export interface BatasMineState extends BaseGameState {
  /** Game configuration */
  config: BatasMineParams;
  /** Grid of cells (row-major order) */
  grid: Cell[];
  /** Number of cells revealed (non-mine) */
  cellsRevealed: number;
  /** Total safe cells (rows*cols - mines) */
  totalSafe: number;
  /** Number of flags placed */
  flagsPlaced: number;
  /** Whether mines have been placed (deferred until first reveal) */
  minesPlaced: boolean;
  /** The seed used for generation */
  seed: string;
}

export interface BatasMineAction {
  type: 'reveal' | 'toggle_flag';
  /** Cell position in grid (row * cols + col) */
  position: number;
}

// ============================================================================
// Helpers
// ============================================================================

function getNeighbors(pos: number, rows: number, cols: number): number[] {
  const row = Math.floor(pos / cols);
  const col = pos % cols;
  const neighbors: number[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbors.push(nr * cols + nc);
      }
    }
  }
  return neighbors;
}

/**
 * Place mines on the grid, avoiding the first-click position and its neighbors.
 */
function placeMines(
  seed: string,
  rows: number,
  cols: number,
  numMines: number,
  safePos: number
): Cell[] {
  const total = rows * cols;
  const random = createSeededRandom(seed);

  // Positions to exclude (first click + neighbors)
  const excluded = new Set<number>([safePos, ...getNeighbors(safePos, rows, cols)]);

  // Collect candidate positions
  const candidates: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!excluded.has(i)) candidates.push(i);
  }

  // Fisher-Yates to pick mine positions
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const minePositions = new Set(candidates.slice(0, numMines));

  // Build grid
  const grid: Cell[] = Array.from({ length: total }, (_, i) => ({
    hasMine: minePositions.has(i),
    adjacentMines: 0,
    state: 'hidden' as CellState,
  }));

  // Calculate adjacent mine counts
  for (let i = 0; i < total; i++) {
    if (grid[i].hasMine) continue;
    const neighbors = getNeighbors(i, rows, cols);
    grid[i].adjacentMines = neighbors.filter(n => grid[n].hasMine).length;
  }

  return grid;
}

/**
 * Flood-fill reveal of empty cells (cells with adjacentMines === 0).
 */
function floodReveal(grid: Cell[], pos: number, rows: number, cols: number): Cell[] {
  const newGrid = grid.map(c => ({ ...c }));
  const stack = [pos];

  while (stack.length > 0) {
    const p = stack.pop()!;
    if (newGrid[p].state !== 'hidden') continue;
    if (newGrid[p].hasMine) continue;

    newGrid[p].state = 'revealed';

    if (newGrid[p].adjacentMines === 0) {
      const neighbors = getNeighbors(p, rows, cols);
      for (const n of neighbors) {
        if (newGrid[n].state === 'hidden' && !newGrid[n].hasMine) {
          stack.push(n);
        }
      }
    }
  }

  return newGrid;
}

// ============================================================================
// Game Engine Implementation
// ============================================================================

function init(seed: string, params: BatasMineParams): BatasMineState {
  const total = params.rows * params.cols;

  // Create empty grid (mines placed on first reveal)
  const grid: Cell[] = Array.from({ length: total }, () => ({
    hasMine: false,
    adjacentMines: 0,
    state: 'hidden' as CellState,
  }));

  return {
    status: 'playing',
    startedAtMs: Date.now(),
    endedAtMs: null,
    config: params,
    grid,
    cellsRevealed: 0,
    totalSafe: total - params.mines,
    flagsPlaced: 0,
    minesPlaced: false,
    seed,
  };
}

function validateAction(
  state: BatasMineState,
  action: BatasMineAction
): string | null {
  if (state.status !== 'playing') {
    return 'Game is already finished';
  }

  if (action.position < 0 || action.position >= state.grid.length) {
    return `Invalid position: ${action.position}`;
  }

  const cell = state.grid[action.position];

  if (action.type === 'reveal') {
    if (cell.state === 'revealed') return 'Cell already revealed';
    if (cell.state === 'flagged') return 'Unflag first';
    return null;
  }

  if (action.type === 'toggle_flag') {
    if (cell.state === 'revealed') return 'Cannot flag revealed cell';
    return null;
  }

  return 'Unknown action type';
}

function applyAction(
  state: BatasMineState,
  action: BatasMineAction
): ActionResult<BatasMineState> {
  const validationError = validateAction(state, action);
  if (validationError) {
    return { state, events: [], invalidReason: validationError };
  }

  if (action.type === 'toggle_flag') {
    const cell = state.grid[action.position];
    const newState = cell.state === 'flagged' ? 'hidden' : 'flagged';
    const flagDelta = newState === 'flagged' ? 1 : -1;

    const newGrid = state.grid.map((c, i) =>
      i === action.position ? { ...c, state: newState as CellState } : c
    );

    return {
      state: {
        ...state,
        grid: newGrid,
        flagsPlaced: state.flagsPlaced + flagDelta,
      },
      events: [{
        type: 'flag_toggled',
        payload: { position: action.position, flagged: newState === 'flagged' },
      }],
    };
  }

  // Reveal action
  let currentGrid = state.grid;
  let minesPlaced = state.minesPlaced;

  // Place mines on first reveal
  if (!minesPlaced) {
    currentGrid = placeMines(
      state.seed,
      state.config.rows,
      state.config.cols,
      state.config.mines,
      action.position
    );
    minesPlaced = true;
  }

  const cell = currentGrid[action.position];
  const events: GameEvent[] = [];

  // Hit a mine
  if (cell.hasMine) {
    const newGrid = currentGrid.map((c, i) => {
      if (i === action.position) return { ...c, state: 'mine_exploded' as CellState };
      if (c.hasMine) return { ...c, state: 'mine_revealed' as CellState };
      return c;
    });

    events.push(
      { type: 'mine_hit', payload: { position: action.position } },
      { type: 'game_ended', payload: { outcome: 'lost' } }
    );

    return {
      state: {
        ...state,
        grid: newGrid,
        minesPlaced,
        status: 'lost',
        endedAtMs: Date.now(),
      },
      events,
    };
  }

  // Safe cell - flood reveal
  const newGrid = floodReveal(currentGrid, action.position, state.config.rows, state.config.cols);
  const cellsRevealed = newGrid.filter(c => c.state === 'revealed').length;

  events.push({
    type: 'cells_revealed',
    payload: { position: action.position, totalRevealed: cellsRevealed },
  });

  const totalSafe = state.config.rows * state.config.cols - state.config.mines;
  const won = cellsRevealed >= totalSafe;

  if (won) {
    // Auto-flag remaining mines
    const wonGrid = newGrid.map(c =>
      c.hasMine && c.state === 'hidden' ? { ...c, state: 'flagged' as CellState } : c
    );

    events.push({ type: 'game_ended', payload: { outcome: 'won' } });

    return {
      state: {
        ...state,
        grid: wonGrid,
        cellsRevealed,
        totalSafe,
        minesPlaced,
        flagsPlaced: state.config.mines,
        status: 'won',
        endedAtMs: Date.now(),
      },
      events,
    };
  }

  return {
    state: {
      ...state,
      grid: newGrid,
      cellsRevealed,
      totalSafe,
      minesPlaced,
    },
    events,
  };
}

function isTerminal(state: BatasMineState): boolean {
  return state.status !== 'playing';
}

function getScore(state: BatasMineState, durationMs: number): number {
  if (state.status !== 'won') return 0;
  return calculateScore(state.cellsRevealed, durationMs);
}

function getSummary(state: BatasMineState): GameSummary {
  const durationMs = state.endedAtMs
    ? state.endedAtMs - state.startedAtMs
    : Date.now() - state.startedAtMs;

  return {
    outcome: state.status === 'won' ? 'win' : state.status === 'lost' ? 'lose' : 'forfeit',
    score: getScore(state, durationMs),
    attemptsUsed: state.cellsRevealed,
    durationMs,
    details: {
      cellsRevealed: state.cellsRevealed,
      totalSafe: state.totalSafe,
      flagsPlaced: state.flagsPlaced,
    },
  };
}

function verify(
  seed: string,
  params: BatasMineParams,
  actions: BatasMineAction[]
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

export const batasMineEngine: GameEngine<BatasMineState, BatasMineAction, BatasMineParams> = {
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
export function getModeParams(modeId: BatasMineModeId): BatasMineParams {
  return { ...BATASMINE_MODES[modeId] };
}
