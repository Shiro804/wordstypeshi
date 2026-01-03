import { createClient } from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  username: string | null;
};

export async function getMyProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return null;
  if (!data) return { id: user.id, username: null };

  return {
    id: data.id,
    username: data.username ?? null,
  };
}

export async function upsertMyProfile(profile: { username: string | null }): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Not authenticated");

  const username = profile.username?.trim() ? profile.username.trim() : null;

  const { error } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        username,
      },
      { onConflict: "id" },
    );

  if (error) throw error;
}
