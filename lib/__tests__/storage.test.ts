import { describe, it, expect, beforeEach } from 'vitest';
import { 
  applyGameResult, 
  formatDuration, 
  defaultStats,
  type Stats, 
  type GameResult 
} from '../storage';

describe('defaultStats', () => {
  it('returns zeroed stats', () => {
    const stats = defaultStats();
    expect(stats.played).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.maxStreak).toBe(0);
    expect(stats.bestTimeSec).toBeNull();
    expect(stats.avgTimeSec).toBeNull();
    expect(stats.lastTimesSec).toEqual([]);
  });

  it('has proper distribution initialized', () => {
    const stats = defaultStats();
    expect(stats.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
  });
});

describe('applyGameResult', () => {
  let baseStats: Stats;

  beforeEach(() => {
    baseStats = defaultStats();
  });

  describe('win outcomes', () => {
    it('increments played and wins count', () => {
      const result: GameResult = { outcome: 'win', guessesUsed: 3, durationSec: 60 };
      const updated = applyGameResult(baseStats, result);
      
      expect(updated.played).toBe(1);
      expect(updated.wins).toBe(1);
      expect(updated.losses).toBe(0);
    });

    it('increments current streak on win', () => {
      const result: GameResult = { outcome: 'win', guessesUsed: 3, durationSec: 60 };
      let stats = applyGameResult(baseStats, result);
      expect(stats.currentStreak).toBe(1);
      
      stats = applyGameResult(stats, result);
      expect(stats.currentStreak).toBe(2);
    });

    it('updates max streak when current exceeds it', () => {
      const result: GameResult = { outcome: 'win', guessesUsed: 3, durationSec: 60 };
      let stats = applyGameResult(baseStats, result);
      stats = applyGameResult(stats, result);
      stats = applyGameResult(stats, result);
      
      expect(stats.maxStreak).toBe(3);
    });

    it('updates guess distribution correctly', () => {
      const stats = applyGameResult(baseStats, { outcome: 'win', guessesUsed: 4, durationSec: 60 });
      expect(stats.distribution[4]).toBe(1);
      expect(stats.distribution[1]).toBe(0);
    });

    it('sets bestTimeSec on first win', () => {
      const stats = applyGameResult(baseStats, { outcome: 'win', guessesUsed: 3, durationSec: 45 });
      expect(stats.bestTimeSec).toBe(45);
    });

    it('updates bestTimeSec when faster', () => {
      let stats = applyGameResult(baseStats, { outcome: 'win', guessesUsed: 3, durationSec: 60 });
      stats = applyGameResult(stats, { outcome: 'win', guessesUsed: 3, durationSec: 30 });
      expect(stats.bestTimeSec).toBe(30);
    });

    it('does not update bestTimeSec when slower', () => {
      let stats = applyGameResult(baseStats, { outcome: 'win', guessesUsed: 3, durationSec: 30 });
      stats = applyGameResult(stats, { outcome: 'win', guessesUsed: 3, durationSec: 60 });
      expect(stats.bestTimeSec).toBe(30);
    });

    it('calculates avgTimeSec correctly', () => {
      let stats = applyGameResult(baseStats, { outcome: 'win', guessesUsed: 3, durationSec: 60 });
      expect(stats.avgTimeSec).toBe(60);
      
      stats = applyGameResult(stats, { outcome: 'win', guessesUsed: 3, durationSec: 30 });
      expect(stats.avgTimeSec).toBe(45); // (60 + 30) / 2
    });

    it('keeps only last 20 times', () => {
      let stats = baseStats;
      for (let i = 0; i < 25; i++) {
        stats = applyGameResult(stats, { outcome: 'win', guessesUsed: 3, durationSec: i + 1 });
      }
      expect(stats.lastTimesSec.length).toBe(20);
      expect(stats.lastTimesSec[0]).toBe(25); // Most recent first
    });
  });

  describe('lose outcomes', () => {
    it('increments played and losses count', () => {
      const result: GameResult = { outcome: 'lose', durationSec: 120 };
      const updated = applyGameResult(baseStats, result);
      
      expect(updated.played).toBe(1);
      expect(updated.wins).toBe(0);
      expect(updated.losses).toBe(1);
    });

    it('resets current streak to zero', () => {
      let stats = applyGameResult(baseStats, { outcome: 'win', guessesUsed: 3, durationSec: 60 });
      stats = applyGameResult(stats, { outcome: 'win', guessesUsed: 3, durationSec: 60 });
      expect(stats.currentStreak).toBe(2);
      
      stats = applyGameResult(stats, { outcome: 'lose', durationSec: 120 });
      expect(stats.currentStreak).toBe(0);
      expect(stats.maxStreak).toBe(2); // Max should remain
    });

    it('does not affect time-based stats', () => {
      let stats = applyGameResult(baseStats, { outcome: 'win', guessesUsed: 3, durationSec: 60 });
      const prevBest = stats.bestTimeSec;
      const prevAvg = stats.avgTimeSec;
      
      stats = applyGameResult(stats, { outcome: 'lose', durationSec: 30 });
      expect(stats.bestTimeSec).toBe(prevBest);
      expect(stats.avgTimeSec).toBe(prevAvg);
    });
  });
});

describe('formatDuration', () => {
  it('formats seconds only for less than 60 seconds', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(30)).toBe('30s');
    expect(formatDuration(59)).toBe('59s');
  });

  it('formats minutes:seconds for 60+ seconds', () => {
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(61)).toBe('1:01');
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(125)).toBe('2:05');
  });

  it('handles large values correctly', () => {
    expect(formatDuration(3600)).toBe('60:00'); // 1 hour
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('handles negative values by treating as 0', () => {
    expect(formatDuration(-10)).toBe('0s');
  });

  it('handles decimal values by flooring', () => {
    expect(formatDuration(30.9)).toBe('30s');
    expect(formatDuration(60.9)).toBe('1:00');
  });
});
