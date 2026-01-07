import { createClient } from "@/lib/supabase/client";
import { loadPreferences, savePreferences, type GamePreferences } from "@/lib/storage/preferences-storage";

export async function syncPreferences(gameId: string, userId: string): Promise<GamePreferences | null> {
  if (!userId) return null;

  const supabase = createClient();
  const local = loadPreferences(gameId, userId);

  // Fetch remote
  const { data: remote } = await supabase
    .from("game_preferences")
    .select("preferences")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .maybeSingle();
    
  // If remote exists, it wins on initial load/sync
  if (remote?.preferences) {
    const remotePrefs = remote.preferences as GamePreferences;
    // Merge? Or just replace?
    // Let's merge remote into local, giving remote precedence
    const merged: GamePreferences = { 
        ...local,
        ...remotePrefs 
    };
    savePreferences(gameId, merged, userId);
    return merged;
  } 
  
  // If no remote but local exists, push local
  if (local && Object.keys(local).length > 0) {
    await upsertRemotePreferences(userId, gameId, local);
  }
  
  return local;
}

export async function upsertRemotePreferences(userId: string, gameId: string, preferences: GamePreferences) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from("game_preferences")
    .upsert({
      user_id: userId,
      game_id: gameId,
      preferences: preferences,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,game_id"
    });
    
  if (error) {
    console.error("Failed to sync preferences", error);
  }
}
