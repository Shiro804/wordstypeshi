export const FLIMMER_USERNAMES = ["SuperBata1804", "SuperSelim0606"] as const;

export type FlimmerUsername = (typeof FLIMMER_USERNAMES)[number];

export function normalizeFlimmerName(username: string): string {
  return username.trim().toLowerCase();
}

export function isFlimmerUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  const n = normalizeFlimmerName(username);
  return FLIMMER_USERNAMES.some((allowed) => normalizeFlimmerName(allowed) === n);
}

export function canonicalFlimmerName(username: string): FlimmerUsername | null {
  const n = normalizeFlimmerName(username);
  return FLIMMER_USERNAMES.find((allowed) => normalizeFlimmerName(allowed) === n) ?? null;
}

export function flimmerPartnerOf(username: string): FlimmerUsername | null {
  const self = canonicalFlimmerName(username);
  if (!self) return null;
  return FLIMMER_USERNAMES.find((name) => name !== self) ?? null;
}
