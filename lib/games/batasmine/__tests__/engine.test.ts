import { describe, it, expect } from 'vitest';
import { batasMineEngine, getModeParams } from '../engine';

const tiny = { rows: 6, cols: 6, mines: 4 };

describe('batasMineEngine', () => {
  it('first reveal is never a mine', () => {
    const state = batasMineEngine.init('safe-first', tiny);
    const result = batasMineEngine.applyAction(state, { type: 'reveal', position: 0 });
    expect(result.invalidReason).toBeUndefined();
    expect(result.state.status).not.toBe('lost');
    expect(result.state.minesPlaced).toBe(true);
    expect(result.state.grid[0].hasMine).toBe(false);
    expect(result.state.grid[0].state).toBe('revealed');
  });

  it('recounts flagsPlaced after first reveal rebuilds the grid', () => {
    let state = batasMineEngine.init('flag-wipe-seed', tiny);

    state = batasMineEngine.applyAction(state, { type: 'toggle_flag', position: 0 }).state;
    state = batasMineEngine.applyAction(state, { type: 'toggle_flag', position: 1 }).state;
    expect(state.flagsPlaced).toBe(2);
    expect(state.grid.filter(c => c.state === 'flagged')).toHaveLength(2);

    const reveal = batasMineEngine.applyAction(state, { type: 'reveal', position: 20 });
    expect(reveal.invalidReason).toBeUndefined();
    state = reveal.state;

    const flaggedCount = state.grid.filter(c => c.state === 'flagged').length;
    expect(state.flagsPlaced).toBe(flaggedCount);
    if (state.status !== 'won') {
      expect(state.flagsPlaced).toBe(0);
    }
  });

  it('easy mode first click + pre-flags does not leave a stale mine counter', () => {
    const params = getModeParams('easy');
    let state = batasMineEngine.init('easy-flag-wipe', params);
    state = batasMineEngine.applyAction(state, { type: 'toggle_flag', position: 5 }).state;
    expect(state.flagsPlaced).toBe(1);

    const reveal = batasMineEngine.applyAction(state, { type: 'reveal', position: 0 });
    expect(reveal.invalidReason).toBeUndefined();
    expect(reveal.state.flagsPlaced).toBe(
      reveal.state.grid.filter(c => c.state === 'flagged').length
    );
  });
});
