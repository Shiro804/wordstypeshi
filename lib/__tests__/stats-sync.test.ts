import { describe, it, expect } from 'vitest';
import { mergeStats } from '@/lib/sync/stats-sync';
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
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('mergeStats', () => {
  it('returns remote when remote is newer and has more games', () => {
    const local = createStats({ played: 5, wins: 3, updatedAt: 1000 });
    const remote = createStats({ played: 10, wins: 7, updatedAt: 2000 });
    
    const result = mergeStats(local, remote);
    expect(result).toEqual(remote);
  });

  it('takes max of cumulative stats when local has more games', () => {
    const local = createStats({ 
      played: 15, 
      wins: 10, 
      losses: 5,
      maxStreak: 8,
      updatedAt: 1000 
    });
    const remote = createStats({ 
      played: 10, 
      wins: 7, 
      losses: 3,
      maxStreak: 5,
      updatedAt: 2000 
    });
    
    const result = mergeStats(local, remote);
    expect(result.played).toBe(15); // Max
    expect(result.wins).toBe(10);   // Max
    expect(result.losses).toBe(5);  // Max
    expect(result.maxStreak).toBe(8); // Max
  });

  it('prefers remote currentStreak when remote is newer', () => {
    const local = createStats({ currentStreak: 5, updatedAt: 1000 });
    const remote = createStats({ currentStreak: 2, updatedAt: 2000 });
    
    const result = mergeStats(local, remote);
    expect(result.currentStreak).toBe(2); // Remote is newer
  });

  it('prefers local currentStreak when local is newer', () => {
    const local = createStats({ currentStreak: 5, updatedAt: 3000 });
    const remote = createStats({ currentStreak: 2, updatedAt: 2000 });
    
    const result = mergeStats(local, remote);
    expect(result.currentStreak).toBe(5); // Local is newer
  });

  it('merges distribution by taking max of each bucket', () => {
    const local = createStats({ 
      distribution: { 1: 5, 2: 3, 3: 2, 4: 1, 5: 0, 6: 0 },
      updatedAt: 1000 
    });
    const remote = createStats({ 
      distribution: { 1: 2, 2: 4, 3: 1, 4: 3, 5: 2, 6: 1 },
      updatedAt: 2000 
    });
    
    const result = mergeStats(local, remote);
    expect(result.distribution).toEqual({
      1: 5, // Max(5, 2)
      2: 4, // Max(3, 4)
      3: 2, // Max(2, 1)
      4: 3, // Max(1, 3)
      5: 2, // Max(0, 2)
      6: 1, // Max(0, 1)
    });
  });

  it('takes best (minimum) of bestTimeSec', () => {
    const local = createStats({ bestTimeSec: 30, updatedAt: 1000 });
    const remote = createStats({ bestTimeSec: 45, updatedAt: 2000 });
    
    const result = mergeStats(local, remote);
    expect(result.bestTimeSec).toBe(30);
  });

  it('handles null bestTimeSec correctly', () => {
    const local = createStats({ bestTimeSec: null, updatedAt: 1000 });
    const remote = createStats({ bestTimeSec: 45, updatedAt: 2000 });
    
    const result = mergeStats(local, remote);
    expect(result.bestTimeSec).toBe(45);
  });

  it('takes max updatedAt', () => {
    const local = createStats({ updatedAt: 1000 });
    const remote = createStats({ updatedAt: 2000 });
    
    const result = mergeStats(local, remote);
    expect(result.updatedAt).toBe(2000);
  });

  it('handles identical stats gracefully', () => {
    const stats = createStats({ played: 10, wins: 7, updatedAt: 1000 });
    const result = mergeStats(stats, { ...stats });
    
    expect(result.played).toBe(10);
    expect(result.wins).toBe(7);
  });
});
