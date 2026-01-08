import { Metadata } from 'next';
import WordleGame from "@/components/games/wordle/WordleGame";

export const metadata: Metadata = {
    title: 'BatasWordle – Deutsches Wordle ohne Werbung',
    description: 'Errate das 5-Buchstaben-Wort in 6 Versuchen. Täglich ein neues Rätsel – komplett auf Deutsch und 100% werbefrei! Teste dein Wortschatz-Wissen.',
    keywords: ['Wordle deutsch', 'Wordle online', 'Wortspiel', '5 Buchstaben', 'Worträtsel', 'täglich'],
    openGraph: {
        title: 'BatasWordle – Deutsches Wordle ohne Werbung',
        description: 'Errate das 5-Buchstaben-Wort in 6 Versuchen. Täglich ein neues Rätsel!',
        images: ['/og-wordle.png'],
        type: 'website',
    },
    alternates: {
        canonical: 'https://www.batagames.com/wordle',
    },
};

export default function WordlePage() {
    return <WordleGame />;
}
