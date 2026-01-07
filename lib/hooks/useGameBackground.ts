import { useState, useEffect } from "react";
import { getCustomBackground } from "@/lib/storage/background-storage";
import { fetchRemoteBackground } from "@/lib/remote-backgrounds";
import { getCurrentUserId } from "@/lib/sync/game-stats-sync"; 

export function useGameBackground(gameId: string) {
  // Start with local background immediately (no loading state)
  const [background, setBackground] = useState<string | null>(() => getCustomBackground(gameId));
  const [isLoading, setIsLoading] = useState(false); // Default false - show DuckBackground immediately

  useEffect(() => {
    let mounted = true;

    async function loadRemote() {
      // Only fetch remote if logged in
      const userId = await getCurrentUserId();
      if (!userId || !mounted) return;
      
      try {
        const remote = await fetchRemoteBackground(gameId);
        if (remote && mounted) {
          setBackground(remote);
        }
      } catch (e) {
        // ignore error, keep local/default
      }
    }

    loadRemote();

    return () => { mounted = false; };
  }, [gameId]);

  return { background, setBackground, isLoading };
}
