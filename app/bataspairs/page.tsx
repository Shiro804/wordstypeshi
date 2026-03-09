import { Metadata } from 'next';
import BatasPairsGame from "@/components/games/bataspairs/BatasPairsGame";

export const metadata: Metadata = {
    title: 'BatasPairs – Memory Kartenspiel',
    description: 'Finde alle passenden Paare! Decke Karten auf und trainiere dein Gedächtnis – komplett werbefrei.',
    keywords: ['Memory Spiel', 'Kartenspiel', 'Gedächtnisspiel', 'Paare finden', 'kostenlos', 'werbefrei'],
    openGraph: {
        title: 'BatasPairs – Memory Kartenspiel',
        description: 'Finde alle passenden Paare! Trainiere dein Gedächtnis.',
        images: ['/og-bataspairs.png'],
        type: 'website',
    },
    alternates: {
        canonical: 'https://www.batagames.com/bataspairs',
    },
};

export default function BatasPairsPage() {
    return <BatasPairsGame />;
}
