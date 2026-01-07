import { createClient } from "@/lib/supabase/client";
import { getMyProfile, upsertMyProfile } from "@/lib/auth/profile";

const BUCKET = "user-content";

/**
 * Upload a background image to Supabase Storage and update the user's profile.
 * Returns the public URL of the uploaded image.
 */
export async function uploadRemoteBackground(file: File, gameId: string): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in to upload background");

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image too large. Max 5MB.");
  }

  // Optimize usage: Delete old background if exists (optional, could be complex to track)
  // For now, just generate a new path.
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${gameId}-${Date.now()}.${ext}`;

  // Upload
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  // Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  // Update Profile Preferences
  const profile = await getMyProfile();
  const preferences = profile?.preferences || {};
  
  // Ensure 'backgrounds' object exists
  const backgrounds = preferences.backgrounds || {};
  backgrounds[gameId] = publicUrl;

  // Save back
  await upsertMyProfile({ 
    username: profile?.username ?? null,
    preferences: { ...preferences, backgrounds } 
  });

  return publicUrl;
}

/**
 * Clear the remote background for a game.
 */
export async function clearRemoteBackground(gameId: string): Promise<void> {
  const profile = await getMyProfile();
  if (!profile) return;

  const preferences = profile.preferences || {};
  const backgrounds = preferences.backgrounds || {};

  if (backgrounds[gameId]) {
    delete backgrounds[gameId];
    await upsertMyProfile({
      username: profile.username,
      preferences: { ...preferences, backgrounds }
    });
  }
}

/**
 * Get the remote background URL for a game from the profile.
 * (This fetches the profile fresh, so use sparingly or rely on cached profile)
 */
export async function fetchRemoteBackground(gameId: string): Promise<string | null> {
  const profile = await getMyProfile();
  if (!profile?.preferences?.backgrounds) return null;
  return profile.preferences.backgrounds[gameId] || null;
}
