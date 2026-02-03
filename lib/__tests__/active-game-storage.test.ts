import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as storage from '../storage/active-game-storage';

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

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', {
  localStorage: localStorageMock,
});

describe('active-game-storage', () => {
  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', { localStorage: localStorageMock });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('saveActiveGame', () => {
    it('saves anonymous game with elapsed time wrapper', () => {
      const now = Date.now();
      const state = { foo: 'bar', startedAtMs: now - 5000 }; // 5 seconds ago
      storage.saveActiveGame('test-game', state, null);
      
      // Check that setItem was called
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const call = localStorageMock.setItem.mock.calls[0];
      expect(call[0]).toBe('puzzlehub.activegame.test-game');
      
      // Parse saved data and verify wrapper format
      const saved = JSON.parse(call[1]);
      expect(saved.v).toBe(2);
      expect(saved.gameState).toEqual(state);
      expect(saved.elapsedMs).toBeGreaterThanOrEqual(5000);
      expect(saved.elapsedMs).toBeLessThan(6000);
    });

    it('saves user-scoped game', () => {
      const now = Date.now();
      const state = { foo: 'bar', startedAtMs: now };
      storage.saveActiveGame('test-game', state, 'user-123');
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const call = localStorageMock.setItem.mock.calls[0];
      expect(call[0]).toBe('puzzlehub.activegame.test-game.user-123');
    });

    it('removes item when state is null', () => {
      storage.saveActiveGame('test-game', null, null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('puzzlehub.activegame.test-game');
    });
  });

  describe('loadActiveGame', () => {
    it('loads wrapped format and adjusts startedAtMs', () => {
      const originalStartedAtMs = Date.now() - 10000; // 10 seconds ago
      const wrapper = {
        gameState: { foo: 'bar', startedAtMs: originalStartedAtMs },
        elapsedMs: 5000, // 5 seconds of play time
        savedAtMs: Date.now() - 1000, // saved 1 second ago
        v: 2,
      };
      localStorageMock.setItem('puzzlehub.activegame.test-game', JSON.stringify(wrapper));
      
      const loaded = storage.loadActiveGame<{ foo: string; startedAtMs: number }>('test-game', null);
      
      expect(loaded).not.toBeNull();
      expect(loaded!.foo).toBe('bar');
      // startedAtMs should be adjusted so elapsed time is ~5 seconds
      const elapsedMs = Date.now() - loaded!.startedAtMs;
      expect(elapsedMs).toBeGreaterThanOrEqual(5000);
      expect(elapsedMs).toBeLessThan(6000);
    });

    it('loads legacy format as-is', () => {
      const originalStartedAtMs = Date.now() - 10000;
      const state = { foo: 'bar', startedAtMs: originalStartedAtMs };
      localStorageMock.setItem('puzzlehub.activegame.test-game', JSON.stringify(state));
      
      const loaded = storage.loadActiveGame<{ foo: string; startedAtMs: number }>('test-game', null);
      expect(loaded).toEqual(state);
    });

    it('loads user-scoped game', () => {
      const wrapper = {
        gameState: { foo: 'bar', startedAtMs: Date.now() },
        elapsedMs: 1000,
        savedAtMs: Date.now(),
        v: 2,
      };
      localStorageMock.setItem('puzzlehub.activegame.test-game.user-123', JSON.stringify(wrapper));
      
      const loaded = storage.loadActiveGame<{ foo: string; startedAtMs: number }>('test-game', 'user-123');
      expect(loaded!.foo).toBe('bar');
    });

    it('migrates anonymous game to user scope', () => {
      const wrapper = {
        gameState: { foo: 'bar', startedAtMs: Date.now() },
        elapsedMs: 2000,
        savedAtMs: Date.now(),
        v: 2,
      };
      localStorageMock.setItem('puzzlehub.activegame.test-game', JSON.stringify(wrapper));
      
      // Load with user ID, but user data is missing
      const loaded = storage.loadActiveGame<{ foo: string; startedAtMs: number }>('test-game', 'user-123');
      
      expect(loaded!.foo).toBe('bar');
      // expect migration happened
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'puzzlehub.activegame.test-game.user-123', 
        JSON.stringify(wrapper)
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('puzzlehub.activegame.test-game');
    });
  });
});
