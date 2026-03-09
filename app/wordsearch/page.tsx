import { Metadata } from 'next';
import WordSearchGame from "@/components/games/wordsearch/WordSearchGame";

export const metadata: Metadata = {
    title: 'BatasSearch – Wörter Suchen Spiel',
    description: 'Finde alle versteckten Wörter im Buchstabengitter! Wortsuchspiel auf Deutsch mit verschiedenen Schwierigkeitsgraden – komplett werbefrei.',
    keywords: ['Wortsuchspiel', 'Wörter suchen', 'Buchstabenrätsel', 'Wortgitter', 'Puzzle', 'kostenlos'],
    openGraph: {
        title: 'BatasSearch – Wörter Suchen Spiel',
        description: 'Finde alle versteckten Wörter im Buchstabengitter!',
        images: ['/og-wordsearch.png'],
        type: 'website',
    },
    alternates: {
        canonical: 'https://www.batagames.com/wordsearch',
    },
};

export default function WordSearchPage() {
    return <WordSearchGame initialDifficulty="medium" />;
}
