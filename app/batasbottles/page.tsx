import { Metadata } from 'next';
import BatasBottlesGame from "@/components/games/batasbottles/BatasBottlesGame";

export const metadata: Metadata = {
    title: 'BatasBottles - Pour & Fill Puzzle | BataGames',
    description: 'Pour colored liquids between bottles and fill the big central flask with a single color. A relaxing color-sort puzzle – completely ad-free.',
    keywords: ['color sort', 'bottle pour', 'liquid puzzle', 'sort puzzle', 'brain game', 'free', 'ad-free', 'BatasBottles'],
    openGraph: {
        title: 'BatasBottles - Pour & Fill Puzzle | BataGames',
        description: 'Pour liquids between bottles to fill the big central flask with one pure color!',
        images: ['/og-batasbottles.png'],
        type: 'website',
    },
    alternates: {
        canonical: 'https://www.batagames.com/batasbottles',
    },
};

export default function BatasBottlesPage() {
    return <BatasBottlesGame />;
}
