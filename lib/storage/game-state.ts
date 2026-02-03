import type { Difficulty } from "@/lib/difficulty";
import type { GridRow } from "@/components/games/common/Grid";

export type PersistedGameState = {
  v: 1;
  difficulty: Difficulty;
  answer: string;
  rows: GridRow[];
  current: string;
  startedAtMs: number | null;
  endedAtMs: number | null;
  hintUsed: boolean;
  sessionId?: string | null;
  /** Scope persisted game to a specific authenticated user (null/undefined = anonymous). */
  userId?: string | null;
};

/**
 * Wrapped format for persisted game state with elapsed time tracking.
 * This ensures timers persist correctly across browser sessions.
 */
export type WrappedGameState = {
  v: 2;
  gameState: PersistedGameState;
  /** Elapsed play time in milliseconds at time of save */
  elapsedMs: number;
  /** Timestamp when the game was saved */
  savedAtMs: number;
};

const STORAGE_KEY_BASE = "batagames.game.v1";

/** Maximum allowed game duration before auto-reset (24 hours) */
const MAX_GAME_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Get the storage key for a specific user.
 * User-scoped keys prevent conflicts between Safari browser and PWA.
 */
export function getStorageKey(userId?: string | null): string {
  if (userId) {
    return `${STORAGE_KEY_BASE}.${userId}`;
  }
  return STORAGE_KEY_BASE;
}

/**
 * Check if data is in the new wrapped format (v2)
 */
function isWrappedFormat(data: unknown): data is WrappedGameState {
  return typeof data === 'object' && data !== null && 'v' in data && (data as WrappedGameState).v === 2;
}

export function loadGameState(userId?: string | null): PersistedGameState | null {
  if (typeof window === "undefined") return null;
  try {
    // Try user-scoped key first, then fall back to anonymous key
    const userKey = getStorageKey(userId);
    let raw = window.localStorage.getItem(userKey);
    
    // If no user-scoped state and we have a userId, also check the anonymous key
    // This handles migration when a user logs in mid-session
    if (!raw && userId) {
      const anonKey = getStorageKey(null);
      raw = window.localStorage.getItem(anonKey);
      if (raw) {
        // Migrate to user-scoped key
        window.localStorage.setItem(userKey, raw);
        window.localStorage.removeItem(anonKey);
        console.log(`[game-state] Migrated anonymous game to user ${userId}`);
      }
    }
    
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    
    // Handle new wrapped format (v2) with elapsed time tracking
    if (isWrappedFormat(parsed)) {
      const { gameState, elapsedMs } = parsed;
      
      // Safety net: discard games that have been running for over 24 hours
      if (elapsedMs > MAX_GAME_DURATION_MS) {
        console.log(`[game-state] Discarding stale game (${Math.round(elapsedMs / 1000 / 60)}min elapsed)`);
        window.localStorage.removeItem(userKey);
        return null;
      }
      
      // Reconstruct startedAtMs so that elapsed time is preserved correctly
      // Only adjust if game is still in progress (startedAtMs exists but not endedAtMs)
      if (gameState.startedAtMs && !gameState.endedAtMs) {
        const adjustedState: PersistedGameState = {
          ...gameState,
          startedAtMs: Date.now() - elapsedMs,
        };
        console.log(`[game-state] Loaded game with ${Math.round(elapsedMs / 1000)}s elapsed time`);
        return adjustedState;
      }
      
      // Game was finished, return as-is
      return gameState;
    }
    
    // Legacy format (v1): return as-is
    const legacyParsed = parsed as PersistedGameState;
    if (!legacyParsed || legacyParsed.v !== 1) return null;
    if (typeof legacyParsed.answer !== "string") return null;
    console.log(`[game-state] Loaded legacy format game (timer may be incorrect once)`);
    return legacyParsed;
  } catch {
    return null;
  }
}

export function saveGameState(state: PersistedGameState | null, userId?: string | null) {
  if (typeof window === "undefined") return;
  const key = getStorageKey(userId);
  if (!state) {
    window.localStorage.removeItem(key);
    return;
  }
  
  // Calculate elapsed time and save in new wrapped format
  const elapsedMs = state.startedAtMs ? Date.now() - state.startedAtMs : 0;
  const wrapped: WrappedGameState = {
    v: 2,
    gameState: state,
    elapsedMs,
    savedAtMs: Date.now(),
  };
  window.localStorage.setItem(key, JSON.stringify(wrapped));
}

