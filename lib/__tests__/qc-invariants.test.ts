import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { playDurationSec } from '@/lib/hooks/useGameTimer';
import * as storage from '@/lib/storage/active-game-storage';
import { mergeStats } from '@/lib/sync/game-stats-sync';
import type { Stats } from '@/lib/storage/storage';
import {
  generateSegmentPercentages,
  calculateAccuracy,
  batascolorsEngine,
  getModeParams as getColorsParams,
} from '@/lib/games/batascolors/engine';
import { wordSearchEngine, getModeParams as getWordSearchParams } from '@/lib/games/wordsearch/engine';
import { batasMineEngine, getModeParams as getMineParams } from '@/lib/games/batasmine/engine';
import { ensureColorBoard } from '@/lib/games/batasblast/engine';
import { BATASBLAST_MODES, BATASBLAST_RULESET_VERSION } from '@/lib/games/batasblast/ruleset';
import { batasBlastDefinition } from '@/lib/games/batasblast/definition';
import { FLOW_COLORS as RulesetFlowColors } from '@/lib/games/batasflow/ruleset';
import { FLOW_COLORS as GeneratorFlowColors } from '@/lib/games/batasflow/puzzle-generator';
import { emptyLevelProgress, recordLevelResult } from '@/lib/games/sdk/levels';
import { translations } from '@/lib/i18n/translations';

function createStats(overrides: Partial<Stats> = {}): Stats {
  return {
    played: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    bestTimeSec: null,
    avgTimeSec: null,
    lastTimesSec: [],
    bestScore: null,
    bestMismatches: null,
    updatedAt: Date.now(),
    ...overrides,
  };
}

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

describe('QC invariants', () => {
  describe('S1-05 timer source', () => {
    it('playDurationSec is 0 until the visible timer started', () => {
      expect(playDurationSec({ startedAtMs: null, elapsedSec: 42 })).toBe(0);
      expect(playDurationSec({ startedAtMs: 1, elapsedSec: 12 })).toBe(12);
    });

    it('does not rewrite startedAtMs of a finished game on restore, even after 24h idle', () => {
      const localStorageMock = createLocalStorageMock();
      vi.stubGlobal('localStorage', localStorageMock);
      vi.stubGlobal('window', { localStorage: localStorageMock });

      const startedAtMs = Date.now() - 30 * 60 * 60 * 1000;
      const endedAtMs = startedAtMs + 45_000;
      storage.saveActiveGame(
        'finished-game',
        { foo: 'bar', startedAtMs, endedAtMs },
        null
      );

      const loaded = storage.loadActiveGame<{
        foo: string;
        startedAtMs: number;
        endedAtMs: number;
      }>('finished-game', null);

      expect(loaded).not.toBeNull();
      expect(loaded!.startedAtMs).toBe(startedAtMs);
      expect(loaded!.endedAtMs).toBe(endedAtMs);
      expect(loaded!.endedAtMs - loaded!.startedAtMs).toBe(45_000);

      vi.unstubAllGlobals();
    });
  });

  describe('S1-06 Map/Set revive', () => {
    let localStorageMock = createLocalStorageMock();

    beforeEach(() => {
      localStorageMock = createLocalStorageMock();
      vi.stubGlobal('localStorage', localStorageMock);
      vi.stubGlobal('window', { localStorage: localStorageMock });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('roundtrips Flow paths Map and completedFlows Set', () => {
      const now = Date.now();
      storage.saveActiveGame(
        'batasflow',
        {
          startedAtMs: now - 2000,
          paths: new Map([[4, [{ row: 1, col: 2 }]]]),
          completedFlows: new Set([4, 7]),
        },
        null
      );

      const loaded = storage.loadActiveGame<{
        paths: Map<number, { row: number; col: number }[]>;
        completedFlows: Set<number>;
      }>('batasflow', null);

      expect(loaded!.paths).toBeInstanceOf(Map);
      expect(loaded!.paths.get(4)).toEqual([{ row: 1, col: 2 }]);
      expect(loaded!.completedFlows).toBeInstanceOf(Set);
      expect([...loaded!.completedFlows].sort()).toEqual([4, 7]);
    });
  });

  describe('S1-07 stats merge', () => {
    it('keeps max bestScore and min bestMismatches across a newer remote snapshot', () => {
      const result = mergeStats(
        createStats({
          played: 3,
          wins: 2,
          bestScore: 880,
          bestMismatches: 1,
          updatedAt: 10,
        }),
        createStats({
          played: 9,
          wins: 6,
          bestScore: 200,
          bestMismatches: 9,
          updatedAt: 99,
        })
      );
      expect(result.bestScore).toBe(880);
      expect(result.bestMismatches).toBe(1);
      expect(result.played).toBe(9);
    });
  });

  describe('S5-03 / S5-04 Blast catalog and colorBoard', () => {
    it('has no daily_challenge mode and bumped ruleset version', () => {
      expect(Object.keys(BATASBLAST_MODES)).toEqual(['classic_endless']);
      expect(batasBlastDefinition.modes.map((m) => m.modeId)).toEqual(['classic_endless']);
      expect(BATASBLAST_RULESET_VERSION).toBe('1.1.0');
      expect(batasBlastDefinition.currentRulesetVersion).toBe('1.1.0');
    });

    it('backfills missing colorBoard from occupied cells', () => {
      const board = Array.from({ length: 8 }, () => Array(8).fill(false));
      board[1][1] = true;
      const colors = ensureColorBoard(board, undefined);
      expect(colors[1][1]).toBeGreaterThanOrEqual(0);
      expect(colors[0][0]).toBe(-1);
    });
  });

  describe('S6 Colors exact win and segment floor', () => {
    it('is 100 accuracy only on exact RGB', () => {
      const target = { r: 40, g: 80, b: 120 };
      expect(calculateAccuracy(target, target)).toBe(100);
      expect(calculateAccuracy({ r: 41, g: 80, b: 120 }, target)).toBeLessThan(100);
    });

    it('wins only when the submitted mix is the exact recipe', () => {
      const state = batascolorsEngine.init('qc-colors-win', getColorsParams('easy'));
      const win = batascolorsEngine.applyAction(state, {
        type: 'submit_guess',
        segmentColors: state.solution,
      });
      expect(win.state.status).toBe('won');
      expect(win.state.attempts[0].accuracy).toBe(100);
    });

    it('keeps every segment at least 10% and summing to 100', () => {
      const adversarial = () => {
        let n = 0;
        return () => {
          n += 1;
          return n === 4 ? 0.00001 : 1;
        };
      };

      for (const count of [3, 4, 5, 6]) {
        const parts = generateSegmentPercentages(count, adversarial());
        expect(parts).toHaveLength(count);
        expect(parts.every((p) => p >= 10)).toBe(true);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
      }

      for (let i = 0; i < 80; i++) {
        const parts = generateSegmentPercentages(5, Math.random);
        expect(parts.every((p) => p >= 10)).toBe(true);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
      }
    });
  });

  describe('S3 WordSearch reverse / tap / illegal diagonal', () => {
    it('matches a placed word in reverse on easy', () => {
      const state = wordSearchEngine.init('word-finding-test', getWordSearchParams('easy'));
      const word = state.words[0];
      const dirs: Record<string, { dr: number; dc: number }> = {
        RIGHT: { dr: 0, dc: 1 },
        DOWN: { dr: 1, dc: 0 },
      };
      const dir = dirs[word.placement.direction];
      const endRow = word.placement.startRow + (word.text.length - 1) * dir.dr;
      const endCol = word.placement.startCol + (word.text.length - 1) * dir.dc;

      const result = wordSearchEngine.applyAction(state, {
        type: 'select_path',
        start: { r: endRow, c: endCol },
        end: { r: word.placement.startRow, c: word.placement.startCol },
      });
      expect(result.state.foundCount).toBe(1);
    });

    it('does not count a tap or illegal easy diagonal as a miss', () => {
      const state = wordSearchEngine.init('qc-search-tap', getWordSearchParams('easy'));
      const tap = wordSearchEngine.applyAction(state, {
        type: 'select_path',
        start: { r: 0, c: 0 },
        end: { r: 0, c: 0 },
      });
      expect(tap.state.misselects).toBe(0);

      const diagonal = wordSearchEngine.applyAction(state, {
        type: 'select_path',
        start: { r: 0, c: 0 },
        end: { r: 2, c: 2 },
      });
      expect(diagonal.state.misselects).toBe(0);
      expect(diagonal.invalidReason).toBe('Invalid path');
    });
  });

  describe('S8 Mine first-click flag wipe', () => {
    it('recounts flagsPlaced after the opening reveal rebuilds mines', () => {
      let state = batasMineEngine.init('qc-mine-flags', getMineParams('easy'));
      state = batasMineEngine.applyAction(state, { type: 'toggle_flag', position: 0 }).state;
      state = batasMineEngine.applyAction(state, { type: 'toggle_flag', position: 1 }).state;
      expect(state.flagsPlaced).toBe(2);

      state = batasMineEngine.applyAction(state, { type: 'reveal', position: 20 }).state;
      const flagged = state.grid.filter((cell) => cell.state === 'flagged').length;
      expect(state.flagsPlaced).toBe(flagged);
    });
  });

  describe('S8-04 / S1-03 HowToPlay honesty', () => {
    it('does not claim hard Mine is guess-free', () => {
      expect(translations.en.howToPlay.batasmine.tips.toLowerCase()).toContain('guess');
      expect(translations.de.howToPlay.batasmine.tips.toLowerCase()).toMatch(/rate/);
    });
  });

  describe('S9-03 Flow colors', () => {
    it('uses one FLOW_COLORS table for generator and ruleset', () => {
      expect(GeneratorFlowColors).toBe(RulesetFlowColors);
      expect(RulesetFlowColors.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('S10-04 Bottles 0-star is completed', () => {
    it('records a 0-star win so the level is present in progress', () => {
      const next = recordLevelResult(emptyLevelProgress(), 12, 0, 40);
      expect(Object.prototype.hasOwnProperty.call(next.stars, '12')).toBe(true);
      expect(next.stars['12']).toBe(0);
      expect(next.bestMoves['12']).toBe(40);
      expect(next.maxLevelReached).toBe(12);
    });
  });
});
