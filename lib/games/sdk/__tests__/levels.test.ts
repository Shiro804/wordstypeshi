import { describe, it, expect } from 'vitest';
import {
  calculateStars,
  levelSeed,
  lerpInPhase,
  emptyLevelProgress,
  recordLevelResult,
  mergeLevelProgress,
  type LevelProgress,
} from '../levels';

// ============================================================================
// calculateStars
// ============================================================================

describe('calculateStars', () => {
  const thresholds: [number, number, number] = [10, 14, 20];

  it('returns 3 at or below the 3★ threshold', () => {
    expect(calculateStars(1, thresholds)).toBe(3);
    expect(calculateStars(10, thresholds)).toBe(3);
  });

  it('returns 2 between 3★ and 2★ thresholds', () => {
    expect(calculateStars(11, thresholds)).toBe(2);
    expect(calculateStars(14, thresholds)).toBe(2);
  });

  it('returns 1 between 2★ and 1★ thresholds', () => {
    expect(calculateStars(15, thresholds)).toBe(1);
    expect(calculateStars(20, thresholds)).toBe(1);
  });

  it('returns 0 beyond the 1★ threshold', () => {
    expect(calculateStars(21, thresholds)).toBe(0);
    expect(calculateStars(999, thresholds)).toBe(0);
  });
});

// ============================================================================
// levelSeed — deterministic, zero-padded
// ============================================================================

describe('levelSeed', () => {
  it('zero-pads level numbers to 4 digits', () => {
    expect(levelSeed('batasbottles', 1)).toBe('batasbottles-level-0001');
    expect(levelSeed('batasbottles', 42)).toBe('batasbottles-level-0042');
    expect(levelSeed('batasbottles', 1000)).toBe('batasbottles-level-1000');
  });

  it('is deterministic for the same inputs', () => {
    expect(levelSeed('foo', 7)).toBe(levelSeed('foo', 7));
  });

  it('differs across games', () => {
    expect(levelSeed('a', 1)).not.toBe(levelSeed('b', 1));
  });
});

// ============================================================================
// lerpInPhase
// ============================================================================

describe('lerpInPhase', () => {
  it('returns the start value at the phase start', () => {
    expect(lerpInPhase(1, 1, 10, 4, 8)).toBe(4);
  });

  it('returns the end value at the phase end', () => {
    expect(lerpInPhase(10, 1, 10, 4, 8)).toBe(8);
  });

  it('linearly interpolates in between', () => {
    // 1..10 with values 4..8 — halfway (level 5 or 6) should be ~6.
    const mid = lerpInPhase(5, 1, 10, 4, 8);
    expect(mid).toBeGreaterThan(5.5);
    expect(mid).toBeLessThan(6.5);
  });

  it('clamps levels below the phase start', () => {
    expect(lerpInPhase(-5, 1, 10, 4, 8)).toBe(4);
  });

  it('clamps levels above the phase end', () => {
    expect(lerpInPhase(50, 1, 10, 4, 8)).toBe(8);
  });
});

// ============================================================================
// LevelProgress — record + merge
// ============================================================================

describe('recordLevelResult', () => {
  it('starts from an empty progress', () => {
    const p = emptyLevelProgress();
    expect(p.maxLevelReached).toBe(0);
    expect(p.totalStars).toBe(0);
  });

  it('records a first-time win', () => {
    const p = recordLevelResult(emptyLevelProgress(), 5, 2, 18);
    expect(p.maxLevelReached).toBe(5);
    expect(p.stars['5']).toBe(2);
    expect(p.totalStars).toBe(2);
    expect(p.bestMoves['5']).toBe(18);
  });

  it('only improves star count on retry', () => {
    let p = recordLevelResult(emptyLevelProgress(), 5, 2, 18);
    p = recordLevelResult(p, 5, 1, 30);
    expect(p.stars['5']).toBe(2);
    expect(p.totalStars).toBe(2);
  });

  it('tracks best moves separately from stars', () => {
    let p = recordLevelResult(emptyLevelProgress(), 5, 2, 18);
    p = recordLevelResult(p, 5, 1, 12); // fewer moves but fewer stars
    expect(p.stars['5']).toBe(2);     // keep best stars
    expect(p.bestMoves['5']).toBe(12); // keep best moves
  });

  it('advances maxLevelReached monotonically', () => {
    let p = recordLevelResult(emptyLevelProgress(), 7, 3, 10);
    p = recordLevelResult(p, 3, 3, 5);
    expect(p.maxLevelReached).toBe(7);
  });

  it('totalStars aggregates across many levels', () => {
    let p = emptyLevelProgress();
    p = recordLevelResult(p, 1, 3, 5);
    p = recordLevelResult(p, 2, 2, 8);
    p = recordLevelResult(p, 3, 1, 20);
    expect(p.totalStars).toBe(6);
  });
});

describe('mergeLevelProgress', () => {
  it('returns whichever side is defined when the other is missing', () => {
    const p = recordLevelResult(emptyLevelProgress(), 5, 3, 10);
    expect(mergeLevelProgress(p, undefined)).toBe(p);
    expect(mergeLevelProgress(undefined, p)).toBe(p);
    expect(mergeLevelProgress(undefined, undefined)).toBeUndefined();
  });

  it('combines two progress snapshots by taking the best of each field', () => {
    const a: LevelProgress = {
      maxLevelReached: 5,
      stars: { '1': 3, '2': 1, '5': 2 },
      totalStars: 6,
      bestMoves: { '1': 8, '2': 14, '5': 20 },
    };
    const b: LevelProgress = {
      maxLevelReached: 7,
      stars: { '2': 3, '6': 2, '7': 1 },
      totalStars: 6,
      bestMoves: { '2': 12, '6': 18, '7': 25 },
    };
    const merged = mergeLevelProgress(a, b)!;
    expect(merged.maxLevelReached).toBe(7);
    expect(merged.stars['1']).toBe(3);
    expect(merged.stars['2']).toBe(3); // best of 1 and 3
    expect(merged.stars['5']).toBe(2);
    expect(merged.stars['6']).toBe(2);
    expect(merged.stars['7']).toBe(1);
    expect(merged.bestMoves['2']).toBe(12); // min of 14 and 12
    expect(merged.totalStars).toBe(3 + 3 + 2 + 2 + 1);
  });
});
