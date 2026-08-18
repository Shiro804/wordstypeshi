import { Metadata } from 'next';
import WordleGame from "@/components/games/wordle/WordleGame";

export const metadata: Metadata = {
    title: 'BatasWordle – Ad-free Wordle (English words)',
    description: 'Guess the 5-letter English word in 6 tries. Ad-free Wordle — answers are English, not German.',
    keywords: ['Wordle', 'Wordle online', 'word game', '5 letters', 'English Wordle', 'ad-free'],
    openGraph: {
        title: 'BatasWordle – Ad-free Wordle (English words)',
        description: 'Guess the 5-letter English word in 6 tries. Ad-free Wordle.',
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
