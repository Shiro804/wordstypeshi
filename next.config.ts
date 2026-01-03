import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app relies on per-request Supabase cookies/session for auth.
  // Keeping Cache Components enabled breaks dynamic route configuration.
  cacheComponents: false,
};

export default nextConfig;
