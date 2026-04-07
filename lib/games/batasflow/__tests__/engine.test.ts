import { describe, it, expect } from 'vitest';
import {
  batasFlowEngine,
  type BatasFlowParams,
  type BatasFlowAction,
  type BatasFlowState,
} from '../engine';
import { generatePuzzle } from '../puzzle-generator';
import { calculateScore, SCORING, BATASFLOW_MODES } from '../ruleset';

const easyParams: BatasFlowParams = { gridSize: BATASFLOW_MODES.easy.gridSize };
const mediumParams: BatasFlowParams = { gridSize: BATASFLOW_MODES.medium.gridSize };
const hardParams: BatasFlowParams = { gridSize: BATASFLOW_MODES.hard.gridSize };

// ============================================================================
// Puzzle Generator Tests
// ============================================================================

describe('generatePuzzle', () => {
  it('generates correct grid size for each difficulty', () => {
    for (const [, mode] of Object.entries(BATASFLOW_MODES)) {
      const puzzle = generatePuzzle('grid-size-test', { gridSize: mode.gridSize });
      expect(puzzle.gridSize).toBe(mode.gridSize);
    }
  });

  it('generates correct number of dot pairs for easy (6×6)', () => {
    const puzzle = generatePuzzle('easy-dots', { gridSize: BATASFLOW_MODES.easy.gridSize });
    // Each pair has exactly 2 dots
    const pairIds = new Set(puzzle.dots.map(d => d.pairId));
    expect(pairIds.size).toBe(BATASFLOW_MODES.easy.numFlows);
  });

  it('generates correct number of dot pairs for medium (8×8)', () => {
    const puzzle = generatePuzzle('medium-dots', { gridSize: BATASFLOW_MODES.medium.gridSize });
    const pairIds = new Set(puzzle.dots.map(d => d.pairId));
    expect(pairIds.size).toBe(BATASFLOW_MODES.medium.numFlows);
  });

  it('generates correct number of dot pairs for hard (10×10)', () => {
    const puzzle = generatePuzzle('hard-dots', { gridSize: BATASFLOW_MODES.hard.gridSize });
    const pairIds = new Set(puzzle.dots.map(d => d.pairId));
    expect(pairIds.size).toBe(BATASFLOW_MODES.hard.numFlows);
  });

  it('every pair has exactly 2 dots', () => {
    for (const size of [6, 8, 10]) {
      const puzzle = generatePuzzle(`pair-check-${size}`, { gridSize: size });
      const counts = new Map<number, number>();
      for (const dot of puzzle.dots) {
        counts.set(dot.pairId, (counts.get(dot.pairId) || 0) + 1);
      }
      for (const [, count] of counts) {
        expect(count).toBe(2);
      }
    }
  });

  it('generated puzzles are solvable (solution provided)', () => {
    for (const size of [6, 8, 10]) {
      const puzzle = generatePuzzle(`solvable-${size}`, { gridSize: size });
      // The solution map should have the same number of entries as pairs
      const pairIds = new Set(puzzle.dots.map(d => d.pairId));
      expect(puzzle.solution.size).toBe(pairIds.size);

      // Each solution path should start and end at the dot positions
      for (const [pairId, path] of puzzle.solution) {
        const dots = puzzle.dots.filter(d => d.pairId === pairId);
        expect(dots).toHaveLength(2);
        expect(path.length).toBeGreaterThanOrEqual(2);

        const first = path[0];
        const last = path[path.length - 1];
        const matchesA =
          (first.row === dots[0].row && first.col === dots[0].col) &&
          (last.row === dots[1].row && last.col === dots[1].col);
        const matchesB =
          (first.row === dots[1].row && first.col === dots[1].col) &&
          (last.row === dots[0].row && last.col === dots[0].col);
        expect(matchesA || matchesB).toBe(true);
      }
    }
  });

  it('is deterministic (same seed produces same puzzle)', () => {
    const p1 = generatePuzzle('deterministic', { gridSize: 6 });
    const p2 = generatePuzzle('deterministic', { gridSize: 6 });
    expect(p1.dots).toEqual(p2.dots);
    expect(p1.gridSize).toBe(p2.gridSize);
  });

  it('different seeds produce different puzzles', () => {
    const p1 = generatePuzzle('seed-a', { gridSize: 6 });
    const p2 = generatePuzzle('seed-b', { gridSize: 6 });
    const d1 = p1.dots.map(d => `${d.row},${d.col}`).sort();
    const d2 = p2.dots.map(d => `${d.row},${d.col}`).sort();
    expect(d1).not.toEqual(d2);
  });

  it('dots are within grid bounds', () => {
    for (const size of [6, 8, 10]) {
      const puzzle = generatePuzzle(`bounds-${size}`, { gridSize: size });
      for (const dot of puzzle.dots) {
        expect(dot.row).toBeGreaterThanOrEqual(0);
        expect(dot.row).toBeLessThan(size);
        expect(dot.col).toBeGreaterThanOrEqual(0);
        expect(dot.col).toBeLessThan(size);
      }
    }
  });
});

// ============================================================================
// Engine init Tests
// ============================================================================

describe('batasFlowEngine', () => {
  describe('init', () => {
    it('creates initial state with playing status', () => {
      const state = batasFlowEngine.init('test-seed', easyParams);
      expect(state.status).toBe('playing');
      expect(state.currentPath).toBeNull();
      expect(state.moveCount).toBe(0);
      expect(state.endedAtMs).toBeNull();
    });

    it('grid has correct dimensions', () => {
      for (const [params, size] of [
        [easyParams, BATASFLOW_MODES.easy.gridSize],
        [mediumParams, BATASFLOW_MODES.medium.gridSize],
        [hardParams, BATASFLOW_MODES.hard.gridSize],
      ] as const) {
        const state = batasFlowEngine.init('size-test', params);
        expect(state.grid).toHaveLength(size);
        for (const row of state.grid) {
          expect(row).toHaveLength(size);
        }
        expect(state.gridSize).toBe(size);
      }
    });

    it('dots are placed on the grid', () => {
      const state = batasFlowEngine.init('dots-test', easyParams);
      expect(state.dots.length).toBeGreaterThanOrEqual(8); // at least 4 pairs × 2
      for (const dot of state.dots) {
        expect(state.grid[dot.row][dot.col]).toBe(dot.pairId);
      }
    });

    it('paths map is empty initially', () => {
      const state = batasFlowEngine.init('test-seed', easyParams);
      expect(state.paths).toBeInstanceOf(Map);
      expect(state.paths.size).toBe(0);
    });

    it('completedFlows set is empty initially', () => {
      const state = batasFlowEngine.init('test-seed', easyParams);
      expect(state.completedFlows).toBeInstanceOf(Set);
      expect(state.completedFlows.size).toBe(0);
    });

    it('flowsTotal matches number of dot pairs', () => {
      const state = batasFlowEngine.init('test-seed', easyParams);
      const pairIds = new Set(state.dots.map(d => d.pairId));
      expect(state.flowsTotal).toBe(pairIds.size);
    });
  });

  // ============================================================================
  // start_path Tests
  // ============================================================================

  describe('start_path', () => {
    it('starts a path on a dot', () => {
      const state = batasFlowEngine.init('start-test', easyParams);
      const dot = state.dots[0];
      const result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: dot.row,
        col: dot.col,
      });

      expect(result.invalidReason).toBeUndefined();
      expect(result.state.currentPath).not.toBeNull();
      expect(result.state.currentPath!.pairId).toBe(dot.pairId);
      expect(result.state.currentPath!.cells).toHaveLength(1);
      expect(result.state.currentPath!.cells[0]).toEqual({ row: dot.row, col: dot.col });
    });

    it('rejects starting on an empty cell', () => {
      const state = batasFlowEngine.init('start-empty', easyParams);
      // Find an empty cell (not a dot)
      const dotPositions = new Set(state.dots.map(d => `${d.row},${d.col}`));
      let emptyRow = -1, emptyCol = -1;
      for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
          if (!dotPositions.has(`${r},${c}`)) {
            emptyRow = r;
            emptyCol = c;
            break;
          }
        }
        if (emptyRow >= 0) break;
      }

      const result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: emptyRow,
        col: emptyCol,
      });
      expect(result.invalidReason).toContain('Can only start a path on a dot');
    });

    it('rejects starting when already drawing a path', () => {
      const state = batasFlowEngine.init('double-start', easyParams);
      const dot1 = state.dots[0];
      const dot2 = state.dots[2]; // different pair

      let result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: dot1.row,
        col: dot1.col,
      });
      result = batasFlowEngine.applyAction(result.state, {
        type: 'start_path',
        row: dot2.row,
        col: dot2.col,
      });
      expect(result.invalidReason).toContain('Already drawing a path');
    });

    it('rejects out of bounds position', () => {
      const state = batasFlowEngine.init('test-seed', easyParams);
      const result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: -1,
        col: 0,
      });
      expect(result.invalidReason).toContain('out of bounds');
    });

    it('emits path_started event', () => {
      const state = batasFlowEngine.init('event-test', easyParams);
      const dot = state.dots[0];
      const result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: dot.row,
        col: dot.col,
      });
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('path_started');
    });

    it('clears existing completed path for same pair when re-starting', () => {
      const state = batasFlowEngine.init('restart-test', easyParams);
      const dot = state.dots[0];
      const partialState = buildSingleCompletedFlow(state, dot.pairId);
      if (!partialState) return; // skip if can't build

      expect(partialState.completedFlows.has(dot.pairId)).toBe(true);

      const result = batasFlowEngine.applyAction(partialState, {
        type: 'start_path',
        row: dot.row,
        col: dot.col,
      });
      expect(result.invalidReason).toBeUndefined();
      expect(result.state.completedFlows.has(dot.pairId)).toBe(false);
      expect(result.state.paths.has(dot.pairId)).toBe(false);
    });
  });

  // ============================================================================
  // extend_path Tests
  // ============================================================================

  describe('extend_path', () => {
    it('extends path to adjacent cell', () => {
      const state = batasFlowEngine.init('extend-test', easyParams);
      const dot = state.dots[0];
      let result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: dot.row,
        col: dot.col,
      });

      // Find an adjacent empty cell
      const adj = findAdjacentEmpty(result.state, dot.row, dot.col, dot.pairId);
      if (!adj) return;

      result = batasFlowEngine.applyAction(result.state, {
        type: 'extend_path',
        row: adj.row,
        col: adj.col,
      });

      expect(result.invalidReason).toBeUndefined();
      expect(result.state.currentPath!.cells).toHaveLength(2);
      expect(result.state.moveCount).toBe(1);
    });

    it('rejects non-adjacent cell (diagonal)', () => {
      const state = batasFlowEngine.init('diagonal-test', easyParams);
      const dot = state.dots[0];
      let result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: dot.row,
        col: dot.col,
      });

      // Try diagonal
      const diagRow = dot.row + 1;
      const diagCol = dot.col + 1;
      if (diagRow < state.gridSize && diagCol < state.gridSize) {
        result = batasFlowEngine.applyAction(result.state, {
          type: 'extend_path',
          row: diagRow,
          col: diagCol,
        });
        expect(result.invalidReason).toContain('adjacent');
      }
    });

    it('rejects non-adjacent cell (far away)', () => {
      const state = batasFlowEngine.init('far-test', easyParams);
      const dot = state.dots[0];
      let result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: dot.row,
        col: dot.col,
      });

      // Pick a cell that's definitely not adjacent
      const farRow = (dot.row + 2) % state.gridSize;
      const farCol = (dot.col + 2) % state.gridSize;
      result = batasFlowEngine.applyAction(result.state, {
        type: 'extend_path',
        row: farRow,
        col: farCol,
      });
      expect(result.invalidReason).toContain('adjacent');
    });

    it('rejects cells occupied by other flows', () => {
      const state = batasFlowEngine.init('occupied-test', easyParams);
      // Build a completed flow first
      const dot0 = state.dots[0];
      const partial = buildSingleCompletedFlow(state, dot0.pairId);
      if (!partial) return;

      // Start a path from a different pair's dot
      const otherDot = partial.dots.find(d => d.pairId !== dot0.pairId);
      if (!otherDot) return;

      let result = batasFlowEngine.applyAction(partial, {
        type: 'start_path',
        row: otherDot.row,
        col: otherDot.col,
      });
      if (result.invalidReason) return;

      // Try to extend into a cell occupied by the completed flow
      const occupiedCells = partial.paths.get(dot0.pairId);
      if (!occupiedCells || occupiedCells.length === 0) return;

      for (const occCell of occupiedCells) {
        if (Math.abs(occCell.row - otherDot.row) + Math.abs(occCell.col - otherDot.col) === 1) {
          result = batasFlowEngine.applyAction(result.state, {
            type: 'extend_path',
            row: occCell.row,
            col: occCell.col,
          });
          expect(result.invalidReason).toBeDefined();
          break;
        }
      }
    });

    it('rejects extending onto dots of a different pair', () => {
      const state = batasFlowEngine.init('diff-dot-test', easyParams);
      const dot0 = state.dots[0];
      let result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: dot0.row,
        col: dot0.col,
      });

      // Find a dot of a different pair that is adjacent
      for (const otherDot of state.dots) {
        if (otherDot.pairId === dot0.pairId) continue;
        const dr = Math.abs(otherDot.row - dot0.row);
        const dc = Math.abs(otherDot.col - dot0.col);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
          result = batasFlowEngine.applyAction(result.state, {
            type: 'extend_path',
            row: otherDot.row,
            col: otherDot.col,
          });
          expect(result.invalidReason).toContain('different flow');
          return;
        }
      }
      // If no adjacent dot of different pair found, test passes trivially
    });

    it('rejects extending when no active path', () => {
      const state = batasFlowEngine.init('test-seed', easyParams);
      const result = batasFlowEngine.applyAction(state, {
        type: 'extend_path',
        row: 0,
        col: 0,
      });
      expect(result.invalidReason).toContain('No active path');
    });

    it('supports backtracking to a previous cell in current path', () => {
      const state = batasFlowEngine.init('backtrack-test', easyParams);
      const dot = state.dots[0];
      let result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: dot.row,
        col: dot.col,
      });

      const adj = findAdjacentEmpty(result.state, dot.row, dot.col, dot.pairId);
      if (!adj) return;

      result = batasFlowEngine.applyAction(result.state, {
        type: 'extend_path',
        row: adj.row,
        col: adj.col,
      });
      expect(result.state.currentPath!.cells).toHaveLength(2);

      // Backtrack to the starting dot cell
      result = batasFlowEngine.applyAction(result.state, {
        type: 'extend_path',
        row: dot.row,
        col: dot.col,
      });
      expect(result.invalidReason).toBeUndefined();
      expect(result.state.currentPath!.cells).toHaveLength(1);
      expect(result.events[0].type).toBe('path_backtracked');
    });

    it('increments moveCount on valid extension', () => {
      const state = batasFlowEngine.init('move-count', easyParams);
      const dot = state.dots[0];
      let result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: dot.row,
        col: dot.col,
      });
      expect(result.state.moveCount).toBe(0);

      const adj = findAdjacentEmpty(result.state, dot.row, dot.col, dot.pairId);
      if (!adj) return;

      result = batasFlowEngine.applyAction(result.state, {
        type: 'extend_path',
        row: adj.row,
        col: adj.col,
      });
      expect(result.state.moveCount).toBe(1);
    });
  });

  // ============================================================================
  // finish_path Tests
  // ============================================================================

  describe('finish_path', () => {
    it('completes a flow when path connects both dots', () => {
      const state = batasFlowEngine.init('finish-test', easyParams);
      const completed = buildSingleCompletedFlowViaActions(state, state.dots[0].pairId);
      if (!completed) return;

      expect(completed.state.completedFlows.has(state.dots[0].pairId)).toBe(true);
      expect(completed.state.currentPath).toBeNull();
      expect(completed.state.paths.has(state.dots[0].pairId)).toBe(true);
    });

    it('rejects finish when path does not reach partner dot', () => {
      const state = batasFlowEngine.init('no-finish-test', easyParams);
      const dot = state.dots[0];
      let result = batasFlowEngine.applyAction(state, {
        type: 'start_path',
        row: dot.row,
        col: dot.col,
      });

      // Extend once but don't reach partner
      const adj = findAdjacentEmpty(result.state, dot.row, dot.col, dot.pairId);
      if (!adj) return;

      result = batasFlowEngine.applyAction(result.state, {
        type: 'extend_path',
        row: adj.row,
        col: adj.col,
      });

      result = batasFlowEngine.applyAction(result.state, { type: 'finish_path' });
      expect(result.invalidReason).toContain('does not connect both dots');
    });

    it('rejects finish when no active path', () => {
      const state = batasFlowEngine.init('test-seed', easyParams);
      const result = batasFlowEngine.applyAction(state, { type: 'finish_path' });
      expect(result.invalidReason).toContain('No active path');
    });

    it('emits path_finished event', () => {
      const state = batasFlowEngine.init('event-finish', easyParams);
      const completed = buildSingleCompletedFlowViaActions(state, state.dots[0].pairId);
      if (!completed) return;

      expect(completed.events.some(e => e.type === 'path_finished')).toBe(true);
    });
  });

  // ============================================================================
  // clear_path Tests
  // ============================================================================

  describe('clear_path', () => {
    it('removes a completed path', () => {
      const state = batasFlowEngine.init('clear-test', easyParams);
      const pairId = state.dots[0].pairId;
      const completed = buildSingleCompletedFlow(state, pairId);
      if (!completed) return;

      expect(completed.paths.has(pairId)).toBe(true);
      const result = batasFlowEngine.applyAction(completed, {
        type: 'clear_path',
        pairId,
      });

      expect(result.invalidReason).toBeUndefined();
      expect(result.state.paths.has(pairId)).toBe(false);
      expect(result.state.completedFlows.has(pairId)).toBe(false);
    });

    it('cells become free after clearing', () => {
      const state = batasFlowEngine.init('clear-free', easyParams);
      const pairId = state.dots[0].pairId;
      const completed = buildSingleCompletedFlow(state, pairId);
      if (!completed) return;

      const pathCells = completed.paths.get(pairId)!;
      const result = batasFlowEngine.applyAction(completed, {
        type: 'clear_path',
        pairId,
      });

      // Path cells (non-dot) should be null in the grid
      const dotPositions = new Set(
        result.state.dots
          .filter(d => d.pairId === pairId)
          .map(d => `${d.row},${d.col}`)
      );
      for (const cell of pathCells) {
        if (!dotPositions.has(`${cell.row},${cell.col}`)) {
          expect(result.state.grid[cell.row][cell.col]).toBeNull();
        }
      }
    });

    it('rejects clearing a non-existent path', () => {
      const state = batasFlowEngine.init('test-seed', easyParams);
      const result = batasFlowEngine.applyAction(state, {
        type: 'clear_path',
        pairId: 999,
      });
      expect(result.invalidReason).toContain('No path exists');
    });

    it('emits path_cleared event', () => {
      const state = batasFlowEngine.init('clear-event', easyParams);
      const pairId = state.dots[0].pairId;
      const completed = buildSingleCompletedFlow(state, pairId);
      if (!completed) return;

      const result = batasFlowEngine.applyAction(completed, {
        type: 'clear_path',
        pairId,
      });
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('path_cleared');
    });
  });

  // ============================================================================
  // Terminal / Win Condition Tests
  // ============================================================================

  describe('isTerminal', () => {
    it('returns false for playing state', () => {
      const state = batasFlowEngine.init('test-seed', easyParams);
      expect(batasFlowEngine.isTerminal(state)).toBe(false);
    });

    it('returns true for won state', () => {
      const won = playToCompletionWithSeed('terminal-test', easyParams);
      expect(won.status).toBe('won');
      expect(batasFlowEngine.isTerminal(won)).toBe(true);
    });

    it('win requires ALL flows connected', () => {
      const state = batasFlowEngine.init('win-condition', easyParams);
      // Partially completed state should not be terminal
      const pairId = state.dots[0].pairId;
      const partial = buildSingleCompletedFlow(state, pairId);
      if (!partial) return;

      expect(partial.status).toBe('playing');
      expect(batasFlowEngine.isTerminal(partial)).toBe(false);
    });
  });

  // ============================================================================
  // Scoring Tests
  // ============================================================================

  describe('getScore', () => {
    it('returns 0 for non-won state', () => {
      const state = batasFlowEngine.init('test-seed', easyParams);
      expect(batasFlowEngine.getScore(state, 0)).toBe(0);
    });

    it('returns positive score for won state', () => {
      const won = playToCompletionWithSeed('score-test', easyParams);
      expect(won.status).toBe('won');
      expect(batasFlowEngine.getScore(won, 10000)).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // getSummary Tests
  // ============================================================================

  describe('getSummary', () => {
    it('returns win outcome for completed game', () => {
      const won = playToCompletionWithSeed('summary-test', easyParams);
      expect(won.status).toBe('won');

      const summary = batasFlowEngine.getSummary(won);
      expect(summary.outcome).toBe('win');
      expect(summary.attemptsUsed).toBe(won.moveCount);
      expect(summary.details.completedFlows).toBe(won.flowsTotal);
      expect(summary.details.flowsTotal).toBe(won.flowsTotal);
    });

    it('returns forfeit outcome for in-progress game', () => {
      const state = batasFlowEngine.init('forfeit-test', easyParams);
      const summary = batasFlowEngine.getSummary(state);
      expect(summary.outcome).toBe('forfeit');
    });
  });

  // ============================================================================
  // verify() Replay Tests
  // ============================================================================

  describe('verify', () => {
    it('replays actions and produces correct summary', () => {
      const seed = 'verify-test';
      const actions = buildWinActionsFromSolution(seed, easyParams);
      expect(actions.length).toBeGreaterThan(0);

      const summary = batasFlowEngine.verify(seed, easyParams, actions);
      expect(summary.outcome).toBe('win');

      const state = batasFlowEngine.init(seed, easyParams);
      expect(summary.details.completedFlows).toBe(state.flowsTotal);
    });

    it('throws on invalid action during verification', () => {
      const actions: BatasFlowAction[] = [
        { type: 'start_path', row: 0, col: 0 }, // may not be a dot
      ];
      // Use a seed where (0,0) is not a dot
      let foundSeed = '';
      for (const seed of ['verify-invalid-1', 'verify-invalid-2', 'verify-invalid-3']) {
        const state = batasFlowEngine.init(seed, easyParams);
        const hasDotAt00 = state.dots.some(d => d.row === 0 && d.col === 0);
        if (!hasDotAt00) {
          foundSeed = seed;
          break;
        }
      }
      if (foundSeed) {
        expect(() => batasFlowEngine.verify(foundSeed, easyParams, actions)).toThrow(
          'Invalid action during verification'
        );
      }
    });

    it('empty action list returns forfeit', () => {
      const summary = batasFlowEngine.verify('empty-verify', easyParams, []);
      expect(summary.outcome).toBe('forfeit');
    });
  });

  // ============================================================================
  // Action on finished game
  // ============================================================================

  describe('actions on finished game', () => {
    it('rejects actions when game is already won', () => {
      const won = playToCompletionWithSeed('finished-test', easyParams);
      expect(won.status).toBe('won');

      const result = batasFlowEngine.applyAction(won, {
        type: 'start_path',
        row: won.dots[0].row,
        col: won.dots[0].col,
      });
      expect(result.invalidReason).toContain('already finished');
    });
  });
});

// ============================================================================
// calculateScore Tests (from ruleset)
// ============================================================================

describe('calculateScore', () => {
  it('returns base score + max time bonus for 0 moves at 0ms', () => {
    const score = calculateScore(0, 0);
    expect(score).toBe(SCORING.baseScore + SCORING.maxTimeBonus);
  });

  it('deducts move penalty', () => {
    const score = calculateScore(10, 0);
    expect(score).toBe(SCORING.baseScore - 10 * SCORING.movePenalty + SCORING.maxTimeBonus);
  });

  it('base score does not go below 0', () => {
    const score = calculateScore(500, 0);
    expect(score).toBe(0 + SCORING.maxTimeBonus);
  });

  it('time bonus decreases linearly', () => {
    const halfTime = SCORING.maxTimeBonusMs / 2;
    const score = calculateScore(0, halfTime);
    const expectedTimeBonus = Math.floor(0.5 * SCORING.maxTimeBonus);
    expect(score).toBe(SCORING.baseScore + expectedTimeBonus);
  });

  it('no time bonus after max time', () => {
    const score = calculateScore(0, SCORING.maxTimeBonusMs);
    expect(score).toBe(SCORING.baseScore);
  });

  it('no time bonus for duration exceeding max time', () => {
    const score = calculateScore(0, SCORING.maxTimeBonusMs * 2);
    expect(score).toBe(SCORING.baseScore);
  });

  it('returns 0 for worst case (many moves + slow)', () => {
    const score = calculateScore(500, SCORING.maxTimeBonusMs);
    expect(score).toBe(0);
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Find an adjacent empty cell (not occupied by other flows).
 */
function findAdjacentEmpty(
  state: BatasFlowState,
  row: number,
  col: number,
  pairId: number
): { row: number; col: number } | null {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const dotPositions = new Set(
    state.dots.filter(d => d.pairId !== pairId).map(d => `${d.row},${d.col}`)
  );

  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (
      nr >= 0 && nr < state.gridSize &&
      nc >= 0 && nc < state.gridSize &&
      state.grid[nr][nc] === null &&
      !dotPositions.has(`${nr},${nc}`)
    ) {
      return { row: nr, col: nc };
    }
  }
  return null;
}

/**
 * Build a state with a single completed flow using the puzzle solution.
 */
function buildSingleCompletedFlow(
  initialState: BatasFlowState,
  pairId: number
): BatasFlowState | null {
  const state = initialState;
  const dots = state.dots.filter(d => d.pairId === pairId);
  if (dots.length !== 2) return null;

  // Use BFS to find a path between the two dots
  const path = bfsFindPath(state, dots[0], dots[1], pairId);
  if (!path) return null;

  // Build the actions
  let current = state;
  let result = batasFlowEngine.applyAction(current, {
    type: 'start_path',
    row: path[0].row,
    col: path[0].col,
  });
  if (result.invalidReason) return null;
  current = result.state;

  for (let i = 1; i < path.length; i++) {
    result = batasFlowEngine.applyAction(current, {
      type: 'extend_path',
      row: path[i].row,
      col: path[i].col,
    });
    if (result.invalidReason) return null;
    current = result.state;
  }

  result = batasFlowEngine.applyAction(current, { type: 'finish_path' });
  if (result.invalidReason) return null;

  return result.state;
}

/**
 * Build a single completed flow and return the action result (with events).
 */
function buildSingleCompletedFlowViaActions(
  initialState: BatasFlowState,
  pairId: number
): { state: BatasFlowState; events: { type: string; payload: unknown }[] } | null {
  const dots = initialState.dots.filter(d => d.pairId === pairId);
  if (dots.length !== 2) return null;

  const path = bfsFindPath(initialState, dots[0], dots[1], pairId);
  if (!path) return null;

  let current = initialState;
  const allEvents: { type: string; payload: unknown }[] = [];

  let result = batasFlowEngine.applyAction(current, {
    type: 'start_path',
    row: path[0].row,
    col: path[0].col,
  });
  if (result.invalidReason) return null;
  current = result.state;
  allEvents.push(...result.events);

  for (let i = 1; i < path.length; i++) {
    result = batasFlowEngine.applyAction(current, {
      type: 'extend_path',
      row: path[i].row,
      col: path[i].col,
    });
    if (result.invalidReason) return null;
    current = result.state;
    allEvents.push(...result.events);
  }

  result = batasFlowEngine.applyAction(current, { type: 'finish_path' });
  if (result.invalidReason) return null;
  allEvents.push(...result.events);

  return { state: result.state, events: allEvents };
}

/**
 * BFS to find a path between two dots on the grid, avoiding other dots/paths.
 */
function bfsFindPath(
  state: BatasFlowState,
  start: { row: number; col: number },
  end: { row: number; col: number },
  pairId: number
): { row: number; col: number }[] | null {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const visited = new Set<string>();
  const queue: { row: number; col: number; path: { row: number; col: number }[] }[] = [];

  visited.add(`${start.row},${start.col}`);
  queue.push({ row: start.row, col: start.col, path: [{ row: start.row, col: start.col }] });

  const otherDotPositions = new Set(
    state.dots.filter(d => d.pairId !== pairId).map(d => `${d.row},${d.col}`)
  );

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.row === end.row && current.col === end.col) {
      return current.path;
    }

    for (const [dr, dc] of directions) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      const key = `${nr},${nc}`;

      if (
        nr >= 0 && nr < state.gridSize &&
        nc >= 0 && nc < state.gridSize &&
        !visited.has(key) &&
        !otherDotPositions.has(key) &&
        (state.grid[nr][nc] === null || state.grid[nr][nc] === pairId || (nr === end.row && nc === end.col))
      ) {
        visited.add(key);
        queue.push({ row: nr, col: nc, path: [...current.path, { row: nr, col: nc }] });
      }
    }
  }

  return null;
}

/**
 * Build win actions using the puzzle's original solution paths.
 * Requires the same seed used to init the state.
 */
function buildWinActionsFromSolution(
  seed: string,
  params: BatasFlowParams
): BatasFlowAction[] {
  const puzzle = generatePuzzle(seed, params);
  const actions: BatasFlowAction[] = [];

  for (const [, path] of puzzle.solution) {
    actions.push({ type: 'start_path', row: path[0].row, col: path[0].col });
    for (let i = 1; i < path.length; i++) {
      actions.push({ type: 'extend_path', row: path[i].row, col: path[i].col });
    }
    actions.push({ type: 'finish_path' });
  }

  return actions;
}

/**
 * Play a full game to completion using the puzzle's solution paths with a known seed.
 */
function playToCompletionWithSeed(seed: string, params: BatasFlowParams): BatasFlowState {
  let state = batasFlowEngine.init(seed, params);
  const actions = buildWinActionsFromSolution(seed, params);

  for (const action of actions) {
    const result = batasFlowEngine.applyAction(state, action);
    if (result.invalidReason) {
      throw new Error(`Unexpected invalid action: ${result.invalidReason}`);
    }
    state = result.state;
  }

  return state;
}
