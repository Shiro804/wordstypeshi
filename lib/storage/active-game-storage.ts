/**
 * Generic active game storage for Puzzle Hub games.
 * Stores current game state to localStorage with user scoping.
 * 
 * Includes elapsed time tracking to fix timer persistence across sessions.
 */

const STORAGE_KEY_PREFIX = "puzzlehub.activegame";

/** Maximum allowed game duration before auto-reset (24 hours) */
const MAX_GAME_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Wrapper for saved game state that includes elapsed time tracking.
 * This ensures timers persist correctly across browser sessions.
 */
export interface SavedGameWrapper<T> {
  /** The actual game state */
  gameState: T;
  /** Elapsed play time in milliseconds at time of save */
  elapsedMs: number;
  /** Timestamp when the game was saved */
  savedAtMs: number;
  /** Version for future migrations */
  v: 2;
}

/**
 * Get the storage key for a specific game and user.
 */
function getStorageKey(gameId: string, userId?: string | null): string {
  if (userId) {
    return `${STORAGE_KEY_PREFIX}.${gameId}.${userId}`;
  }
  return `${STORAGE_KEY_PREFIX}.${gameId}`;
}

/**
 * Check if data is in the new wrapper format
 */
function isWrappedFormat<T>(data: unknown): data is SavedGameWrapper<T> {
  return typeof data === 'object' && data !== null && 'v' in data && (data as SavedGameWrapper<T>).v === 2;
}

/**
 * Load active game from storage.
 * Returns the game state with startedAtMs adjusted to preserve correct elapsed time.
 */
export function loadActiveGame<T extends { startedAtMs: number }>(
  gameId: string, 
  userId?: string | null
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getStorageKey(gameId, userId);
    let raw = window.localStorage.getItem(key);
    
    // Fallback migration logic: check anonymous key if user key is missing
    if (!raw && userId) {
      const anonKey = getStorageKey(gameId, null);
      const anonRaw = window.localStorage.getItem(anonKey);
      if (anonRaw) {
        // Migrate to user key (safe because user key is empty)
        window.localStorage.setItem(key, anonRaw);
        window.localStorage.removeItem(anonKey);
        console.log(`[active-game-storage] Migrated anonymous game to user ${userId}`);
        raw = anonRaw;
      }
    }
    
    // Legacy Wordle migration: check old batagames.game.v1 key
    if (!raw && gameId === 'wordle') {
      const legacyKey = userId ? `batagames.game.v1.${userId}` : 'batagames.game.v1';
      const legacyRaw = window.localStorage.getItem(legacyKey);
      if (legacyRaw) {
        try {
          const legacyParsed = JSON.parse(legacyRaw);
          // Check for legacy WrappedGameState (v2) format
          if (legacyParsed.v === 2 && legacyParsed.gameState) {
            // Already wrapped, just migrate the key
            window.localStorage.setItem(key, legacyRaw);
            window.localStorage.removeItem(legacyKey);
            console.log(`[active-game-storage] Migrated Wordle from legacy wrapped format`);
            raw = legacyRaw;
          } else if (legacyParsed.v === 1 && legacyParsed.answer) {
            // Old PersistedGameState format - convert to new format
            const startedAtMs = legacyParsed.startedAtMs ?? Date.now();
            const elapsedMs = legacyParsed.startedAtMs ? Date.now() - legacyParsed.startedAtMs : 0;
            const wrapped = {
              gameState: { ...legacyParsed, startedAtMs },
              elapsedMs,
              savedAtMs: Date.now(),
              v: 2,
            };
            const wrappedJson = JSON.stringify(wrapped);
            window.localStorage.setItem(key, wrappedJson);
            window.localStorage.removeItem(legacyKey);
            console.log(`[active-game-storage] Migrated Wordle from legacy v1 format`);
            raw = wrappedJson;
          }
        } catch (e) {
          console.warn(`[active-game-storage] Failed to migrate legacy Wordle data`, e);
        }
      }
    }

    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    
    // Handle new wrapped format with elapsed time tracking
    if (isWrappedFormat<T>(parsed)) {
      const { gameState, elapsedMs } = parsed;
      
      // Safety net: discard games that have been running for over 24 hours
      if (elapsedMs > MAX_GAME_DURATION_MS) {
        console.log(`[active-game-storage] Discarding stale game (${Math.round(elapsedMs / 1000 / 60)}min elapsed)`);
        window.localStorage.removeItem(key);
        return null;
      }
      
      // Reconstruct startedAtMs so that elapsed time is preserved correctly
      // newStartedAtMs = now - elapsedMs (so timer shows correct elapsed time)
      const adjustedState = {
        ...gameState,
        startedAtMs: Date.now() - elapsedMs,
      };
      console.log(`[active-game-storage] Loaded game with ${Math.round(elapsedMs / 1000)}s elapsed time`);
      return adjustedState;
    }
    
    // Legacy format: return as-is (old games will show wrong timer once, then be fixed on next save)
    console.log(`[active-game-storage] Loaded legacy format game (timer may be incorrect)`);
    return parsed as T;
  } catch (e) {
    console.error(`Failed to load active game for ${gameId}`, e);
    return null;
  }
}

/**
 * Save active game to storage.
 * Calculates and stores elapsed time for correct timer restoration.
 */
export function saveActiveGame<T extends { startedAtMs: number }>(
  gameId: string, 
  state: T | null, 
  userId?: string | null
) {
  if (typeof window === "undefined") return;
  const key = getStorageKey(gameId, userId);
  
  if (state === null) {
    console.log(`[active-game-storage] Removing active game: ${key}`);
    window.localStorage.removeItem(key);
  } else {
    // Calculate elapsed time and save in new format
    const elapsedMs = Date.now() - state.startedAtMs;
    const wrapper: SavedGameWrapper<T> = {
      gameState: state,
      elapsedMs,
      savedAtMs: Date.now(),
      v: 2,
    };
    window.localStorage.setItem(key, JSON.stringify(wrapper, (_k, v) => {
      if (v instanceof Map) return { __mapEntries: Array.from(v.entries()) };
      if (v instanceof Set) return { __setValues: Array.from(v) };
      return v;
    }));
  }
}
