import { createClient } from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  username: string | null;
  avatar_path: string | null;
};

export async function getMyProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return null;
  if (!data) return { id: user.id, username: null, avatar_path: null };

  return {
    id: data.id,
    username: data.username ?? null,
    avatar_path: (data as any).avatar_path ?? null,
  };
}

export async function upsertMyProfile(profile: { username: string | null; avatar_path?: string | null }): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Not authenticated");

  const username = profile.username?.trim() ? profile.username.trim() : null;

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        username,
        ...(profile.avatar_path !== undefined ? { avatar_path: profile.avatar_path } : {}),
      },
      { onConflict: "id" },
    );

  if (error) throw error;
}
