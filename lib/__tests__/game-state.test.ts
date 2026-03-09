import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { PersistedGameState, WrappedGameState } from '@/lib/storage/game-state';

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
    it('saves to user-scoped key in wrapped format when userId provided', () => {
      const state = createGameState({ startedAtMs: Date.now() - 5000 });
      saveGameState(state, 'user-123');
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const calls = localStorageMock.setItem.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('batagames.game.v1.user-123');
      
      // Verify wrapped format
      const saved = JSON.parse(lastCall[1]);
      expect(saved.v).toBe(2);
      expect(saved.gameState.answer).toBe('HELLO');
      expect(saved.elapsedMs).toBeGreaterThanOrEqual(5000);
    });

    it('saves to anonymous key when no userId', () => {
      const state = createGameState();
      saveGameState(state, null);
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const calls = localStorageMock.setItem.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('batagames.game.v1');
    });

    it('removes key when state is null', () => {
      saveGameState(null, 'user-123');
      
      expect(localStorageMock.removeItem).toHaveBeenCalled();
      const calls = localStorageMock.removeItem.mock.calls;
      expect(calls.some((c: string[]) => c[0] === 'batagames.game.v1.user-123')).toBe(true);
    });
  });

  describe('loadGameState', () => {
    it('loads wrapped format and adjusts startedAtMs for in-progress games', () => {
      const gameState = createGameState({ 
        answer: 'WORLD',
        startedAtMs: Date.now() - 10000 // 10 seconds ago
      });
      const wrapped: WrappedGameState = {
        v: 2,
        gameState,
        elapsedMs: 5000, // 5 seconds of play time
        savedAtMs: Date.now() - 1000,
      };
      localStorageMock.setItem('batagames.game.v1.user-123', JSON.stringify(wrapped));
      
      const loaded = loadGameState('user-123');
      expect(loaded?.answer).toBe('WORLD');
      // startedAtMs should be adjusted so elapsed time is ~5 seconds
      const elapsedMs = Date.now() - loaded!.startedAtMs!;
      expect(elapsedMs).toBeGreaterThanOrEqual(5000);
      expect(elapsedMs).toBeLessThan(6000);
    });

    it('loads wrapped format without adjusting startedAtMs for finished games', () => {
      const now = Date.now();
      const gameState = createGameState({ 
        answer: 'DONE',
        startedAtMs: now - 60000,
        endedAtMs: now - 30000 // Game ended 30 seconds after start
      });
      const wrapped: WrappedGameState = {
        v: 2,
        gameState,
        elapsedMs: 30000,
        savedAtMs: now,
      };
      localStorageMock.setItem('batagames.game.v1', JSON.stringify(wrapped));
      
      const loaded = loadGameState(null);
      expect(loaded?.answer).toBe('DONE');
      // Should not adjust startedAtMs for finished games
      expect(loaded?.startedAtMs).toBe(gameState.startedAtMs);
      expect(loaded?.endedAtMs).toBe(gameState.endedAtMs);
    });

    it('loads legacy format (v1) as-is', () => {
      const state = createGameState({ answer: 'LEGACY' });
      localStorageMock.setItem('batagames.game.v1', JSON.stringify(state));
      
      const loaded = loadGameState(null);
      expect(loaded?.answer).toBe('LEGACY');
    });

    it('returns null for invalid JSON', () => {
      localStorageMock.setItem('batagames.game.v1', 'not-json');
      
      const loaded = loadGameState(null);
      expect(loaded).toBeNull();
    });

    it('returns null for missing answer in legacy format', () => {
      const state = { v: 1 };
      localStorageMock.setItem('batagames.game.v1', JSON.stringify(state));
      
      const loaded = loadGameState(null);
      expect(loaded).toBeNull();
    });
  });
});

