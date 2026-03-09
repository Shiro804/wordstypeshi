import { createClient } from "@/lib/supabase/client";

/**
 * Check if a username is available (not already taken by another user)
 * @param username The username to check
 * @param currentUserId Optional - exclude current user from check
 * @returns true if available, false if taken
 */
export async function checkUsernameAvailability(
  username: string,
  currentUserId?: string
): Promise<boolean> {
  const supabase = createClient();
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername || normalizedUsername.length < 2) {
    return false;
  }

  let query = supabase
    .from("profiles")
    .select("id")
    .ilike("username", normalizedUsername)
    .limit(1);

  // If we have a current user ID, exclude them from the check
  if (currentUserId) {
    query = query.neq("id", currentUserId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error checking username availability:", error);
    // In case of error, assume not available for safety
    return false;
  }

  // Available if no results found
  return !data || data.length === 0;
}

/**
 * Validate username format
 * @returns null if valid, error message if invalid
 */
export function validateUsernameFormat(username: string): string | null {
  const trimmed = username.trim();

  if (trimmed.length === 0) {
    return null; // Empty is allowed (optional)
  }

  if (trimmed.length < 2) {
    return "Username muss mindestens 2 Zeichen lang sein";
  }

  if (trimmed.length > 20) {
    return "Username darf maximal 20 Zeichen lang sein";
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return "Nur Buchstaben, Zahlen, _, . und - erlaubt";
  }

  return null;
}
