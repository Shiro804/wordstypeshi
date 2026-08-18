import { describe, it, expect } from 'vitest';
import { mergeStats } from '@/lib/sync/game-stats-sync';
import type { Stats } from '@/lib/storage/storage';

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

describe('mergeStats (game-stats-sync)', () => {
  it('keeps max bestScore and min bestMismatches when remote is newer with more games', () => {
    const local = createStats({
      played: 5,
      wins: 3,
      bestScore: 900,
      bestMismatches: 2,
      updatedAt: 1000,
    });
    const remote = createStats({
      played: 10,
      wins: 7,
      bestScore: 400,
      bestMismatches: 8,
      updatedAt: 2000,
    });

    const result = mergeStats(local, remote);
    expect(result.played).toBe(10);
    expect(result.wins).toBe(7);
    expect(result.bestScore).toBe(900);
    expect(result.bestMismatches).toBe(2);
  });

  it('treats null bestScore / bestMismatches as missing on the remote-newer branch', () => {
    const local = createStats({
      played: 1,
      bestScore: 120,
      bestMismatches: null,
      updatedAt: 1000,
    });
    const remote = createStats({
      played: 4,
      bestScore: null,
      bestMismatches: 3,
      updatedAt: 2000,
    });

    const result = mergeStats(local, remote);
    expect(result.bestScore).toBe(120);
    expect(result.bestMismatches).toBe(3);
  });
});
