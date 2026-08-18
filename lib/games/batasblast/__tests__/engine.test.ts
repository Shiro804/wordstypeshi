
import { describe, it, expect } from 'vitest';
import { batasBlastEngine, ensureColorBoard, type BatasBlastAction } from '../engine';

describe('BatasBlast Engine Migration', () => {
  it('should handle legacy state without colorBoard gracefully', () => {
    // 1. Create a "legacy" state (simulated by omitting colorBoard)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacyState: any = batasBlastEngine.init('test-seed', { mode: 'classic_endless' });
    delete legacyState.colorBoard; // Simulate old save

    // Verify it is missing
    expect(legacyState.colorBoard).toBeUndefined();

    // 2. Perform an action
    const action: BatasBlastAction = {
      type: 'place',
      trayIndex: 0,
      origin: { r: 0, c: 0 },
    };

    // 3. Apply action - should NOT crash
    const result = batasBlastEngine.applyAction(legacyState, action);

    // 4. Verify result
    expect(result.invalidReason).toBeUndefined();
    expect(result.state).toBeDefined();
    
    // 5. Verify successful migration: new state should HAVE colorBoard
    expect(result.state.colorBoard).toBeDefined();
    expect(result.state.colorBoard[0][0]).toBe(0); // Should have color of trayIndex 0
  });

  it('should backfill colorBoard from occupied board cells', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(false));
    board[2][3] = true;
    board[2][4] = true;

    const missing = ensureColorBoard(board, undefined);
    expect(missing[2][3]).toBe(0);
    expect(missing[2][4]).toBe(0);
    expect(missing[0][0]).toBe(-1);

    const blank = Array.from({ length: 8 }, () => Array(8).fill(-1));
    const filled = ensureColorBoard(board, blank);
    expect(filled[2][3]).toBe(0);
    expect(filled[2][4]).toBe(0);
  });

  it('should backfill on apply when colorBoard is all -1', () => {
    const state = batasBlastEngine.init('test-seed', { mode: 'classic_endless' });
    state.board[5][5] = true;
    state.colorBoard = Array.from({ length: 8 }, () => Array(8).fill(-1));

    const result = batasBlastEngine.applyAction(state, {
      type: 'place',
      trayIndex: 0,
      origin: { r: 0, c: 0 },
    });

    expect(result.invalidReason).toBeUndefined();
    expect(result.state.colorBoard[5][5]).toBe(0);
  });
});
