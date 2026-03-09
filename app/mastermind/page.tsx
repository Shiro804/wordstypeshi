import { Metadata } from 'next';
import MastermindGame from "@/components/games/mastermind/MastermindGame";

export const metadata: Metadata = {
    title: 'BatasMind – Mastermind Farbcode Spiel',
    description: 'Knacke den geheimen Farbcode durch logisches Denken! Mastermind-Spiel komplett werbefrei – trainiere dein Gehirn mit diesem klassischen Denkspiel.',
    keywords: ['Mastermind Spiel', 'Farbcode', 'Logikspiel', 'Denkspiel', 'kostenlos', 'werbefrei'],
    openGraph: {
        title: 'BatasMind – Mastermind Farbcode Spiel',
        description: 'Knacke den geheimen Farbcode durch logisches Denken!',
        images: ['/og-mastermind.png'],
        type: 'website',
    },
    alternates: {
        canonical: 'https://www.batagames.com/mastermind',
    },
};

export default function MastermindPage() {
    return <MastermindGame />;
}
