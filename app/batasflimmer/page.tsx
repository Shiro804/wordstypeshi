import { Metadata } from "next";
import BatasFlimmerGame from "@/components/games/batasflimmer/BatasFlimmerGame";

export const metadata: Metadata = {
  title: "BatasFlimmer",
  robots: { index: false, follow: false },
};

export default function BatasFlimmerPage() {
  return <BatasFlimmerGame />;
}
