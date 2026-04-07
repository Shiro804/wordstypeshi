import { Metadata } from 'next';
import BatasFlowGame from "@/components/games/batasflow/BatasFlowGame";

export const metadata: Metadata = {
    title: 'BatasFlow - Connect the Dots | BataGames',
    description: 'Connect matching colored dots by drawing paths. Fill the entire grid in this flow free puzzle game – completely ad-free.',
    keywords: ['flow free puzzle', 'connect dots', 'path puzzle', 'logic game', 'free', 'ad-free', 'BatasFlow'],
    openGraph: {
        title: 'BatasFlow - Connect the Dots | BataGames',
        description: 'Connect matching colored dots by drawing paths. Fill the entire grid!',
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
