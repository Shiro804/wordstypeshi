import { useState, useEffect, useCallback } from "react";
import { getCurrentUserId } from "@/lib/sync/game-stats-sync";
import { loadPreferences, savePreferences, type GamePreferences } from "@/lib/storage/preferences-storage";
import { syncPreferences, upsertRemotePreferences } from "@/lib/sync/preferences-sync";

const DEBOUNCE_MS = 1000;

export function useGamePreferences(gameId: string) {
  const [preferences, setPreferences] = useState<GamePreferences>(() => {
    return loadPreferences(gameId) || {};
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserId().then(setUserId);
  }, []);

  // Sync on load
  useEffect(() => {
    if (userId) {
      syncPreferences(gameId, userId).then((synced) => {
        if (synced) setPreferences(synced);
      });
    }
  }, [userId, gameId]);

  // Save changes (debounced sync, immediate local)
  const updatePreferences = useCallback((newPrefs: GamePreferences) => {
    setPreferences(newPrefs);
    // Optimistic local save
    savePreferences(gameId, newPrefs, userId);

    // Sync to remote? We should debounce this to avoid too many DB calls for color slider
    // For now we just sync optimistic. But ideally we use a persistent saver.
  }, [gameId, userId]);

  // Debounced Remote Sync
  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => {
      if (Object.keys(preferences).length > 0) {
        void upsertRemotePreferences(userId, gameId, preferences);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [preferences, userId, gameId]);
  
  // Actually, I need to fix the DB schema first if I want to support duckColor persistence remotely.
  // For now I will mock the persistence of duckColor or just use local storage for it if DB doesn't support it yet.
  // But user wants "supabase sql erweiterung".
  
  return { preferences, updatePreferences };
}
