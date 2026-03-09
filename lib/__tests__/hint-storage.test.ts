import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as hintStorage from '../storage/hint-storage';

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

let localStorageMock = createLocalStorageMock();

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', {
  localStorage: localStorageMock,
});

describe('hint-storage', () => {
  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', { localStorage: localStorageMock });
    vi.clearAllMocks();
    
    // Default date to today
    const mockDate = new Date('2023-01-01T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('can use hint initially', () => {
    expect(hintStorage.canUseHint('easy')).toBe(true);
    expect(hintStorage.getRemainingHints('easy')).toBe(hintStorage.DIFFICULTY_HINT_LIMITS.easy);
  });

  it('consumes hints and reduces remaining count', () => {
    hintStorage.consumeHint('easy');
    expect(hintStorage.getHintsUsedToday('easy')).toBe(1);
    expect(hintStorage.getRemainingHints('easy')).toBe(0);
    expect(hintStorage.canUseHint('easy')).toBe(false);
  });

  it('resets hints on next day', () => {
    // Day 1
    hintStorage.consumeHint('easy');
    expect(hintStorage.getHintsUsedToday('easy')).toBe(1);

    // Advance to Day 2
    const nextDay = new Date('2023-01-02T12:00:00Z');
    vi.setSystemTime(nextDay);

    // Should be reset
    expect(hintStorage.getHintsUsedToday('easy')).toBe(0);
    expect(hintStorage.canUseHint('easy')).toBe(true);
  });

  it('persists no-remind preference', () => {
    expect(hintStorage.getHintNoRemind()).toBe(false);
    
    hintStorage.setHintNoRemind(true);
    expect(hintStorage.getHintNoRemind()).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('batas-wordle-hint-no-remind', 'true');
  });
});
