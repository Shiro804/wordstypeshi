import { describe, it, expect } from 'vitest';
import { 
  computeFeedback, 
  mastermindEngine, 
  getModeParams,
  type MastermindParams,
  type MastermindAction 
} from '../engine';

describe('computeFeedback', () => {
  // Test cases from the prompt requirements
  
  it('Secret: [1,1,2,2], Guess: [1,2,1,2] => black=2, white=2', () => {
    const feedback = computeFeedback([1, 2, 1, 2], [1, 1, 2, 2]);
    expect(feedback.black).toBe(2);
    expect(feedback.white).toBe(2);
  });

  it('Secret: [1,2,3,4], Guess: [4,3,2,1] => black=0, white=4', () => {
    const feedback = computeFeedback([4, 3, 2, 1], [1, 2, 3, 4]);
    expect(feedback.black).toBe(0);
    expect(feedback.white).toBe(4);
  });

  it('Secret: [1,1,1,1], Guess: [1,2,1,2] => black=2, white=0', () => {
    const feedback = computeFeedback([1, 2, 1, 2], [1, 1, 1, 1]);
    expect(feedback.black).toBe(2);
    expect(feedback.white).toBe(0);
  });

  it('Secret: [1,2,2,3], Guess: [2,2,2,2] => black=2, white=0', () => {
    const feedback = computeFeedback([2, 2, 2, 2], [1, 2, 2, 3]);
    expect(feedback.black).toBe(2);
    expect(feedback.white).toBe(0);
  });

  // Additional edge cases
  
  it('handles all correct (win condition)', () => {
    const feedback = computeFeedback([1, 2, 3, 4], [1, 2, 3, 4]);
    expect(feedback.black).toBe(4);
    expect(feedback.white).toBe(0);
  });

  it('handles all wrong (no matches)', () => {
    const feedback = computeFeedback([1, 2, 3, 4], [5, 5, 5, 5]);
    expect(feedback.black).toBe(0);
    expect(feedback.white).toBe(0);
  });

  it('handles single color secret with mixed guess', () => {
    const feedback = computeFeedback([1, 1, 2, 2], [1, 1, 1, 1]);
    expect(feedback.black).toBe(2);
    expect(feedback.white).toBe(0);
  });

  it('handles complex duplicate scenario', () => {
    // Secret: [0,0,1,1], Guess: [0,1,0,1]
    // Position 0: 0 == 0 -> black
    // Position 1: 1 != 0 -> remaining secret has 0, guess has 1
    // Position 2: 0 != 1 -> remaining secret has 1, guess has 0
    // Position 3: 1 == 1 -> black
    // After black: secret remaining [0,1], guess remaining [1,0]
    // White: 1 matches 1 (1 time), 0 matches 0 (1 time) = 2
    const feedback = computeFeedback([0, 1, 0, 1], [0, 0, 1, 1]);
    expect(feedback.black).toBe(2);
    expect(feedback.white).toBe(2);
  });
});

describe('mastermindEngine', () => {
  const defaultParams: MastermindParams = {
    codeLength: 4,
    numColors: 6,
    maxAttempts: 10,
    allowDuplicates: true,
  };

  describe('init', () => {
    it('creates initial state with playing status', () => {
      const state = mastermindEngine.init('test-seed', defaultParams);
      expect(state.status).toBe('playing');
      expect(state.attempts).toHaveLength(0);
      expect(state.currentAttempt).toBe(0);
    });

    it('generates secret of correct length', () => {
      const state = mastermindEngine.init('test-seed', defaultParams);
      expect(state.secret).toHaveLength(4);
    });

    it('generates secret with valid colors', () => {
      const state = mastermindEngine.init('test-seed', defaultParams);
      for (const color of state.secret) {
        expect(color).toBeGreaterThanOrEqual(0);
        expect(color).toBeLessThan(6);
      }
    });

    it('generates same secret for same seed', () => {
      const state1 = mastermindEngine.init('deterministic-seed', defaultParams);
      const state2 = mastermindEngine.init('deterministic-seed', defaultParams);
      expect(state1.secret).toEqual(state2.secret);
    });

    it('generates different secret for different seed', () => {
      const state1 = mastermindEngine.init('seed-1', defaultParams);
      const state2 = mastermindEngine.init('seed-2', defaultParams);
      // Note: Could theoretically be the same by chance, but very unlikely
      expect(state1.secret).not.toEqual(state2.secret);
    });
  });

  describe('applyAction', () => {
    it('accepts valid guess', () => {
      const state = mastermindEngine.init('test-seed', defaultParams);
      const action: MastermindAction = { type: 'submit_guess', guess: [0, 1, 2, 3] };
      const result = mastermindEngine.applyAction(state, action);
      
      expect(result.invalidReason).toBeUndefined();
      expect(result.state.attempts).toHaveLength(1);
      expect(result.state.currentAttempt).toBe(1);
    });

    it('rejects guess with wrong length', () => {
      const state = mastermindEngine.init('test-seed', defaultParams);
      const action: MastermindAction = { type: 'submit_guess', guess: [0, 1, 2] };
      const result = mastermindEngine.applyAction(state, action);
      
      expect(result.invalidReason).toContain('exactly 4 colors');
      expect(result.state.attempts).toHaveLength(0);
    });

    it('rejects guess with invalid color', () => {
      const state = mastermindEngine.init('test-seed', defaultParams);
      const action: MastermindAction = { type: 'submit_guess', guess: [0, 1, 2, 99] };
      const result = mastermindEngine.applyAction(state, action);
      
      expect(result.invalidReason).toContain('Invalid color');
    });

    it('detects win condition', () => {
      const state = mastermindEngine.init('test-seed', defaultParams);
      const action: MastermindAction = { type: 'submit_guess', guess: state.secret };
      const result = mastermindEngine.applyAction(state, action);
      
      expect(result.state.status).toBe('won');
      expect(result.state.endedAtMs).not.toBeNull();
    });

    it('detects lose condition after max attempts', () => {
      let state = mastermindEngine.init('test-seed', { ...defaultParams, maxAttempts: 2 });
      // Make wrong guesses
      const wrongGuess = state.secret.map(c => (c + 1) % 6);
      
      for (let i = 0; i < 2; i++) {
        const result = mastermindEngine.applyAction(state, { type: 'submit_guess', guess: wrongGuess });
        state = result.state;
      }
      
      expect(state.status).toBe('lost');
    });

    it('rejects action when game is over', () => {
      const state = mastermindEngine.init('test-seed', defaultParams);
      const winResult = mastermindEngine.applyAction(state, { 
        type: 'submit_guess', 
        guess: state.secret 
      });
      
      const afterWinResult = mastermindEngine.applyAction(winResult.state, { 
        type: 'submit_guess', 
        guess: [0, 0, 0, 0] 
      });
      
      expect(afterWinResult.invalidReason).toContain('already finished');
    });
  });

  describe('verification', () => {
    it('replays actions and produces same result', () => {
      const seed = 'verification-test';
      const state = mastermindEngine.init(seed, defaultParams);
      
      const actions: MastermindAction[] = [
        { type: 'submit_guess', guess: [0, 1, 2, 3] },
        { type: 'submit_guess', guess: [3, 2, 1, 0] },
        { type: 'submit_guess', guess: state.secret }, // Win
      ];
      
      const summary = mastermindEngine.verify(seed, defaultParams, actions);
      expect(summary.outcome).toBe('win');
      expect(summary.attemptsUsed).toBe(3);
    });

    it('throws on invalid action during verification', () => {
      const seed = 'verification-test';
      const actions: MastermindAction[] = [
        { type: 'submit_guess', guess: [0, 1, 2] }, // Wrong length
      ];
      
      expect(() => mastermindEngine.verify(seed, defaultParams, actions)).toThrow();
    });
  });

  describe('getModeParams', () => {
    it('returns correct params for classic_4x6', () => {
      const params = getModeParams('classic_4x6');
      expect(params.codeLength).toBe(4);
      expect(params.numColors).toBe(6);
      expect(params.maxAttempts).toBe(10);
    });

    it('returns correct params for classic_4x8', () => {
      const params = getModeParams('classic_4x8');
      expect(params.numColors).toBe(8);
    });
  });
});
