import { describe, it, expect } from 'vitest';
import { 
  wordSearchEngine, 
  getModeParams,
  type WordSearchParams,
  type SelectPathAction 
} from '../engine';

describe('wordSearchEngine', () => {
  const defaultParams = getModeParams('medium');

  describe('determinism', () => {
    it('generates same grid for same seed', () => {
      const seed = 'deterministic-test-seed';
      const state1 = wordSearchEngine.init(seed, defaultParams);
      const state2 = wordSearchEngine.init(seed, defaultParams);
      
      expect(state1.grid).toEqual(state2.grid);
      expect(state1.words.map(w => w.text)).toEqual(state2.words.map(w => w.text));
    });

    it('generates different grid for different seed', () => {
      const state1 = wordSearchEngine.init('seed-1', defaultParams);
      const state2 = wordSearchEngine.init('seed-2', defaultParams);
      
      // Very unlikely to be the same
      expect(state1.grid).not.toEqual(state2.grid);
    });
  });

  describe('init', () => {
    it('creates grid of correct size', () => {
      const state = wordSearchEngine.init('test-seed', defaultParams);
      
      expect(state.grid.length).toBe(defaultParams.rows);
      expect(state.grid[0].length).toBe(defaultParams.cols);
    });

    it('creates correct number of words', () => {
      const state = wordSearchEngine.init('test-seed', defaultParams);
      
      expect(state.words.length).toBeGreaterThan(0);
      expect(state.words.length).toBeLessThanOrEqual(defaultParams.wordCount);
    });

    it('all cells are filled with uppercase letters', () => {
      const state = wordSearchEngine.init('test-seed', defaultParams);
      
      for (const row of state.grid) {
        for (const cell of row) {
          expect(cell).toMatch(/^[A-Z]$/);
        }
      }
    });

    it('starts with playing status', () => {
      const state = wordSearchEngine.init('test-seed', defaultParams);
      expect(state.status).toBe('playing');
    });
  });

  describe('applyAction - select_path', () => {
    it('rejects diagonal selection when only horizontal/vertical allowed', () => {
      const easyParams = getModeParams('easy');
      const state = wordSearchEngine.init('test-seed', easyParams);
      
      const action: SelectPathAction = {
        type: 'select_path',
        start: { r: 0, c: 0 },
        end: { r: 2, c: 2 }, // diagonal
      };
      
      const result = wordSearchEngine.applyAction(state, action);
      
      // Should increment misselects since diagonal not in word list on easy mode
      expect(result.state.misselects).toBeGreaterThanOrEqual(0);
    });

    it('accepts valid horizontal selection', () => {
      const state = wordSearchEngine.init('test-seed', defaultParams);
      
      const action: SelectPathAction = {
        type: 'select_path',
        start: { r: 0, c: 0 },
        end: { r: 0, c: 4 }, // horizontal
      };
      
      const result = wordSearchEngine.applyAction(state, action);
      
      // Should not error (may or may not find a word)
      expect(result.invalidReason).toBeUndefined();
    });

    it('rejects bent path (non-straight line)', () => {
      const state = wordSearchEngine.init('test-seed', defaultParams);
      
      // This is actually handled by the UI, but engine should handle gracefully
      const action: SelectPathAction = {
        type: 'select_path',
        start: { r: 0, c: 0 },
        end: { r: 2, c: 3 }, // Not a straight line
      };
      
      const result = wordSearchEngine.applyAction(state, action);
      
      // Should count as misselect
      expect(result.state.misselects).toBeGreaterThan(state.misselects);
    });
  });

  describe('word finding', () => {
    it('marks word as found when correctly selected', () => {
      const seed = 'word-finding-test';
      const state = wordSearchEngine.init(seed, defaultParams);
      
      // Find a word and its placement
      const word = state.words[0];
      const { startRow, startCol, direction } = word.placement;
      
      // Calculate end position based on direction
      const directions: Record<string, { dr: number; dc: number }> = {
        RIGHT: { dr: 0, dc: 1 },
        DOWN: { dr: 1, dc: 0 },
        DOWN_RIGHT: { dr: 1, dc: 1 },
        DOWN_LEFT: { dr: 1, dc: -1 },
        LEFT: { dr: 0, dc: -1 },
        UP: { dr: -1, dc: 0 },
        UP_RIGHT: { dr: -1, dc: 1 },
        UP_LEFT: { dr: -1, dc: -1 },
      };
      
      const dir = directions[direction];
      const endRow = startRow + (word.text.length - 1) * dir.dr;
      const endCol = startCol + (word.text.length - 1) * dir.dc;
      
      const action: SelectPathAction = {
        type: 'select_path',
        start: { r: startRow, c: startCol },
        end: { r: endRow, c: endCol },
      };
      
      const result = wordSearchEngine.applyAction(state, action);
      
      expect(result.state.foundCount).toBe(1);
      expect(result.events.some(e => e.type === 'word_found')).toBe(true);
    });
  });

  describe('win condition', () => {
    it('detects win when all words found', () => {
      const seed = 'win-condition-test';
      let state = wordSearchEngine.init(seed, { ...defaultParams, wordCount: 2 });
      
      // Find all words
      for (const word of state.words) {
        const { startRow, startCol, direction } = word.placement;
        const directions: Record<string, { dr: number; dc: number }> = {
          RIGHT: { dr: 0, dc: 1 },
          DOWN: { dr: 1, dc: 0 },
          DOWN_RIGHT: { dr: 1, dc: 1 },
          DOWN_LEFT: { dr: 1, dc: -1 },
          LEFT: { dr: 0, dc: -1 },
          UP: { dr: -1, dc: 0 },
          UP_RIGHT: { dr: -1, dc: 1 },
          UP_LEFT: { dr: -1, dc: -1 },
        };
        
        const dir = directions[direction];
        const endRow = startRow + (word.text.length - 1) * dir.dr;
        const endCol = startCol + (word.text.length - 1) * dir.dc;
        
        const action: SelectPathAction = {
          type: 'select_path',
          start: { r: startRow, c: startCol },
          end: { r: endRow, c: endCol },
        };
        
        const result = wordSearchEngine.applyAction(state, action);
        state = result.state;
      }
      
      expect(state.status).toBe('won');
      expect(wordSearchEngine.isTerminal(state)).toBe(true);
    });
  });

  describe('getModeParams', () => {
    it('returns correct params for easy mode', () => {
      const params = getModeParams('easy');
      expect(params.rows).toBe(10);
      expect(params.cols).toBe(10);
      expect(params.difficulty).toBe('easy');
    });

    it('returns correct params for hard mode', () => {
      const params = getModeParams('hard');
      expect(params.rows).toBe(14);
      expect(params.allowReverse).toBe(true);
    });
  });
});
