import { describe, it, expect } from 'vitest';
import {
  batasBottlesEngine,
  canPour,
  pourAmount,
  topColorOf,
  topRunSizeOf,
  spaceLeftOf,
  isWonState,
  calculateScore,
  type BatasBottlesParams,
  type BatasBottlesAction,
  type BatasBottlesState,
  type Bottle,
} from '../engine';
import { generatePuzzle, TARGET_BOTTLE_ID } from '../puzzle-generator';
import {
  BIG_BOTTLE_CAPACITY,
  SMALL_BOTTLE_CAPACITY,
  SCORING,
} from '../ruleset';

// ============================================================================
// Fixtures
// ============================================================================
//
// The engine is now level-based — the old easy/medium/hard modes are gone.
// We use representative levels from different phases so every test that
// needs a "small", "medium" or "large" puzzle keeps working.

const easyParams: BatasBottlesParams = { level: 1 };     // Tutorial phase

/**
 * Default test-state bookkeeping for the new engine fields. Hand-crafted
 * state fixtures below spread this in so they don't need to repeat the
 * level/moveLimit/starThresholds trio.
 */
const TEST_LEVEL_FIELDS = {
  level: 1,
  moveLimit: null as number | null,
  starThresholds: [10, 14, 20] as [number, number, number],
};

function makeBottle(
  id: number,
  capacity: number,
  layers: string[],
  isTarget = false
): Bottle {
  return { id, capacity, layers: [...layers], isTarget };
}

// ============================================================================
// Puzzle generator
// ============================================================================

describe('generatePuzzle', () => {
  it('is deterministic for the same seed', () => {
    const a = generatePuzzle('same-seed', {
      numSmallBottles: 6,
      numEmptyBottles: 2,
      numColors: 3,
    });
    const b = generatePuzzle('same-seed', {
      numSmallBottles: 6,
      numEmptyBottles: 2,
      numColors: 3,
    });
    expect(a.targetColor).toBe(b.targetColor);
    expect(a.palette).toEqual(b.palette);
    expect(a.bottles).toEqual(b.bottles);
  });

  it('different seeds produce different puzzles', () => {
    const a = generatePuzzle('seed-a', {
      numSmallBottles: 6,
      numEmptyBottles: 2,
      numColors: 3,
    });
    const b = generatePuzzle('seed-b', {
      numSmallBottles: 6,
      numEmptyBottles: 2,
      numColors: 3,
    });
    // At least *something* should differ — target color or a bottle layout.
    const serialize = (p: typeof a) =>
      `${p.targetColor}|${p.bottles.map(bb => bb.layers.join(',')).join('|')}`;
    expect(serialize(a)).not.toBe(serialize(b));
  });

  it('always includes exactly numSmallBottles + 1 bottles', () => {
    const fixtures = [
      { numSmallBottles: 6, numEmptyBottles: 2, numColors: 3 },
      { numSmallBottles: 8, numEmptyBottles: 2, numColors: 5 },
      { numSmallBottles: 12, numEmptyBottles: 2, numColors: 7 },
    ];
    for (const [i, cfg] of fixtures.entries()) {
      const puzzle = generatePuzzle(`count-${i}`, cfg);
      expect(puzzle.bottles).toHaveLength(cfg.numSmallBottles + 1);
    }
  });

  it('target bottle starts empty and has the big capacity', () => {
    const puzzle = generatePuzzle('start-empty', {
      numSmallBottles: 8,
      numEmptyBottles: 2,
      numColors: 5,
    });
    const target = puzzle.bottles[TARGET_BOTTLE_ID];
    expect(target.isTarget).toBe(true);
    expect(target.capacity).toBe(BIG_BOTTLE_CAPACITY);
    expect(target.layers).toEqual([]);
  });

  it('exactly numEmptyBottles small bottles start empty', () => {
    const puzzle = generatePuzzle('empty-count', {
      numSmallBottles: 8,
      numEmptyBottles: 2,
      numColors: 5,
    });
    const empties = puzzle.bottles.filter(b => !b.isTarget && b.layers.length === 0);
    expect(empties).toHaveLength(2);
  });

  it('non-empty small bottles are fully filled to capacity', () => {
    const puzzle = generatePuzzle('fill-check', {
      numSmallBottles: 8,
      numEmptyBottles: 2,
      numColors: 5,
    });
    for (const b of puzzle.bottles) {
      if (b.isTarget) continue;
      if (b.layers.length === 0) continue;
      expect(b.layers.length).toBe(SMALL_BOTTLE_CAPACITY);
    }
  });

  it('total target-color units across small bottles equals big bottle capacity', () => {
    const fixtures = [
      { numSmallBottles: 6, numEmptyBottles: 2, numColors: 3 },
      { numSmallBottles: 8, numEmptyBottles: 2, numColors: 5 },
      { numSmallBottles: 12, numEmptyBottles: 2, numColors: 7 },
    ];
    for (const [i, cfg] of fixtures.entries()) {
      const puzzle = generatePuzzle(`target-count-${i}`, cfg);
      const totalTarget = puzzle.bottles
        .filter(b => !b.isTarget)
        .reduce(
          (n, b) => n + b.layers.filter(l => l === puzzle.targetColor).length,
          0
        );
      expect(totalTarget).toBe(BIG_BOTTLE_CAPACITY);
    }
  });

  it('uses only colors from the declared palette', () => {
    const puzzle = generatePuzzle('palette-check', {
      numSmallBottles: 6,
      numEmptyBottles: 2,
      numColors: 3,
    });
    const paletteSet = new Set(puzzle.palette);
    for (const b of puzzle.bottles) {
      for (const c of b.layers) {
        expect(paletteSet.has(c)).toBe(true);
      }
    }
  });

  it('never produces a bottle already full of the target color', () => {
    for (const seed of ['triv-1', 'triv-2', 'triv-3', 'triv-4', 'triv-5']) {
      const puzzle = generatePuzzle(seed, {
        numSmallBottles: 6,
        numEmptyBottles: 2,
        numColors: 3,
      });
      const trivial = puzzle.bottles
        .filter(b => !b.isTarget && b.layers.length === SMALL_BOTTLE_CAPACITY)
        .some(b => b.layers.every(c => c === puzzle.targetColor));
      expect(trivial).toBe(false);
    }
  });

  it('generates solvable puzzles across many seeds at different sizes', () => {
    const fixtures = [
      { numSmallBottles: 6, numEmptyBottles: 2, numColors: 3 },
      { numSmallBottles: 8, numEmptyBottles: 2, numColors: 5 },
      { numSmallBottles: 12, numEmptyBottles: 2, numColors: 7 },
    ];
    for (const [idx, cfg] of fixtures.entries()) {
      for (let i = 0; i < 5; i++) {
        expect(() => generatePuzzle(`solvable-${idx}-${i}`, cfg)).not.toThrow();
      }
    }
  });

  it('rejects nonsense parameters', () => {
    expect(() =>
      generatePuzzle('bad', { numSmallBottles: 4, numEmptyBottles: 4, numColors: 3 })
    ).toThrow();
    expect(() =>
      generatePuzzle('bad', { numSmallBottles: 4, numEmptyBottles: 0, numColors: 1 })
    ).toThrow();
    expect(() =>
      generatePuzzle('bad', { numSmallBottles: 4, numEmptyBottles: 0, numColors: 999 })
    ).toThrow();
  });
});

// ============================================================================
// Pure helpers
// ============================================================================

describe('pure helpers', () => {
  it('topColorOf returns null for empty bottles', () => {
    expect(topColorOf(makeBottle(1, 6, []))).toBeNull();
  });

  it('topColorOf returns the last layer', () => {
    expect(topColorOf(makeBottle(1, 6, ['A', 'B', 'C']))).toBe('C');
  });

  it('topRunSizeOf counts the consecutive top run', () => {
    expect(topRunSizeOf(makeBottle(1, 6, []))).toBe(0);
    expect(topRunSizeOf(makeBottle(1, 6, ['A']))).toBe(1);
    expect(topRunSizeOf(makeBottle(1, 6, ['A', 'B', 'B']))).toBe(2);
    expect(topRunSizeOf(makeBottle(1, 6, ['A', 'A', 'A']))).toBe(3);
    expect(topRunSizeOf(makeBottle(1, 6, ['B', 'A', 'A', 'A']))).toBe(3);
    expect(topRunSizeOf(makeBottle(1, 6, ['A', 'B']))).toBe(1);
  });

  it('spaceLeftOf reports remaining capacity', () => {
    expect(spaceLeftOf(makeBottle(1, 6, []))).toBe(6);
    expect(spaceLeftOf(makeBottle(1, 6, ['A', 'A', 'A']))).toBe(3);
    expect(spaceLeftOf(makeBottle(1, 6, ['A', 'A', 'A', 'A', 'A', 'A']))).toBe(0);
  });
});

// ============================================================================
// canPour / pourAmount — the core rule
// ============================================================================

describe('canPour', () => {
  const T = 'TARGET';
  const X = 'X';

  it('rejects pouring from a bottle onto itself', () => {
    const b = makeBottle(1, 6, [X]);
    expect(canPour(b, b, T)).toBe(false);
  });

  it('rejects pouring from an empty source', () => {
    const src = makeBottle(1, 6, []);
    const dst = makeBottle(2, 6, []);
    expect(canPour(src, dst, T)).toBe(false);
  });

  it('rejects pouring into a full destination', () => {
    const src = makeBottle(1, 6, [X, X]);
    const dst = makeBottle(2, 6, [X, X, X, X, X, X]);
    expect(canPour(src, dst, T)).toBe(false);
  });

  it('allows pouring into an empty destination', () => {
    const src = makeBottle(1, 6, [X]);
    const dst = makeBottle(2, 6, []);
    expect(canPour(src, dst, T)).toBe(true);
  });

  it('allows pouring when destination top matches source top', () => {
    const src = makeBottle(1, 6, ['A', 'B']);
    const dst = makeBottle(2, 6, ['C', 'B']);
    expect(canPour(src, dst, T)).toBe(true);
  });

  it('rejects pouring when destination top differs from source top', () => {
    const src = makeBottle(1, 6, ['A', 'B']);
    const dst = makeBottle(2, 6, ['C', 'A']);
    expect(canPour(src, dst, T)).toBe(false);
  });

  it('rejects pouring the wrong color into the big target bottle', () => {
    const src = makeBottle(1, 6, [X]);
    const big = makeBottle(0, 12, [], true);
    expect(canPour(src, big, T)).toBe(false);
  });

  it('allows pouring the target color into the empty big target bottle', () => {
    const src = makeBottle(1, 6, [T]);
    const big = makeBottle(0, 12, [], true);
    expect(canPour(src, big, T)).toBe(true);
  });

  it('allows pouring target onto a partially filled target bottle', () => {
    const src = makeBottle(1, 6, [T, T]);
    const big = makeBottle(0, 12, [T, T, T], true);
    expect(canPour(src, big, T)).toBe(true);
  });
});

describe('pourAmount', () => {
  it('moves the whole top run when destination has space', () => {
    const src = makeBottle(1, 6, ['X', 'Y', 'Y', 'Y']);
    const dst = makeBottle(2, 6, []);
    expect(pourAmount(src, dst)).toBe(3);
  });

  it('is capped by remaining destination space', () => {
    const src = makeBottle(1, 6, ['X', 'Y', 'Y', 'Y']);
    const dst = makeBottle(2, 6, ['Y', 'Y', 'Y', 'Y', 'Y']);
    expect(pourAmount(src, dst)).toBe(1);
  });

  it('is capped by top run when destination is bigger', () => {
    const src = makeBottle(1, 6, ['X', 'Y']);
    const dst = makeBottle(2, 12, [], true);
    expect(pourAmount(src, dst)).toBe(1);
  });
});

// ============================================================================
// Engine — init
// ============================================================================

describe('batasBottlesEngine.init', () => {
  it('starts in playing status with no selection, no moves, no history', () => {
    const state = batasBottlesEngine.init('init-test', easyParams);
    expect(state.status).toBe('playing');
    expect(state.selectedBottleId).toBeNull();
    expect(state.moveCount).toBe(0);
    expect(state.history).toEqual([]);
    expect(state.endedAtMs).toBeNull();
  });

  it('stores the requested level and produces increasingly larger puzzles across phases', () => {
    const tut = batasBottlesEngine.init('', { level: 1 });
    const med = batasBottlesEngine.init('', { level: 250 });
    const hard = batasBottlesEngine.init('', { level: 700 });

    expect(tut.level).toBe(1);
    expect(med.level).toBe(250);
    expect(hard.level).toBe(700);

    // Later phases use more small bottles. bottles length = smalls + 1 target.
    expect(tut.bottles.length).toBeLessThan(med.bottles.length);
    expect(med.bottles.length).toBeLessThan(hard.bottles.length);

    // Big target bottle is always first and always empty at init.
    for (const state of [tut, med, hard]) {
      expect(state.bottles[0].isTarget).toBe(true);
      expect(state.bottles[0].layers).toEqual([]);
      expect(state.bottles[0].capacity).toBeGreaterThanOrEqual(2);
    }
  });

  it('tutorial levels have no move limit; later levels do', () => {
    expect(batasBottlesEngine.init('', { level: 1 }).moveLimit).toBeNull();
    expect(batasBottlesEngine.init('', { level: 25 }).moveLimit).toBeNull();
    expect(batasBottlesEngine.init('', { level: 100 }).moveLimit).not.toBeNull();
    expect(batasBottlesEngine.init('', { level: 900 }).moveLimit).not.toBeNull();
  });

  it('star thresholds are strictly increasing', () => {
    for (const level of [1, 100, 400, 700, 1000]) {
      const state = batasBottlesEngine.init('', { level });
      const [t1, t2, t3] = state.starThresholds;
      expect(t2).toBeGreaterThan(t1);
      expect(t3).toBeGreaterThan(t2);
    }
  });

  it('targetColor appears in the palette', () => {
    const state = batasBottlesEngine.init('palette-self', easyParams);
    expect(state.palette).toContain(state.targetColor);
  });
});

// ============================================================================
// Engine — tap_bottle (selection flow)
// ============================================================================

describe('tap_bottle — selection', () => {
  function firstNonEmptySmallBottleId(state: BatasBottlesState): number {
    const b = state.bottles.find(bb => !bb.isTarget && bb.layers.length > 0);
    if (!b) throw new Error('no non-empty small bottle in fixture');
    return b.id;
  }

  function firstEmptySmallBottleId(state: BatasBottlesState): number | null {
    const b = state.bottles.find(bb => !bb.isTarget && bb.layers.length === 0);
    return b ? b.id : null;
  }

  it('selecting a non-empty small bottle sets selectedBottleId', () => {
    const state = batasBottlesEngine.init('select-ok', easyParams);
    const id = firstNonEmptySmallBottleId(state);
    const res = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: id });
    expect(res.invalidReason).toBeUndefined();
    expect(res.state.selectedBottleId).toBe(id);
    expect(res.events[0].type).toBe('bottle_selected');
  });

  it('cannot select the big target bottle as source', () => {
    const state = batasBottlesEngine.init('select-big', easyParams);
    const res = batasBottlesEngine.applyAction(state, {
      type: 'tap_bottle',
      bottleId: TARGET_BOTTLE_ID,
    });
    expect(res.invalidReason).toBeDefined();
    expect(res.state.selectedBottleId).toBeNull();
  });

  it('cannot select an empty small bottle as source', () => {
    const state = batasBottlesEngine.init('select-empty', easyParams);
    const id = firstEmptySmallBottleId(state);
    if (id === null) return;
    const res = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: id });
    expect(res.invalidReason).toBeDefined();
    expect(res.state.selectedBottleId).toBeNull();
  });

  it('tapping a nonexistent bottle is rejected', () => {
    const state = batasBottlesEngine.init('bad-id', easyParams);
    const res = batasBottlesEngine.applyAction(state, {
      type: 'tap_bottle',
      bottleId: 9999,
    });
    expect(res.invalidReason).toBeDefined();
  });

  it('tapping the already-selected bottle deselects', () => {
    const state = batasBottlesEngine.init('toggle-select', easyParams);
    const id = firstNonEmptySmallBottleId(state);
    const r1 = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: id });
    const r2 = batasBottlesEngine.applyAction(r1.state, { type: 'tap_bottle', bottleId: id });
    expect(r2.state.selectedBottleId).toBeNull();
    expect(r2.events[0].type).toBe('bottle_deselected');
  });

  it('deselect action clears the selection', () => {
    const state = batasBottlesEngine.init('deselect', easyParams);
    const id = firstNonEmptySmallBottleId(state);
    const r1 = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: id });
    const r2 = batasBottlesEngine.applyAction(r1.state, { type: 'deselect' });
    expect(r2.state.selectedBottleId).toBeNull();
  });
});

// ============================================================================
// Engine — tap_bottle (pour execution)
// ============================================================================

describe('tap_bottle — pour execution', () => {
  /**
   * Craft a known state by hand so we can assert precise pour outcomes
   * independently of the generator.
   */
  function makeState(overrides: Partial<BatasBottlesState> = {}): BatasBottlesState {
    return {
      status: 'playing',
      startedAtMs: 0,
      endedAtMs: null,
      bottles: [
        { id: 0, capacity: 12, layers: [], isTarget: true },
        { id: 1, capacity: 6, layers: ['A', 'B', 'T'], isTarget: false },
        { id: 2, capacity: 6, layers: [], isTarget: false },
        { id: 3, capacity: 6, layers: ['B'], isTarget: false },
      ],
      targetColor: 'T',
      palette: ['T', 'A', 'B'],
      selectedBottleId: null,
      moveCount: 0,
      history: [],
      ...TEST_LEVEL_FIELDS,
      ...overrides,
    };
  }

  it('pour from small to empty small moves the top run and increments moveCount', () => {
    let state = makeState();
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    const result = batasBottlesEngine.applyAction(state, {
      type: 'tap_bottle',
      bottleId: 2,
    });
    expect(result.invalidReason).toBeUndefined();
    const b1 = result.state.bottles.find(b => b.id === 1)!;
    const b2 = result.state.bottles.find(b => b.id === 2)!;
    expect(b1.layers).toEqual(['A', 'B']);
    expect(b2.layers).toEqual(['T']);
    expect(result.state.moveCount).toBe(1);
    expect(result.state.selectedBottleId).toBeNull();
    expect(result.state.history).toHaveLength(1);
    expect(result.events[0].type).toBe('poured');
  });

  it('pour onto matching top color merges layers', () => {
    let state = makeState();
    // Prepare: tap 1 → select, tap 3 → pour onto ['B'] — but top of 1 is 'T'
    // which doesn't match 'B'. So this should be rejected.
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    const rej = batasBottlesEngine.applyAction(state, {
      type: 'tap_bottle',
      bottleId: 3,
    });
    expect(rej.invalidReason).toBeDefined();
    // Selection remains so user can pick a new destination.
    expect(rej.state.selectedBottleId).toBe(1);

    // Now legal merge: build a fixture with matching B→B
    let mergeState = makeState({
      bottles: [
        { id: 0, capacity: 12, layers: [], isTarget: true },
        { id: 1, capacity: 6, layers: ['A', 'B', 'B'], isTarget: false },
        { id: 2, capacity: 6, layers: [], isTarget: false },
        { id: 3, capacity: 6, layers: ['B', 'B'], isTarget: false },
      ],
    });
    mergeState = batasBottlesEngine.applyAction(mergeState, {
      type: 'tap_bottle',
      bottleId: 1,
    }).state;
    const merged = batasBottlesEngine.applyAction(mergeState, {
      type: 'tap_bottle',
      bottleId: 3,
    });
    const b1 = merged.state.bottles.find(b => b.id === 1)!;
    const b3 = merged.state.bottles.find(b => b.id === 3)!;
    expect(b1.layers).toEqual(['A']);
    expect(b3.layers).toEqual(['B', 'B', 'B', 'B']);
  });

  it('pour is capped by destination space', () => {
    let state = makeState({
      bottles: [
        { id: 0, capacity: 12, layers: [], isTarget: true },
        { id: 1, capacity: 6, layers: ['A', 'B', 'B', 'B'], isTarget: false },
        { id: 2, capacity: 6, layers: ['B', 'B', 'B', 'B', 'B'], isTarget: false },
      ],
    });
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    const res = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 2 });
    const b1 = res.state.bottles.find(b => b.id === 1)!;
    const b2 = res.state.bottles.find(b => b.id === 2)!;
    expect(b1.layers).toEqual(['A', 'B', 'B']); // one B moved
    expect(b2.layers).toEqual(['B', 'B', 'B', 'B', 'B', 'B']);
  });

  it('target bottle rejects non-target colors', () => {
    let state = makeState({
      bottles: [
        { id: 0, capacity: 12, layers: [], isTarget: true },
        { id: 1, capacity: 6, layers: ['A'], isTarget: false },
      ],
    });
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    const res = batasBottlesEngine.applyAction(state, {
      type: 'tap_bottle',
      bottleId: 0,
    });
    expect(res.invalidReason).toBeDefined();
    // The source must remain selected so the player can retry.
    expect(res.state.selectedBottleId).toBe(1);
    // No history was added.
    expect(res.state.history).toHaveLength(0);
  });

  it('target bottle accepts target-color pours', () => {
    let state = makeState({
      bottles: [
        { id: 0, capacity: 12, layers: [], isTarget: true },
        { id: 1, capacity: 6, layers: ['A', 'T', 'T'], isTarget: false },
      ],
    });
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    const res = batasBottlesEngine.applyAction(state, {
      type: 'tap_bottle',
      bottleId: 0,
    });
    expect(res.invalidReason).toBeUndefined();
    const big = res.state.bottles.find(b => b.id === 0)!;
    expect(big.layers).toEqual(['T', 'T']);
  });
});

// ============================================================================
// Engine — win condition
// ============================================================================

describe('win condition', () => {
  it('isWonState recognises a full target bottle', () => {
    const bottles: Bottle[] = [
      { id: 0, capacity: 12, layers: Array(12).fill('T'), isTarget: true },
      { id: 1, capacity: 6, layers: [], isTarget: false },
    ];
    expect(isWonState(bottles, 'T')).toBe(true);
  });

  it('isWonState rejects a partially full target', () => {
    const bottles: Bottle[] = [
      { id: 0, capacity: 12, layers: Array(11).fill('T'), isTarget: true },
    ];
    expect(isWonState(bottles, 'T')).toBe(false);
  });

  it('isWonState rejects a full target with wrong colors', () => {
    const bottles: Bottle[] = [
      { id: 0, capacity: 12, layers: [...Array(11).fill('T'), 'X'], isTarget: true },
    ];
    expect(isWonState(bottles, 'T')).toBe(false);
  });

  it('completing a pour that fills the big bottle transitions status to won', () => {
    const big: Bottle = { id: 0, capacity: 12, layers: Array(9).fill('T'), isTarget: true };
    const src: Bottle = { id: 1, capacity: 6, layers: ['T', 'T', 'T'], isTarget: false };
    let state: BatasBottlesState = {
      status: 'playing',
      startedAtMs: 0,
      endedAtMs: null,
      bottles: [big, src],
      targetColor: 'T',
      palette: ['T'],
      selectedBottleId: null,
      moveCount: 0,
      history: [],
      ...TEST_LEVEL_FIELDS,
    };
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    const res = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 0 });
    expect(res.state.status).toBe('won');
    expect(res.state.endedAtMs).not.toBeNull();
    expect(batasBottlesEngine.isTerminal(res.state)).toBe(true);
    expect(res.events.some(e => e.type === 'game_ended')).toBe(true);
  });

  it('rejects actions once the game is finished', () => {
    const big: Bottle = {
      id: 0,
      capacity: 12,
      layers: Array(12).fill('T'),
      isTarget: true,
    };
    const won: BatasBottlesState = {
      status: 'won',
      startedAtMs: 0,
      endedAtMs: 100,
      bottles: [big, { id: 1, capacity: 6, layers: [], isTarget: false }],
      targetColor: 'T',
      palette: ['T'],
      selectedBottleId: null,
      moveCount: 1,
      history: [],
      ...TEST_LEVEL_FIELDS,
    };
    const res = batasBottlesEngine.applyAction(won, {
      type: 'tap_bottle',
      bottleId: 1,
    });
    expect(res.invalidReason).toContain('already finished');
  });
});

// ============================================================================
// Engine — undo / restart
// ============================================================================

describe('undo and restart', () => {
  function makeCleanState(): BatasBottlesState {
    return {
      status: 'playing',
      startedAtMs: 0,
      endedAtMs: null,
      bottles: [
        { id: 0, capacity: 12, layers: [], isTarget: true },
        { id: 1, capacity: 6, layers: ['A', 'B', 'T'], isTarget: false },
        { id: 2, capacity: 6, layers: [], isTarget: false },
        { id: 3, capacity: 6, layers: [], isTarget: false },
      ],
      targetColor: 'T',
      palette: ['T', 'A', 'B'],
      selectedBottleId: null,
      moveCount: 0,
      history: [],
      ...TEST_LEVEL_FIELDS,
    };
  }

  it('undo with empty history is rejected', () => {
    const state = makeCleanState();
    const res = batasBottlesEngine.applyAction(state, { type: 'undo' });
    expect(res.invalidReason).toBeDefined();
  });

  it('undo reverts bottles to the pre-pour snapshot', () => {
    let state = makeCleanState();
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 2 }).state;
    expect(state.bottles.find(b => b.id === 2)!.layers).toEqual(['T']);

    const undone = batasBottlesEngine.applyAction(state, { type: 'undo' });
    const b1 = undone.state.bottles.find(b => b.id === 1)!;
    const b2 = undone.state.bottles.find(b => b.id === 2)!;
    expect(b1.layers).toEqual(['A', 'B', 'T']);
    expect(b2.layers).toEqual([]);
    expect(undone.state.history).toHaveLength(0);
    expect(undone.state.selectedBottleId).toBeNull();
  });

  it('restart restores the very first snapshot and resets move count', () => {
    let state = makeCleanState();
    // pour #1: b1 -> b2, moves 'T'
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 2 }).state;
    // pour #2: b1 -> b3, moves 'B'
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    state = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 3 }).state;
    expect(state.moveCount).toBe(2);
    expect(state.bottles.find(b => b.id === 1)!.layers).toEqual(['A']);

    const restarted = batasBottlesEngine.applyAction(state, { type: 'restart' });
    const b1 = restarted.state.bottles.find(b => b.id === 1)!;
    const b2 = restarted.state.bottles.find(b => b.id === 2)!;
    const b3 = restarted.state.bottles.find(b => b.id === 3)!;
    expect(b1.layers).toEqual(['A', 'B', 'T']);
    expect(b2.layers).toEqual([]);
    expect(b3.layers).toEqual([]);
    expect(restarted.state.moveCount).toBe(0);
    expect(restarted.state.history).toEqual([]);
  });
});

// ============================================================================
// Engine — scoring + summary
// ============================================================================

describe('scoring', () => {
  it('returns 0 for non-won states', () => {
    const state = batasBottlesEngine.init('score-playing', easyParams);
    expect(batasBottlesEngine.getScore(state, 0)).toBe(0);
  });

  it('calculateScore returns base + full time bonus for instant perfect win', () => {
    expect(calculateScore(0, 0)).toBe(SCORING.baseScore + SCORING.maxTimeBonus);
  });

  it('calculateScore clamps below zero for extreme inputs', () => {
    expect(calculateScore(10_000, 10_000_000)).toBe(0);
  });

  it('scoring rewards fewer moves', () => {
    expect(calculateScore(2, 1000)).toBeGreaterThan(calculateScore(20, 1000));
  });

  it('scoring rewards faster solves', () => {
    expect(calculateScore(5, 1000)).toBeGreaterThan(calculateScore(5, 200_000));
  });
});

describe('getSummary', () => {
  it('returns forfeit for an in-progress game', () => {
    const state = batasBottlesEngine.init('summary-playing', easyParams);
    const s = batasBottlesEngine.getSummary(state);
    expect(s.outcome).toBe('forfeit');
  });

  it('returns a win summary for a finished game', () => {
    const big: Bottle = { id: 0, capacity: 12, layers: Array(12).fill('T'), isTarget: true };
    const state: BatasBottlesState = {
      status: 'won',
      startedAtMs: 0,
      endedAtMs: 15000,
      bottles: [big],
      targetColor: 'T',
      palette: ['T'],
      selectedBottleId: null,
      moveCount: 7,
      history: [],
      ...TEST_LEVEL_FIELDS,
    };
    const s = batasBottlesEngine.getSummary(state);
    expect(s.outcome).toBe('win');
    expect(s.attemptsUsed).toBe(7);
    expect(s.score).toBeGreaterThan(0);
    expect(s.details).toBeDefined();
    expect((s.details as { level: number }).level).toBe(1);
  });
});

// ============================================================================
// Engine — move limit / loss condition
// ============================================================================

describe('move limit and loss', () => {
  it('running out of moves without winning sets status to lost', () => {
    // Hand-craft a state whose next pour will push moveCount to the limit
    // without winning.
    const state: BatasBottlesState = {
      status: 'playing',
      startedAtMs: 0,
      endedAtMs: null,
      bottles: [
        { id: 0, capacity: 12, layers: [], isTarget: true },
        { id: 1, capacity: 6, layers: ['A'], isTarget: false },
        { id: 2, capacity: 6, layers: [], isTarget: false },
      ],
      targetColor: 'T',
      palette: ['T', 'A'],
      selectedBottleId: null,
      moveCount: 0,
      history: [],
      level: 100,
      moveLimit: 1,
      starThresholds: [1, 2, 3],
    };

    const s = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    const res = batasBottlesEngine.applyAction(s, { type: 'tap_bottle', bottleId: 2 });

    expect(res.state.status).toBe('lost');
    expect(res.state.endedAtMs).not.toBeNull();
    expect(res.events.some(e =>
      e.type === 'game_ended' &&
      (e.payload as { outcome: string }).outcome === 'lost'
    )).toBe(true);
    expect(batasBottlesEngine.isTerminal(res.state)).toBe(true);
  });

  it('a winning pour on the last allowed move still wins, not loses', () => {
    const state: BatasBottlesState = {
      status: 'playing',
      startedAtMs: 0,
      endedAtMs: null,
      bottles: [
        { id: 0, capacity: 2, layers: [], isTarget: true },
        { id: 1, capacity: 6, layers: ['T', 'T'], isTarget: false },
      ],
      targetColor: 'T',
      palette: ['T'],
      selectedBottleId: null,
      moveCount: 0,
      history: [],
      level: 100,
      moveLimit: 1,
      starThresholds: [1, 2, 3],
    };
    const s = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    const res = batasBottlesEngine.applyAction(s, { type: 'tap_bottle', bottleId: 0 });
    expect(res.state.status).toBe('won');
  });

  it('restart resets a terminal state even when history is empty (defensive)', () => {
    // Defensive edge case: a rehydrated-from-storage terminal state with
    // no in-memory history should still be unstickable via restart.
    const big: Bottle = { id: 0, capacity: 2, layers: [], isTarget: true };
    const terminal: BatasBottlesState = {
      status: 'lost',
      startedAtMs: 0,
      endedAtMs: 500,
      bottles: [big, { id: 1, capacity: 6, layers: ['A'], isTarget: false }],
      targetColor: 'T',
      palette: ['T', 'A'],
      selectedBottleId: null,
      moveCount: 5,
      history: [],
      level: 100,
      moveLimit: 5,
      starThresholds: [1, 2, 3],
    };
    const res = batasBottlesEngine.applyAction(terminal, { type: 'restart' });
    expect(res.state.status).toBe('playing');
    expect(res.state.endedAtMs).toBeNull();
    expect(res.state.moveCount).toBe(0);
  });

  it('restart revives a lost run back to playing', () => {
    const state: BatasBottlesState = {
      status: 'playing',
      startedAtMs: 0,
      endedAtMs: null,
      bottles: [
        { id: 0, capacity: 12, layers: [], isTarget: true },
        { id: 1, capacity: 6, layers: ['A'], isTarget: false },
        { id: 2, capacity: 6, layers: [], isTarget: false },
      ],
      targetColor: 'T',
      palette: ['T', 'A'],
      selectedBottleId: null,
      moveCount: 0,
      history: [],
      level: 100,
      moveLimit: 1,
      starThresholds: [1, 2, 3],
    };
    let s = batasBottlesEngine.applyAction(state, { type: 'tap_bottle', bottleId: 1 }).state;
    s = batasBottlesEngine.applyAction(s, { type: 'tap_bottle', bottleId: 2 }).state;
    expect(s.status).toBe('lost');

    const restarted = batasBottlesEngine.applyAction(s, { type: 'restart' });
    expect(restarted.state.status).toBe('playing');
    expect(restarted.state.moveCount).toBe(0);
  });
});

// ============================================================================
// Engine — verify() replay
// ============================================================================

describe('verify', () => {
  it('empty action list yields a forfeit summary', () => {
    const s = batasBottlesEngine.verify('verify-empty', easyParams, []);
    expect(s.outcome).toBe('forfeit');
  });

  it('throws on an invalid replayed action', () => {
    const actions: BatasBottlesAction[] = [
      { type: 'tap_bottle', bottleId: TARGET_BOTTLE_ID }, // cannot select big bottle
    ];
    expect(() =>
      batasBottlesEngine.verify('verify-invalid', easyParams, actions)
    ).toThrow('Invalid action during verification');
  });

  it('replays the action log deterministically and matches state progression', () => {
    // Run a single legal pour in-session, collect the actions, and verify.
    const state = batasBottlesEngine.init('verify-replay', easyParams);
    const sourceBottle = state.bottles.find(b => !b.isTarget && b.layers.length > 0)!;
    const emptyBottle = state.bottles.find(b => !b.isTarget && b.layers.length === 0);
    if (!emptyBottle) return;

    const actions: BatasBottlesAction[] = [
      { type: 'tap_bottle', bottleId: sourceBottle.id },
      { type: 'tap_bottle', bottleId: emptyBottle.id },
    ];
    expect(() =>
      batasBottlesEngine.verify('verify-replay', easyParams, actions)
    ).not.toThrow();
  });
});
