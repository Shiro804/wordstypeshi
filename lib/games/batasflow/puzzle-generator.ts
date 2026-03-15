/**
 * BatasFlow - Puzzle Generator
 *
 * Deterministic puzzle generator that creates valid Flow puzzles from a seed.
 * Algorithm: Start with empty grid, place random snake-like paths (no crossings),
 * store start/end points as "dots". Each path has its own color.
 */

import { createSeededRandom } from '../sdk';

// ============================================================================
// Types
// ============================================================================

export interface Dot {
  row: number;
  col: number;
  color: string;
  pairId: number;
}

export interface PathCell {
  row: number;
  col: number;
}

export interface FlowPuzzle {
  dots: Dot[];
  solution: Map<number, PathCell[]>;
  gridSize: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Flow colors used for paths.
 */
export const FLOW_COLORS = [
  '#EF4444', // red
  '#3B82F6', // blue
  '#22C55E', // green
  '#F59E0B', // amber
  '#A855F7', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#84CC16', // lime
] as const;

const DIRECTIONS: [number, number][] = [
  [-1, 0], // up
  [1, 0],  // down
  [0, -1], // left
  [0, 1],  // right
];

// ============================================================================
// Grid Size → Flow Count Mapping
// ============================================================================

function getFlowRange(gridSize: number): [number, number] {
  switch (gridSize) {
    case 5: return [4, 5];
    case 7: return [6, 7];
    case 9: return [8, 9];
    default: return [4, 5];
  }
}

// ============================================================================
// Puzzle Generation
// ============================================================================

/**
 * Generate a valid Flow puzzle deterministically from a seed.
 *
 * Algorithm:
 * 1. Create an empty grid
 * 2. For each flow, grow a random snake-like path from a random unoccupied cell
 * 3. Paths cannot cross each other
 * 4. Start and end points of each path become the "dots"
 * 5. The puzzle is guaranteed solvable because it was generated from a solution
 */
export function generatePuzzle(
  seed: string,
  params: { gridSize: number }
): FlowPuzzle {
  const { gridSize } = params;
  const random = createSeededRandom(seed);
  const [minFlows, maxFlows] = getFlowRange(gridSize);
  const targetFlows = minFlows + Math.floor(random() * (maxFlows - minFlows + 1));

  // Grid tracks which pairId occupies each cell (-1 = empty)
  const grid: number[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => -1)
  );

  const solution = new Map<number, PathCell[]>();
  const dots: Dot[] = [];

  let placedFlows = 0;
  let attempts = 0;
  const maxAttempts = targetFlows * 50;

  while (placedFlows < targetFlows && attempts < maxAttempts) {
    attempts++;
    const path = generatePath(grid, gridSize, placedFlows, random);
    if (path.length < 2) continue;

    // Place path on grid
    for (const cell of path) {
      grid[cell.row][cell.col] = placedFlows;
    }

    solution.set(placedFlows, path);

    const color = FLOW_COLORS[placedFlows % FLOW_COLORS.length];
    dots.push(
      { row: path[0].row, col: path[0].col, color, pairId: placedFlows },
      { row: path[path.length - 1].row, col: path[path.length - 1].col, color, pairId: placedFlows }
    );

    placedFlows++;
  }

  // If we couldn't place enough flows, retry with a modified seed
  if (placedFlows < minFlows) {
    return generatePuzzle(seed + '_retry', params);
  }

  return { dots, solution, gridSize };
}

/**
 * Generate a single snake-like path on the grid.
 * Starts from a random empty cell and grows in random directions.
 */
function generatePath(
  grid: number[][],
  gridSize: number,
  _pairId: number,
  random: () => number
): PathCell[] {
  // Find all empty cells
  const emptyCells: PathCell[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === -1) {
        emptyCells.push({ row: r, col: c });
      }
    }
  }

  if (emptyCells.length < 2) return [];

  // Pick a random starting cell
  const startIdx = Math.floor(random() * emptyCells.length);
  const start = emptyCells[startIdx];

  const path: PathCell[] = [start];
  const visited = new Set<string>();
  visited.add(`${start.row},${start.col}`);

  // Target path length: between 3 and a reasonable max based on grid size
  const minLength = 3;
  const maxLength = Math.min(Math.floor(gridSize * 1.5) + 2, emptyCells.length);
  const targetLength = minLength + Math.floor(random() * (maxLength - minLength + 1));

  for (let step = 1; step < targetLength; step++) {
    const current = path[path.length - 1];

    // Shuffle directions for randomness
    const dirs = [...DIRECTIONS];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }

    let moved = false;
    for (const [dr, dc] of dirs) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      const key = `${nr},${nc}`;

      if (
        nr >= 0 && nr < gridSize &&
        nc >= 0 && nc < gridSize &&
        grid[nr][nc] === -1 &&
        !visited.has(key)
      ) {
        path.push({ row: nr, col: nc });
        visited.add(key);
        moved = true;
        break;
      }
    }

    if (!moved) break;
  }

  // Path must be at least 2 cells
  if (path.length < 2) return [];

  return path;
}
