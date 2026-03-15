import { Metadata } from 'next';
import BatasFlowGame from "@/components/games/batasflow/BatasFlowGame";

export const metadata: Metadata = {
    title: 'BatasFlow – Verbinde farbige Punkte',
    description: 'Verbinde farbige Punktepaare durch Pfade, die das gesamte Spielfeld ausfüllen – komplett werbefrei.',
    keywords: ['Flow Puzzle', 'Verbindungsspiel', 'Logikspiel', 'Punkte verbinden', 'kostenlos', 'werbefrei'],
    openGraph: {
        title: 'BatasFlow – Verbinde farbige Punkte',
        description: 'Verbinde farbige Punktepaare durch Pfade!',
        images: ['/og-batasflow.png'],
        type: 'website',
    },
    alternates: {
        canonical: 'https://www.batagames.com/batasflow',
    },
};

export default function BatasFlowPage() {
    return <BatasFlowGame />;
}
