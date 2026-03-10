import { describe, it, expect } from 'vitest';
import {
  batasPairsEngine,
  getModeParams,
  type BatasPairsParams,
  type BatasPairsAction,
  type BatasPairsState,
} from '../engine';
import { calculateScore, CARD_ICONS, SCORING } from '../ruleset';

const easyParams = getModeParams('easy');
const mediumParams = getModeParams('medium');
const hardParams = getModeParams('hard');

describe('batasPairsEngine', () => {
  describe('init', () => {
    it('creates initial state with playing status', () => {
      const state = batasPairsEngine.init('test-seed', easyParams);
      expect(state.status).toBe('playing');
      expect(state.flipped).toHaveLength(0);
      expect(state.matchesFound).toBe(0);
      expect(state.totalFlips).toBe(0);
      expect(state.mismatches).toBe(0);
      expect(state.isChecking).toBe(false);
      expect(state.endedAtMs).toBeNull();
    });

    it('generates correct grid size for easy mode (3x4 = 12 cards, 6 pairs)', () => {
      const state = batasPairsEngine.init('test-seed', easyParams);
      expect(state.grid).toHaveLength(12);
      expect(state.config.rows).toBe(3);
      expect(state.config.cols).toBe(4);
      expect(state.config.numPairs).toBe(6);
    });

    it('generates correct grid size for medium mode (4x4 = 16 cards, 8 pairs)', () => {
      const state = batasPairsEngine.init('test-seed', mediumParams);
      expect(state.grid).toHaveLength(16);
      expect(state.config.numPairs).toBe(8);
    });

    it('generates correct grid size for hard mode (4x5 = 20 cards, 10 pairs)', () => {
      const state = batasPairsEngine.init('test-seed', hardParams);
      expect(state.grid).toHaveLength(20);
      expect(state.config.numPairs).toBe(10);
    });

    it('generates correct number of pairs in the grid', () => {
      for (const params of [easyParams, mediumParams, hardParams]) {
        const state = batasPairsEngine.init('pair-test', params);
        const iconCounts = new Map<number, number>();
        for (const card of state.grid) {
          iconCounts.set(card.iconIndex, (iconCounts.get(card.iconIndex) || 0) + 1);
        }
        // Each icon should appear exactly twice
        for (const [, count] of iconCounts) {
          expect(count).toBe(2);
        }
        expect(iconCounts.size).toBe(params.numPairs);
      }
    });

    it('all cards start hidden', () => {
      const state = batasPairsEngine.init('test-seed', easyParams);
      for (const card of state.grid) {
        expect(card.status).toBe('hidden');
      }
    });

    it('uses valid icon indices', () => {
      const state = batasPairsEngine.init('test-seed', hardParams);
      for (const card of state.grid) {
        expect(card.iconIndex).toBeGreaterThanOrEqual(0);
        expect(card.iconIndex).toBeLessThan(CARD_ICONS.length);
      }
    });

    it('generates same grid for same seed (deterministic)', () => {
      const state1 = batasPairsEngine.init('deterministic', easyParams);
      const state2 = batasPairsEngine.init('deterministic', easyParams);
      expect(state1.grid.map(c => c.iconIndex)).toEqual(state2.grid.map(c => c.iconIndex));
    });

    it('generates different grid for different seed', () => {
      const state1 = batasPairsEngine.init('seed-a', easyParams);
      const state2 = batasPairsEngine.init('seed-b', easyParams);
      expect(state1.grid.map(c => c.iconIndex)).not.toEqual(state2.grid.map(c => c.iconIndex));
    });
  });

  describe('flip_card - first card', () => {
    it('reveals the card and records the flip', () => {
      const state = batasPairsEngine.init('test-seed', easyParams);
      const result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: 0 });

      expect(result.invalidReason).toBeUndefined();
      expect(result.state.grid[0].status).toBe('revealed');
      expect(result.state.flipped).toEqual([0]);
      expect(result.state.totalFlips).toBe(1);
      expect(result.state.isChecking).toBe(false);
    });

    it('emits card_flipped event', () => {
      const state = batasPairsEngine.init('test-seed', easyParams);
      const result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: 0 });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('card_flipped');
      expect(result.events[0].payload.position).toBe(0);
    });
  });

  describe('flip_card - second card match', () => {
    it('marks both cards as matched when icons match', () => {
      const state = batasPairsEngine.init('match-test', easyParams);
      // Find a pair
      const { first, second } = findPair(state);

      let result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: first });
      result = batasPairsEngine.applyAction(result.state, { type: 'flip_card', position: second });

      expect(result.state.grid[first].status).toBe('matched');
      expect(result.state.grid[second].status).toBe('matched');
      expect(result.state.matchesFound).toBe(1);
      expect(result.state.flipped).toEqual([]);
      expect(result.state.isChecking).toBe(false);
      expect(result.state.mismatches).toBe(0);
    });

    it('emits card_flipped and pair_matched events', () => {
      const state = batasPairsEngine.init('match-test', easyParams);
      const { first, second } = findPair(state);

      let result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: first });
      result = batasPairsEngine.applyAction(result.state, { type: 'flip_card', position: second });

      expect(result.events.some(e => e.type === 'card_flipped')).toBe(true);
      expect(result.events.some(e => e.type === 'pair_matched')).toBe(true);
    });
  });

  describe('flip_card - second card mismatch', () => {
    it('enters checking state on mismatch', () => {
      const state = batasPairsEngine.init('mismatch-test', easyParams);
      const { first, second } = findMismatch(state);

      let result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: first });
      result = batasPairsEngine.applyAction(result.state, { type: 'flip_card', position: second });

      expect(result.state.isChecking).toBe(true);
      expect(result.state.mismatches).toBe(1);
      expect(result.state.grid[first].status).toBe('revealed');
      expect(result.state.grid[second].status).toBe('revealed');
      expect(result.state.flipped).toEqual([first, second]);
    });

    it('emits pair_mismatched event', () => {
      const state = batasPairsEngine.init('mismatch-test', easyParams);
      const { first, second } = findMismatch(state);

      let result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: first });
      result = batasPairsEngine.applyAction(result.state, { type: 'flip_card', position: second });

      expect(result.events.some(e => e.type === 'pair_mismatched')).toBe(true);
    });
  });

  describe('resolve_check', () => {
    it('hides mismatched cards and clears checking state', () => {
      const state = batasPairsEngine.init('resolve-test', easyParams);
      const { first, second } = findMismatch(state);

      let result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: first });
      result = batasPairsEngine.applyAction(result.state, { type: 'flip_card', position: second });
      result = batasPairsEngine.applyAction(result.state, { type: 'resolve_check' });

      expect(result.state.grid[first].status).toBe('hidden');
      expect(result.state.grid[second].status).toBe('hidden');
      expect(result.state.isChecking).toBe(false);
      expect(result.state.flipped).toEqual([]);
    });

    it('emits cards_hidden event', () => {
      const state = batasPairsEngine.init('resolve-test', easyParams);
      const { first, second } = findMismatch(state);

      let result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: first });
      result = batasPairsEngine.applyAction(result.state, { type: 'flip_card', position: second });
      result = batasPairsEngine.applyAction(result.state, { type: 'resolve_check' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('cards_hidden');
    });

    it('rejects resolve_check when not in checking state', () => {
      const state = batasPairsEngine.init('test-seed', easyParams);
      const result = batasPairsEngine.applyAction(state, { type: 'resolve_check' });

      expect(result.invalidReason).toContain('Not in checking state');
    });
  });

  describe('validation', () => {
    it('rejects flip with invalid position (negative)', () => {
      const state = batasPairsEngine.init('test-seed', easyParams);
      const result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: -1 });
      expect(result.invalidReason).toContain('Invalid position');
    });

    it('rejects flip with invalid position (out of bounds)', () => {
      const state = batasPairsEngine.init('test-seed', easyParams);
      const result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: 99 });
      expect(result.invalidReason).toContain('Invalid position');
    });

    it('rejects flip without position', () => {
      const state = batasPairsEngine.init('test-seed', easyParams);
      const result = batasPairsEngine.applyAction(state, { type: 'flip_card' });
      expect(result.invalidReason).toContain('Position is required');
    });

    it('rejects flip on already revealed card', () => {
      const state = batasPairsEngine.init('test-seed', easyParams);
      const result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: 0 });
      const result2 = batasPairsEngine.applyAction(result.state, { type: 'flip_card', position: 0 });
      expect(result2.invalidReason).toContain('already revealed or matched');
    });

    it('rejects flip on matched card', () => {
      const state = batasPairsEngine.init('matched-test', easyParams);
      const { first, second } = findPair(state);

      let result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: first });
      result = batasPairsEngine.applyAction(result.state, { type: 'flip_card', position: second });
      // Cards are now matched, try flipping one
      const result2 = batasPairsEngine.applyAction(result.state, { type: 'flip_card', position: first });
      expect(result2.invalidReason).toContain('already revealed or matched');
    });

    it('rejects flip during checking state', () => {
      const state = batasPairsEngine.init('check-test', easyParams);
      const { first, second } = findMismatch(state);

      let result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: first });
      result = batasPairsEngine.applyAction(result.state, { type: 'flip_card', position: second });
      // Now in checking state
      const result2 = batasPairsEngine.applyAction(result.state, { type: 'flip_card', position: 3 });
      expect(result2.invalidReason).toContain('Resolve current check first');
    });

    it('rejects action when game is finished', () => {
      const state = playFullGame('finished-test', easyParams);
      expect(state.status).toBe('won');

      const result = batasPairsEngine.applyAction(state, { type: 'flip_card', position: 0 });
      expect(result.invalidReason).toContain('already finished');
    });
  });

  describe('full game to win', () => {
    it('wins when all pairs are matched', () => {
      const state = playFullGame('full-game', easyParams);

      expect(state.status).toBe('won');
      expect(state.matchesFound).toBe(easyParams.numPairs);
      expect(state.endedAtMs).not.toBeNull();
      // All cards should be matched
      for (const card of state.grid) {
        expect(card.status).toBe('matched');
      }
    });

    it('works for all modes', () => {
      for (const params of [easyParams, mediumParams, hardParams]) {
        const state = playFullGame('mode-test', params);
        expect(state.status).toBe('won');
        expect(state.matchesFound).toBe(params.numPairs);
      }
    });
  });

  describe('isTerminal', () => {
    it('returns false for playing state', () => {
      const state = batasPairsEngine.init('test-seed', easyParams);
      expect(batasPairsEngine.isTerminal(state)).toBe(false);
    });

    it('returns true for won state', () => {
      const state = playFullGame('terminal-test', easyParams);
      expect(batasPairsEngine.isTerminal(state)).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('returns win outcome for completed game', () => {
      const state = playFullGame('summary-test', easyParams);
      const summary = batasPairsEngine.getSummary(state);

      expect(summary.outcome).toBe('win');
      expect(summary.attemptsUsed).toBe(state.totalFlips);
      expect(summary.details.matchesFound).toBe(easyParams.numPairs);
      expect(summary.details.mismatches).toBe(state.mismatches);
      expect(summary.details.totalFlips).toBe(state.totalFlips);
    });

    it('returns forfeit outcome for in-progress game', () => {
      const state = batasPairsEngine.init('forfeit-test', easyParams);
      const summary = batasPairsEngine.getSummary(state);
      expect(summary.outcome).toBe('forfeit');
    });
  });

  describe('verify', () => {
    it('replays actions and produces correct summary', () => {
      const seed = 'verify-test';
      const state = batasPairsEngine.init(seed, easyParams);
      const actions = buildWinActions(state);

      const summary = batasPairsEngine.verify(seed, easyParams, actions);
      expect(summary.outcome).toBe('win');
      expect(summary.details.matchesFound).toBe(easyParams.numPairs);
    });

    it('throws on invalid action during verification', () => {
      const actions: BatasPairsAction[] = [
        { type: 'flip_card', position: 99 },
      ];
      expect(() => batasPairsEngine.verify('test', easyParams, actions)).toThrow(
        'Invalid action during verification'
      );
    });

    it('throws on duplicate flip during verification', () => {
      const actions: BatasPairsAction[] = [
        { type: 'flip_card', position: 0 },
        { type: 'flip_card', position: 0 }, // same card
      ];
      expect(() => batasPairsEngine.verify('test', easyParams, actions)).toThrow();
    });
  });

  describe('getModeParams', () => {
    it('returns correct params for easy', () => {
      const params = getModeParams('easy');
      expect(params.rows).toBe(3);
      expect(params.cols).toBe(4);
      expect(params.numPairs).toBe(6);
    });

    it('returns correct params for medium', () => {
      const params = getModeParams('medium');
      expect(params.rows).toBe(4);
      expect(params.cols).toBe(4);
      expect(params.numPairs).toBe(8);
    });

    it('returns correct params for hard', () => {
      const params = getModeParams('hard');
      expect(params.rows).toBe(4);
      expect(params.cols).toBe(5);
      expect(params.numPairs).toBe(10);
    });
  });
});

describe('calculateScore', () => {
  it('returns base score + max time bonus for perfect game at 0ms', () => {
    const score = calculateScore(0, 0);
    expect(score).toBe(SCORING.baseScore + SCORING.maxTimeBonus);
  });

  it('deducts mismatch penalty', () => {
    const score = calculateScore(5, 0);
    expect(score).toBe(SCORING.baseScore - 5 * SCORING.mismatchPenalty + SCORING.maxTimeBonus);
  });

  it('base score does not go below 0', () => {
    // 1000 / 20 = 50 mismatches to zero out base, use more
    const score = calculateScore(100, 0);
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

  it('returns 0 for worst case (many mismatches + slow)', () => {
    const score = calculateScore(100, SCORING.maxTimeBonusMs);
    expect(score).toBe(0);
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

/** Find a matching pair of card positions in the grid. */
function findPair(state: BatasPairsState): { first: number; second: number } {
  for (let i = 0; i < state.grid.length; i++) {
    for (let j = i + 1; j < state.grid.length; j++) {
      if (state.grid[i].iconIndex === state.grid[j].iconIndex) {
        return { first: i, second: j };
      }
    }
  }
  throw new Error('No pair found');
}

/** Find two cards that do NOT match. */
function findMismatch(state: BatasPairsState): { first: number; second: number } {
  for (let i = 0; i < state.grid.length; i++) {
    for (let j = i + 1; j < state.grid.length; j++) {
      if (state.grid[i].iconIndex !== state.grid[j].iconIndex) {
        return { first: i, second: j };
      }
    }
  }
  throw new Error('No mismatch found');
}

/** Build the sequence of actions to win (match all pairs in order). */
function buildWinActions(state: BatasPairsState): BatasPairsAction[] {
  const actions: BatasPairsAction[] = [];
  const matched = new Set<number>();

  for (let i = 0; i < state.grid.length; i++) {
    if (matched.has(i)) continue;
    for (let j = i + 1; j < state.grid.length; j++) {
      if (matched.has(j)) continue;
      if (state.grid[i].iconIndex === state.grid[j].iconIndex) {
        actions.push({ type: 'flip_card', position: i });
        actions.push({ type: 'flip_card', position: j });
        matched.add(i);
        matched.add(j);
        break;
      }
    }
  }

  return actions;
}

/** Play a full game to completion (win) by matching all pairs. */
function playFullGame(seed: string, params: BatasPairsParams): BatasPairsState {
  let state = batasPairsEngine.init(seed, params);
  const actions = buildWinActions(state);

  for (const action of actions) {
    const result = batasPairsEngine.applyAction(state, action);
    if (result.invalidReason) {
      throw new Error(`Unexpected invalid action: ${result.invalidReason}`);
    }
    state = result.state;
  }

  return state;
}
