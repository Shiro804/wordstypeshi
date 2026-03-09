import { Metadata } from 'next';
import BatasBlastGame from "@/components/games/batasblast/BatasBlastGame";

export const metadata: Metadata = {
    title: 'BatasBlast – Block Puzzle Spiel',
    description: 'Platziere Blöcke auf dem 8×8 Raster und räume Reihen ab! Süchtig machendes Puzzle-Spiel – komplett werbefrei und kostenlos.',
    keywords: ['Block Puzzle', 'Tetris', 'Puzzle Spiel', 'Reihen räumen', 'kostenlos', 'werbefrei'],
    openGraph: {
        title: 'BatasBlast – Block Puzzle Spiel',
        description: 'Platziere Blöcke auf dem 8×8 Raster und räume Reihen ab!',
        images: ['/og-batasblast.png'],
        type: 'website',
    },
    alternates: {
        canonical: 'https://www.batagames.com/batasblast',
    },
};

export default function BatasBlastPage() {
    return <BatasBlastGame />;
}
