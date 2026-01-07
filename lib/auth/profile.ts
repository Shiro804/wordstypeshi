import { createClient } from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  username: string | null;
  avatar_path: string | null;
  preferences: Record<string, any>;
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
    avatar_path: (data as any).avatar_path ?? null,
    preferences: (data as any).preferences ?? {},
  };
}

export async function upsertMyProfile(profile: {
  username: string | null;
  avatar_path?: string | null;
  preferences?: Record<string, any>;
}): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Not authenticated");

  const username = profile.username?.trim() ? profile.username.trim() : null;

  const updates: any = {
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
