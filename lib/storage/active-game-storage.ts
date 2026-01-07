/**
 * Generic active game storage for Puzzle Hub games.
 * Stores current game state to localStorage with user scoping.
 */

const STORAGE_KEY_PREFIX = "puzzlehub.activegame";

/**
 * Get the storage key for a specific game and user.
 */
function getStorageKey(gameId: string, userId?: string | null): string {
  if (userId) {
    return `${STORAGE_KEY_PREFIX}.${gameId}.${userId}`;
  }
  return `${STORAGE_KEY_PREFIX}.${gameId}`;
}

export function loadActiveGame<T>(gameId: string, userId?: string | null): T | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getStorageKey(gameId, userId);
    const raw = window.localStorage.getItem(key);
    
    // Fallback migration logic: check anonymous key if user key is missing
    if (!raw && userId) {
      const anonKey = getStorageKey(gameId, null);
      const anonRaw = window.localStorage.getItem(anonKey);
      if (anonRaw) {
        // Migrate to user key
        window.localStorage.setItem(key, anonRaw);
        window.localStorage.removeItem(anonKey);
        return JSON.parse(anonRaw) as T;
      }
    }

    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Failed to load active game for ${gameId}`, e);
    return null;
  }
}

export function saveActiveGame<T>(gameId: string, state: T | null, userId?: string | null) {
  if (typeof window === "undefined") return;
  const key = getStorageKey(gameId, userId);
  if (state === null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, JSON.stringify(state));
  }
}
