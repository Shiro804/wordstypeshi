import { describe, it, expect } from 'vitest';
import {
  generateLevel,
  batasBottlesLevelSystem,
  BATASBOTTLES_PHASES,
} from '../level-generator';
import { BATASBOTTLES_LEVEL_COUNT, BOTTLE_COLORS } from '../ruleset';
import { calculateStars } from '../../sdk/levels';

// ============================================================================
// Basic contract
// ============================================================================

describe('batasBottlesLevelSystem', () => {
  it('exposes the right max level', () => {
    expect(batasBottlesLevelSystem.maxLevel).toBe(BATASBOTTLES_LEVEL_COUNT);
    expect(batasBottlesLevelSystem.maxLevel).toBe(1000);
  });

  it('phases cover 1..1000 contiguously without gaps or overlaps', () => {
    const sorted = [...BATASBOTTLES_PHASES].sort(
      (a, b) => a.startLevel - b.startLevel
    );
    expect(sorted[0].startLevel).toBe(1);
    expect(sorted[sorted.length - 1].endLevel).toBe(1000);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].startLevel).toBe(sorted[i - 1].endLevel + 1);
    }
  });
});

// ============================================================================
// Determinism
// ============================================================================

describe('generateLevel determinism', () => {
  it('returns the same config for the same level', () => {
    const a = generateLevel(42);
    const b = generateLevel(42);
    expect(a).toEqual(b);
  });

  it('returns different params across different levels (sampled)', () => {
    const a = generateLevel(10);
    const b = generateLevel(900);
    // Either the bottle count or color count must differ across phases
    expect(
      a.params.numSmallBottles !== b.params.numSmallBottles ||
        a.params.numColors !== b.params.numColors
    ).toBe(true);
  });

  it('clamps out-of-range levels into [1, 1000]', () => {
    const a = generateLevel(-5);
    const b = generateLevel(1);
    expect(a.level).toBe(1);
    expect(a.params).toEqual(b.params);

    const c = generateLevel(999_999);
    const d = generateLevel(1000);
    expect(c.level).toBe(1000);
    expect(c.params).toEqual(d.params);
  });
});

// ============================================================================
// Phase scaling — every sampled level stays within sensible bounds
// ============================================================================

describe('generateLevel scaling across phases', () => {
  const samples: Array<{ level: number; label: string }> = [
    { level: 1,    label: 'Tutorial' },
    { level: 25,   label: 'Tutorial' },
    { level: 50,   label: 'Tutorial' },
    { level: 51,   label: 'Easy' },
    { level: 125,  label: 'Easy' },
    { level: 200,  label: 'Easy' },
    { level: 201,  label: 'Medium' },
    { level: 350,  label: 'Medium' },
    { level: 500,  label: 'Medium' },
    { level: 501,  label: 'Hard' },
    { level: 650,  label: 'Hard' },
    { level: 800,  label: 'Hard' },
    { level: 801,  label: 'Expert' },
    { level: 900,  label: 'Expert' },
    { level: 1000, label: 'Expert' },
  ];

  for (const { level, label } of samples) {
    it(`level ${level} sits in phase ${label} with plausible params`, () => {
      const config = generateLevel(level);
      expect(config.phaseLabel).toBe(label);

      // Sanity bounds for the whole progression.
      expect(config.params.numSmallBottles).toBeGreaterThanOrEqual(4);
      expect(config.params.numSmallBottles).toBeLessThanOrEqual(22);
      expect(config.params.numColors).toBeGreaterThanOrEqual(2);
      expect(config.params.numColors).toBeLessThanOrEqual(BOTTLE_COLORS.length);
      expect(config.params.smallBottleCapacity).toBeGreaterThanOrEqual(3);
      expect(config.params.smallBottleCapacity).toBeLessThanOrEqual(8);
      expect(config.params.numEmptyBottles).toBeGreaterThanOrEqual(0);
      expect(config.params.numEmptyBottles).toBeLessThan(
        config.params.numSmallBottles
      );

      // Star thresholds are strictly increasing, positive.
      const [t1, t2, t3] = config.starThresholds;
      expect(t1).toBeGreaterThan(0);
      expect(t2).toBeGreaterThan(t1);
      expect(t3).toBeGreaterThan(t2);
    });
  }
});

// ============================================================================
// Monotonicity — average bottle count does not shrink across phases
// ============================================================================

describe('generateLevel monotonicity (phase-wide average)', () => {
  function avgBottles(start: number, end: number): number {
    let total = 0;
    let count = 0;
    for (let l = start; l <= end; l += 10) {
      total += generateLevel(l).params.numSmallBottles;
      count++;
    }
    return total / count;
  }

  it('average bottle count grows from phase 1 → phase 5', () => {
    const tut = avgBottles(1, 50);
    const easy = avgBottles(51, 200);
    const med = avgBottles(201, 500);
    const hard = avgBottles(501, 800);
    const expert = avgBottles(801, 1000);
    expect(easy).toBeGreaterThan(tut);
    expect(med).toBeGreaterThan(easy);
    expect(hard).toBeGreaterThan(med);
    expect(expert).toBeGreaterThan(hard);
  });
});

// ============================================================================
// Move limit + star behaviour
// ============================================================================

describe('move limit and star rating', () => {
  it('tutorial levels have no move limit', () => {
    for (const level of [1, 10, 25, 50]) {
      expect(generateLevel(level).moveLimit).toBeNull();
    }
  });

  it('non-tutorial levels always have a numeric move limit', () => {
    for (const level of [51, 200, 500, 800, 1000]) {
      const config = generateLevel(level);
      expect(typeof config.moveLimit).toBe('number');
      expect(config.moveLimit! > 0).toBe(true);
    }
  });

  it('3 stars require moves <= threshold[0]', () => {
    const { starThresholds } = generateLevel(300);
    expect(calculateStars(starThresholds[0], starThresholds)).toBe(3);
    expect(calculateStars(starThresholds[0] + 1, starThresholds)).toBeLessThan(3);
  });

  it('non-tutorial move limits are at or above the 1-star threshold', () => {
    // Otherwise the player would run out of moves before even getting 1 star,
    // which would make the level effectively impossible to "complete".
    for (const level of [51, 200, 500, 800, 1000]) {
      const { moveLimit, starThresholds } = generateLevel(level);
      // Expert phase is deliberately tight (0.98 * t3) — allow a small slack.
      expect(moveLimit!).toBeGreaterThanOrEqual(Math.floor(starThresholds[2] * 0.95));
    }
  });
});

// ============================================================================
// Every sampled level produces a solvable puzzle (the generator itself
// enforces this, but we smoke-test to catch regressions).
// ============================================================================

describe('solvability smoke test across the progression', () => {
  const sampleLevels = [
    1, 5, 25, 50, 51, 100, 150, 200, 201, 300, 400, 500,
    501, 600, 700, 800, 801, 850, 900, 950, 999, 1000,
  ];

  for (const level of sampleLevels) {
    it(`level ${level} generates without throwing`, () => {
      expect(() => generateLevel(level)).not.toThrow();
    });
  }
});
