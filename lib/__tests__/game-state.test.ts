import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { PersistedGameState } from '@/lib/storage/game-state';

// Create a proper localStorage mock
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

// Mock window with localStorage
vi.stubGlobal('window', {
  localStorage: localStorageMock,
});

// Dynamic import after mocking
const gameStateModule = await import('@/lib/storage/game-state');
const { loadGameState, saveGameState } = gameStateModule;

describe('game-state', () => {
  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('window', { localStorage: localStorageMock });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createGameState = (overrides: Partial<PersistedGameState> = {}): PersistedGameState => ({
    v: 1,
    difficulty: 'medium',
    answer: 'HELLO',
    rows: [],
    current: '',
    startedAtMs: null,
    endedAtMs: null,
    hintUsed: false,
    ...overrides,
  });

  describe('saveGameState', () => {
    it('saves to user-scoped key when userId provided', () => {
      const state = createGameState();
      saveGameState(state, 'user-123');
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const calls = localStorageMock.setItem.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('wordstypeshi.game.v1.user-123');
    });

    it('saves to anonymous key when no userId', () => {
      const state = createGameState();
      saveGameState(state, null);
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const calls = localStorageMock.setItem.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('wordstypeshi.game.v1');
    });

    it('removes key when state is null', () => {
      saveGameState(null, 'user-123');
      
      expect(localStorageMock.removeItem).toHaveBeenCalled();
      const calls = localStorageMock.removeItem.mock.calls;
      expect(calls.some((c: string[]) => c[0] === 'wordstypeshi.game.v1.user-123')).toBe(true);
    });
  });

  describe('loadGameState', () => {
    it('loads from user-scoped key when userId provided', () => {
      const state = createGameState({ answer: 'WORLD' });
      localStorageMock.setItem('wordstypeshi.game.v1.user-123', JSON.stringify(state));
      
      const loaded = loadGameState('user-123');
      expect(loaded?.answer).toBe('WORLD');
    });

    it('loads from anonymous key when no userId', () => {
      const state = createGameState({ answer: 'ANON' });
      localStorageMock.setItem('wordstypeshi.game.v1', JSON.stringify(state));
      
      const loaded = loadGameState(null);
      expect(loaded?.answer).toBe('ANON');
    });

    it('returns null for invalid JSON', () => {
      localStorageMock.setItem('wordstypeshi.game.v1', 'not-json');
      
      const loaded = loadGameState(null);
      expect(loaded).toBeNull();
    });

    it('returns null for wrong version', () => {
      const state = { v: 2, answer: 'TEST' };
      localStorageMock.setItem('wordstypeshi.game.v1', JSON.stringify(state));
      
      const loaded = loadGameState(null);
      expect(loaded).toBeNull();
    });

    it('returns null for missing answer', () => {
      const state = { v: 1 };
      localStorageMock.setItem('wordstypeshi.game.v1', JSON.stringify(state));
      
      const loaded = loadGameState(null);
      expect(loaded).toBeNull();
    });
  });
});
