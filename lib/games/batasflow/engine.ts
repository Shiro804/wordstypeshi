/**
 * BatasFlow - Game Engine
 *
 * Pure, deterministic game logic for BatasFlow (Flow/Numberlink puzzle).
 * Connect pairs of colored dots by drawing paths that fill the entire grid.
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
import { generatePuzzle, type Dot, type PathCell } from './puzzle-generator';

// ============================================================================
// Types
// ============================================================================

export interface BatasFlowParams extends GameParams {
  gridSize: number;
}

export interface BatasFlowState extends BaseGameState {
  /** 2D grid with color IDs (pairId) or null for empty cells */
  grid: (number | null)[][];
  /** Fixed dot positions */
  dots: Dot[];
  /** Current paths drawn by the player */
  paths: Map<number, PathCell[]>;
  /** Active path being drawn, or null */
  currentPath: { pairId: number; cells: PathCell[] } | null;
  /** Set of completed (connected) flow pair IDs */
  completedFlows: Set<number>;
  /** Total number of path-extend moves */
  moveCount: number;
  /** Total number of flows to connect */
  flowsTotal: number;
  /** Grid size (N×N) */
  gridSize: number;
}

export type BatasFlowAction =
  | { type: 'start_path'; row: number; col: number }
  | { type: 'extend_path'; row: number; col: number }
  | { type: 'finish_path' }
  | { type: 'clear_path'; pairId: number };

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Convert state with Map/Set to plain objects for serialization,
 * and back. Engine methods work with Map/Set internally.
 */
function ensureMaps(state: BatasFlowState): BatasFlowState {
  if (state.paths instanceof Map && state.completedFlows instanceof Set) {
    return state;
  }
  return {
    ...state,
    paths: state.paths instanceof Map
      ? state.paths
      : new Map(Object.entries(state.paths as unknown as Record<string, PathCell[]>).map(
          ([k, v]) => [Number(k), v]
        )),
    completedFlows: state.completedFlows instanceof Set
      ? state.completedFlows
      : new Set(state.completedFlows as unknown as number[]),
  };
}

// ============================================================================
// Scoring
// ============================================================================

const SCORING = {
  baseScore: 1000,
  movePenalty: 5,
  maxTimeBonusMs: 300000,
  maxTimeBonus: 500,
} as const;

function calculateScore(moveCount: number, durationMs: number): number {
  const moveDeduction = moveCount * SCORING.movePenalty;
  const baseScore = Math.max(0, SCORING.baseScore - moveDeduction);

  const timeFactor = Math.max(0, 1 - (durationMs / SCORING.maxTimeBonusMs));
  const timeBonus = Math.floor(timeFactor * SCORING.maxTimeBonus);

  return baseScore + timeBonus;
}

// ============================================================================
// Helpers
// ============================================================================

function isAdjacent(a: PathCell, b: PathCell): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function findDotAt(dots: Dot[], row: number, col: number): Dot | undefined {
  return dots.find(d => d.row === row && d.col === col);
}

function getDotsForPair(dots: Dot[], pairId: number): [Dot, Dot] {
  const pair = dots.filter(d => d.pairId === pairId);
  return [pair[0], pair[1]];
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/**
 * Rebuild the 2D grid from current paths and dots.
 */
function buildGrid(gridSize: number, paths: Map<number, PathCell[]>, dots: Dot[]): (number | null)[][] {
  const grid: (number | null)[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => null)
  );

  // Place all dot positions
  for (const dot of dots) {
    grid[dot.row][dot.col] = dot.pairId;
  }

  // Place all path cells
  for (const [pairId, path] of paths) {
    for (const cell of path) {
      grid[cell.row][cell.col] = pairId;
    }
  }

  return grid;
}

/**
 * Check if all cells in the grid are filled.
 */
function isGridFull(grid: (number | null)[][]): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (cell === null) return false;
    }
  }
  return true;
}

/**
 * Check if a path connects both dots of a pair.
 */
function isFlowComplete(path: PathCell[], dots: Dot[], pairId: number): boolean {
  if (path.length < 1) return false;

  const [dotA, dotB] = getDotsForPair(dots, pairId);
  const first = path[0];
  const last = path[path.length - 1];

  // Path must start adjacent to one dot and end adjacent to (or on) the other
  // Actually the path starts FROM a dot and ends AT the other dot
  const startsAtA = first.row === dotA.row && first.col === dotA.col;
  const startsAtB = first.row === dotB.row && first.col === dotB.col;
  const endsAtA = last.row === dotA.row && last.col === dotA.col;
  const endsAtB = last.row === dotB.row && last.col === dotB.col;

  return (startsAtA && endsAtB) || (startsAtB && endsAtA);
}

/**
 * Get all cells occupied by other paths/dots (not including the given pairId).
 */
function getOccupiedCells(
  paths: Map<number, PathCell[]>,
  dots: Dot[],
  excludePairId: number
): Set<string> {
  const occupied = new Set<string>();

  for (const dot of dots) {
    if (dot.pairId !== excludePairId) {
      occupied.add(cellKey(dot.row, dot.col));
    }
  }

  for (const [pid, path] of paths) {
    if (pid !== excludePairId) {
      for (const cell of path) {
        occupied.add(cellKey(cell.row, cell.col));
      }
    }
  }

  return occupied;
}

// ============================================================================
// Game Engine Implementation
// ============================================================================

function init(seed: string, params: BatasFlowParams): BatasFlowState {
  const puzzle = generatePuzzle(seed, params);

  const paths = new Map<number, PathCell[]>();
  const grid = buildGrid(puzzle.gridSize, paths, puzzle.dots);

  return {
    status: 'playing',
    startedAtMs: Date.now(),
    endedAtMs: null,
    grid,
    dots: puzzle.dots,
    paths,
    currentPath: null,
    completedFlows: new Set<number>(),
    moveCount: 0,
    flowsTotal: puzzle.solution.size,
    gridSize: puzzle.gridSize,
  };
}

function validateAction(
  state: BatasFlowState,
  action: BatasFlowAction
): string | null {
  if (state.status !== 'playing') {
    return 'Game is already finished';
  }

  switch (action.type) {
    case 'start_path': {
      const { row, col } = action;
      if (row < 0 || row >= state.gridSize || col < 0 || col >= state.gridSize) {
        return 'Position out of bounds';
      }
      const dot = findDotAt(state.dots, row, col);
      if (!dot) {
        return 'Can only start a path on a dot';
      }
      if (state.currentPath !== null) {
        return 'Already drawing a path — finish or clear the current one first';
      }
      return null;
    }

    case 'extend_path': {
      const { row, col } = action;
      if (row < 0 || row >= state.gridSize || col < 0 || col >= state.gridSize) {
        return 'Position out of bounds';
      }
      if (state.currentPath === null) {
        return 'No active path — start a path first';
      }
      const lastCell = state.currentPath.cells[state.currentPath.cells.length - 1];
      if (!isAdjacent(lastCell, { row, col })) {
        return 'Cell must be adjacent to the last cell in the path';
      }
      return null;
    }

    case 'finish_path': {
      if (state.currentPath === null) {
        return 'No active path to finish';
      }
      const { pairId, cells } = state.currentPath;
      if (!isFlowComplete(cells, state.dots, pairId)) {
        return 'Path does not connect both dots';
      }
      return null;
    }

    case 'clear_path': {
      const { pairId } = action;
      if (!state.paths.has(pairId) && (state.currentPath === null || state.currentPath.pairId !== pairId)) {
        return 'No path exists for this flow';
      }
      return null;
    }

    default:
      return 'Unknown action type';
  }
}

function applyAction(
  state: BatasFlowState,
  action: BatasFlowAction
): ActionResult<BatasFlowState> {
  state = ensureMaps(state);

  const validationError = validateAction(state, action);
  if (validationError) {
    return { state, events: [], invalidReason: validationError };
  }

  switch (action.type) {
    case 'start_path': {
      const { row, col } = action;
      const dot = findDotAt(state.dots, row, col)!;
      const pairId = dot.pairId;

      // If there's already a completed path for this pair, remove it
      const newPaths = new Map(state.paths);
      newPaths.delete(pairId);
      const newCompleted = new Set(state.completedFlows);
      newCompleted.delete(pairId);

      const currentPath = { pairId, cells: [{ row, col }] };
      const newGrid = buildGrid(state.gridSize, newPaths, state.dots);

      return {
        state: {
          ...state,
          grid: newGrid,
          paths: newPaths,
          currentPath,
          completedFlows: newCompleted,
        },
        events: [{
          type: 'path_started',
          payload: { pairId, row, col },
        }],
      };
    }

    case 'extend_path': {
      const { row, col } = action;
      const current = state.currentPath!;
      const key = cellKey(row, col);

      // Check if the cell is already part of this current path (backtracking)
      const existingIdx = current.cells.findIndex(c => c.row === row && c.col === col);
      if (existingIdx !== -1) {
        // Backtrack: trim path to that point
        const trimmedCells = current.cells.slice(0, existingIdx + 1);
        const newCurrentPath = { ...current, cells: trimmedCells };
        const newGrid = buildGrid(state.gridSize, state.paths, state.dots);
        // Mark current path cells on grid
        for (const cell of trimmedCells) {
          newGrid[cell.row][cell.col] = current.pairId;
        }

        return {
          state: {
            ...state,
            grid: newGrid,
            currentPath: newCurrentPath,
          },
          events: [{
            type: 'path_backtracked',
            payload: { pairId: current.pairId, row, col },
          }],
        };
      }

      // Check cell is not occupied by another flow
      const occupied = getOccupiedCells(state.paths, state.dots, current.pairId);
      // Also check it's not a dot of another pair
      const dotAtTarget = findDotAt(state.dots, row, col);
      if (dotAtTarget && dotAtTarget.pairId !== current.pairId) {
        return {
          state,
          events: [],
          invalidReason: 'Cell belongs to a different flow',
        };
      }
      if (occupied.has(key)) {
        return {
          state,
          events: [],
          invalidReason: 'Cell is already occupied by another flow',
        };
      }

      const newCells = [...current.cells, { row, col }];
      const newCurrentPath = { ...current, cells: newCells };
      const newGrid = buildGrid(state.gridSize, state.paths, state.dots);
      for (const cell of newCells) {
        newGrid[cell.row][cell.col] = current.pairId;
      }

      return {
        state: {
          ...state,
          grid: newGrid,
          currentPath: newCurrentPath,
          moveCount: state.moveCount + 1,
        },
        events: [{
          type: 'path_extended',
          payload: { pairId: current.pairId, row, col },
        }],
      };
    }

    case 'finish_path': {
      const current = state.currentPath!;
      const newPaths = new Map(state.paths);
      newPaths.set(current.pairId, current.cells);

      const newCompleted = new Set(state.completedFlows);
      newCompleted.add(current.pairId);

      const newGrid = buildGrid(state.gridSize, newPaths, state.dots);

      // Check terminal: all flows connected AND all cells filled
      const allConnected = newCompleted.size === state.flowsTotal;
      const gridFull = allConnected && isGridFull(newGrid);
      const won = allConnected && gridFull;

      const events: GameEvent[] = [{
        type: 'path_finished',
        payload: { pairId: current.pairId, length: current.cells.length },
      }];

      if (won) {
        events.push({
          type: 'game_ended',
          payload: { outcome: 'won' },
        });
      }

      return {
        state: {
          ...state,
          grid: newGrid,
          paths: newPaths,
          currentPath: null,
          completedFlows: newCompleted,
          status: won ? 'won' : 'playing',
          endedAtMs: won ? Date.now() : null,
        },
        events,
      };
    }

    case 'clear_path': {
      const { pairId } = action;

      // Clear current path if it matches
      const newCurrentPath = state.currentPath?.pairId === pairId ? null : state.currentPath;

      const newPaths = new Map(state.paths);
      newPaths.delete(pairId);
      const newCompleted = new Set(state.completedFlows);
      newCompleted.delete(pairId);

      const newGrid = buildGrid(state.gridSize, newPaths, state.dots);
      if (newCurrentPath) {
        for (const cell of newCurrentPath.cells) {
          newGrid[cell.row][cell.col] = newCurrentPath.pairId;
        }
      }

      return {
        state: {
          ...state,
          grid: newGrid,
          paths: newPaths,
          currentPath: newCurrentPath,
          completedFlows: newCompleted,
        },
        events: [{
          type: 'path_cleared',
          payload: { pairId },
        }],
      };
    }
  }

  return { state, events: [] };
}

function isTerminal(state: BatasFlowState): boolean {
  return state.status !== 'playing';
}

function getScore(state: BatasFlowState, durationMs: number): number {
  if (state.status !== 'won') return 0;
  return calculateScore(state.moveCount, durationMs);
}

function getSummary(state: BatasFlowState): GameSummary {
  state = ensureMaps(state);
  const durationMs = state.endedAtMs
    ? state.endedAtMs - state.startedAtMs
    : Date.now() - state.startedAtMs;

  return {
    outcome: state.status === 'won' ? 'win' : 'forfeit',
    score: getScore(state, durationMs),
    attemptsUsed: state.moveCount,
    durationMs,
    details: {
      completedFlows: state.completedFlows instanceof Set
        ? state.completedFlows.size
        : (state.completedFlows as unknown as number[]).length,
      flowsTotal: state.flowsTotal,
      moveCount: state.moveCount,
      gridSize: state.gridSize,
    },
  };
}

function verify(
  seed: string,
  params: BatasFlowParams,
  actions: BatasFlowAction[]
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

export const batasFlowEngine: GameEngine<BatasFlowState, BatasFlowAction, BatasFlowParams> = {
  init,
  applyAction,
  isTerminal,
  getScore,
  getSummary,
  verify,
};
