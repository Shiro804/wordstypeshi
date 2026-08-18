import { describe, it, expect } from 'vitest';
import {
  mixColors,
  calculateAccuracy,
  batascolorsEngine,
  getModeParams,
} from '../engine';

describe('mixColors', () => {
  it('returns weighted RGB average', () => {
    expect(mixColors([
      { color: { r: 0, g: 0, b: 0 }, percentage: 50 },
      { color: { r: 100, g: 200, b: 0 }, percentage: 50 },
    ])).toEqual({ r: 50, g: 100, b: 0 });
  });

  it('returns the color unchanged at 100%', () => {
    const color = { r: 239, g: 68, b: 68 };
    expect(mixColors([{ color, percentage: 100 }])).toEqual(color);
  });
});

describe('calculateAccuracy', () => {
  const target = { r: 100, g: 100, b: 100 };

  it('is 100 only on exact RGB match', () => {
    expect(calculateAccuracy(target, target)).toBe(100);
  });

  it('is below 100 for manhattan 1–3 (no false 100 from Math.round)', () => {
    expect(calculateAccuracy({ r: 101, g: 100, b: 100 }, target)).toBeLessThan(100);
    expect(calculateAccuracy({ r: 102, g: 100, b: 100 }, target)).toBeLessThan(100);
    expect(calculateAccuracy({ r: 103, g: 100, b: 100 }, target)).toBeLessThan(100);
  });
});

describe('win threshold', () => {
  it('wins only on exact RGB match', () => {
    const state = batascolorsEngine.init('win-threshold', getModeParams('easy'));

    const win = batascolorsEngine.applyAction(state, {
      type: 'submit_guess',
      segmentColors: state.solution,
    });
    expect(win.state.status).toBe('won');
    expect(win.state.attempts[0].accuracy).toBe(100);

    const alt = state.solution.map((c, i) =>
      i === 0 ? (c + 1) % state.palette.length : c
    );
    const miss = batascolorsEngine.applyAction(state, {
      type: 'submit_guess',
      segmentColors: alt,
    });
    const mixed = miss.state.attempts[0].mixedColor;
    const exact =
      mixed.r === state.targetColor.r &&
      mixed.g === state.targetColor.g &&
      mixed.b === state.targetColor.b;
    if (!exact) {
      expect(miss.state.status).not.toBe('won');
      expect(miss.state.attempts[0].accuracy).toBeLessThan(100);
    }
  });
});
