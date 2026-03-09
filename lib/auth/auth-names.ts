// Supabase Auth requires an email for password auth.
// For username-based login we map the username to a deterministic synthetic email.
//
// IMPORTANT: Supabase validates emails (including TLD). Some pseudo-TLDs like `.local`
// may be rejected. Use a valid domain-like TLD.
const USERNAME_DOMAIN = "@batagames.app";

export function normalizeUsername(input: string) {
  return input.trim().toLowerCase();
}

function looksLikeEmail(input: string) {
  // lightweight check; Supabase will do full validation
  return input.includes("@") && input.includes(".");
}

export function usernameToEmail(input: string) {
  const u = normalizeUsername(input);

  // If the user typed an actual email, use it directly.
  if (looksLikeEmail(u)) return u;

  // Otherwise, build a synthetic email from the username.
  // Allow a-z, 0-9, underscore, dash, dot
  const safe = u.replace(/[^a-z0-9_.-]/g, "");
  return `${safe}${USERNAME_DOMAIN}`;
}
