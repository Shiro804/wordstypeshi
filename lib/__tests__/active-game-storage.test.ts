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
    it('saves anonymous game', () => {
      const state = { foo: 'bar' };
      storage.saveActiveGame('test-game', state, null);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'puzzlehub.activegame.test-game', 
        JSON.stringify(state)
      );
    });

    it('saves user-scoped game', () => {
      const state = { foo: 'bar' };
      storage.saveActiveGame('test-game', state, 'user-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'puzzlehub.activegame.test-game.user-123', 
        JSON.stringify(state)
      );
    });

    it('removes item when state is null', () => {
      storage.saveActiveGame('test-game', null, null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('puzzlehub.activegame.test-game');
    });
  });

  describe('loadActiveGame', () => {
    it('loads anonymous game', () => {
      const state = { foo: 'bar' };
      localStorageMock.setItem('puzzlehub.activegame.test-game', JSON.stringify(state));
      
      const loaded = storage.loadActiveGame('test-game', null);
      expect(loaded).toEqual(state);
    });

    it('loads user-scoped game', () => {
      const state = { foo: 'bar' };
      localStorageMock.setItem('puzzlehub.activegame.test-game.user-123', JSON.stringify(state));
      
      const loaded = storage.loadActiveGame('test-game', 'user-123');
      expect(loaded).toEqual(state);
    });

    it('migrates anonymous game to user scope', () => {
      const state = { foo: 'bar' };
      localStorageMock.setItem('puzzlehub.activegame.test-game', JSON.stringify(state));
      
      // Load with user ID, but user data is missing
      const loaded = storage.loadActiveGame('test-game', 'user-123');
      
      expect(loaded).toEqual(state);
      // expect migration happened
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'puzzlehub.activegame.test-game.user-123', 
        JSON.stringify(state)
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('puzzlehub.activegame.test-game');
    });
  });
});
