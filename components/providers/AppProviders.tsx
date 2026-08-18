"use client";

import { FlimmerPairProvider } from "@/components/games/batasflimmer/FlimmerPairProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <FlimmerPairProvider>{children}</FlimmerPairProvider>;
}
