import { Metadata } from 'next';
import BatasMineGame from "@/components/games/batasmine/BatasMineGame";

export const metadata: Metadata = {
    title: 'BatasMine – Minesweeper Puzzle',
    description: 'Finde alle sicheren Felder ohne eine Mine zu treffen! Klassisches Minesweeper – komplett werbefrei.',
    keywords: ['Minesweeper', 'Minenräumer', 'Puzzle', 'Logikspiel', 'kostenlos', 'werbefrei'],
    openGraph: {
        title: 'BatasMine – Minesweeper Puzzle',
        description: 'Finde alle sicheren Felder ohne eine Mine zu treffen!',
        images: ['/og-batasmine.png'],
        type: 'website',
    },
    alternates: {
        canonical: 'https://www.batagames.com/batasmine',
    },
};

export default function BatasMinePage() {
    return <BatasMineGame />;
}
