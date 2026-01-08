
import { describe, it, expect } from 'vitest';
import { batasBlastEngine, type BatasBlastState, type BatasBlastAction } from '../engine';
import { PIECE_CATALOG } from '../ruleset';

describe('BatasBlast Engine Migration', () => {
  it('should handle legacy state without colorBoard gracefully', () => {
    // 1. Create a "legacy" state (simulated by omitting colorBoard)
    const legacyState: any = batasBlastEngine.init('test-seed', { mode: 'classic_endless' });
    delete legacyState.colorBoard; // Simulate old save

    // Verify it is missing
    expect(legacyState.colorBoard).toBeUndefined();

    // 2. Perform an action
    const piece = PIECE_CATALOG[0]; // Dot
    // Ensure we can place it at 0,0
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
});
