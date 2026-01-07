import type { Difficulty } from "@/lib/difficulty";
import type { GridRow } from "@/components/Grid";

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

const STORAGE_KEY_BASE = "wordstypeshi.game.v1";

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
        // Migrate anonymous state to user-scoped storage
        const parsed = JSON.parse(raw) as PersistedGameState;
        if (parsed && parsed.v === 1) {
          // Save to user-scoped key and clear anonymous key
          window.localStorage.setItem(userKey, raw);
          window.localStorage.removeItem(anonKey);
        }
      }
    }
    
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedGameState;
    if (!parsed || parsed.v !== 1) return null;
    if (typeof parsed.answer !== "string") return null;
    return parsed;
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
  window.localStorage.setItem(key, JSON.stringify(state));
}
