import { Metadata } from "next";
import BatasColorsGame from "@/components/games/batascolors/BatasColorsGame";

export const metadata: Metadata = {
    title: "BatasColors - Mix Colors to Match the Target",
    description: "A color mixing puzzle game. Assign colors to pie chart segments and blend the perfect shade to match the target color.",
    openGraph: {
        title: "BatasColors - Color Mixing Puzzle",
        description: "Can you mix the perfect shade? Assign colors to segments and create the target color!",
    },
};

export default function BatasColorsPage() {
    return <BatasColorsGame />;
}
