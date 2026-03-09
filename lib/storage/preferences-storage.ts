/**
 * Local storage for game preferences (background color, etc.)
 */

const PREF_KEY_PREFIX = "puzzlehub.preferences";

export interface GamePreferences {
  backgroundImage?: string | null;
  backgroundColor?: string;
  duckColor?: string;
  duckBellyColor?: string;
  beakColor?: string;
  eyeColor?: string;
  themeMode?: "dark" | "light";
}

function getStorageKey(gameId: string, userId?: string | null): string {
  if (userId) {
    return `${PREF_KEY_PREFIX}.${gameId}.${userId}`;
  }
  return `${PREF_KEY_PREFIX}.${gameId}`;
}

export function loadPreferences(gameId: string, userId?: string | null): GamePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getStorageKey(gameId, userId);
    const raw = window.localStorage.getItem(key);
    
    // Check anonymous key migration
    if (!raw && userId) {
      const anonKey = getStorageKey(gameId, null);
      const anonRaw = window.localStorage.getItem(anonKey);
      if (anonRaw) {
        window.localStorage.setItem(key, anonRaw);
        window.localStorage.removeItem(anonKey);
        return JSON.parse(anonRaw) as GamePreferences;
      }
    }

    if (!raw) return null;
    return JSON.parse(raw) as GamePreferences;
  } catch (e) {
    console.error(`Failed to load preferences for ${gameId}`, e);
    return null;
  }
}

export function savePreferences(gameId: string, prefs: GamePreferences, userId?: string | null) {
  if (typeof window === "undefined") return;
  const key = getStorageKey(gameId, userId);
  window.localStorage.setItem(key, JSON.stringify(prefs));
}
