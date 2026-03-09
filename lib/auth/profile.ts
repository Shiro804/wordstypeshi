import { createClient } from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  username: string | null;
  avatar_path: string | null;
  preferences: Record<string, unknown>;
};

export async function getMyProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_path, preferences")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return null;
  if (!data) return { id: user.id, username: null, avatar_path: null, preferences: {} };

  return {
    id: data.id,
    username: data.username ?? null,
    avatar_path: ((data as Record<string, unknown>).avatar_path as string) ?? null,
    preferences: (data as Record<string, unknown>).preferences as Record<string, unknown> ?? {},
  };
}

export async function upsertMyProfile(profile: {
  username: string | null;
  avatar_path?: string | null;
  preferences?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Not authenticated");

  const username = profile.username?.trim() ? profile.username.trim() : null;

  const updates: Record<string, unknown> = {
    id: user.id,
    username,
  };

  if (profile.avatar_path !== undefined) updates.avatar_path = profile.avatar_path;
  if (profile.preferences !== undefined) updates.preferences = profile.preferences;

  const { error } = await supabase
    .from("profiles")
    .upsert(updates, { onConflict: "id" });

  if (error) throw error;
}
