export function getPublicSiteUrl(): string {
  // Prefer explicit configuration.
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL;

  if (configured) {
    return configured.startsWith("http") ? configured : `https://${configured}`;
  }

  // Browser fallback.
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // Last resort for local dev.
  return "http://localhost:3000";
}
