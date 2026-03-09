import { createClient } from "@/lib/supabase/client";

export const AVATAR_BUCKET = "avatars";

export function getAvatarPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const supabase = createClient();
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl ?? null;
}

export async function deleteMyAvatarObject(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw error;
}

function extFromMime(mime: string | undefined): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    default:
      return "bin";
  }
}

export async function uploadMyAvatar(file: File): Promise<{ path: string }> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Not authenticated");

  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }

  // 2MB cap (adjust if you want)
  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Image too large (max 2MB)");
  }

  const ext = extFromMime(file.type);
  const safeExt = ext === "bin" ? "png" : ext;
  // Use a unique filename per upload to avoid stale cached images (especially on iOS PWA).
  const path = `${user.id}/avatar_${Date.now()}.${safeExt}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;
  return { path };
}
