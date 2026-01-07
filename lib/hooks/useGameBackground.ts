import { useState, useEffect } from "react";
import { getCustomBackground } from "@/lib/background-storage";
import { fetchRemoteBackground } from "@/lib/remote-backgrounds";
import { getCurrentUserId } from "@/lib/game-stats-sync"; 

export function useGameBackground(gameId: string) {
  const [background, setBackground] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      // 1. Try Remote first (if logged in)
      const userId = await getCurrentUserId();
      if (userId) {
        try {
          const remote = await fetchRemoteBackground(gameId);
          if (remote) {
            if (mounted) {
                setBackground(remote);
                setIsLoading(false);
            }
            return;
          }
        } catch (e) {
          // ignore error, fall back to local
        }
      }

      // 2. Fall back to Local
      const local = getCustomBackground(gameId);
      if (mounted) {
          setBackground(local);
          setIsLoading(false);
      }
    }

    load();

    return () => { mounted = false; };
  }, [gameId]);

  return { background, setBackground, isLoading };
}
