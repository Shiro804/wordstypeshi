import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.batagames.com'),
  title: {
    default: 'BataGames – Kostenlose Wortspiele ohne Werbung',
    template: '%s | BataGames',
  },
  description: 'Spiele Wordle, Mastermind und Wortsuchspiele komplett werbefrei. BataGames bietet saubere, schnelle Puzzle-Spiele für jeden Tag – auf Deutsch!',
  keywords: [
    'Wordle', 'Wordle deutsch', 'Wortspiel online',
    'Mastermind Spiel', 'Wortsuchspiel', 'kostenlose Spiele',
    'werbefrei', 'Puzzle Spiele', 'Denkspiele', 'BataGames'
  ],
  authors: [{ name: 'BataGames' }],
  creator: 'BataGames',
  publisher: 'BataGames',
  applicationName: 'BataGames',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://www.batagames.com',
    siteName: 'BataGames',
    title: 'BataGames – Kostenlose Wortspiele ohne Werbung',
    description: 'Spiele Wordle, Mastermind und Wortsuchspiele komplett werbefrei.',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'BataGames - Puzzle Spiele',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BataGames – Kostenlose Wortspiele',
    description: 'Wortspiele komplett werbefrei spielen.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://www.batagames.com',
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${manrope.variable} ${fraunces.variable} dark`}>
      <head>
        {/* iOS home screen (Safari → Add to Home Screen) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BataGames" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-dvh bg-[color:var(--bg)] text-[color:var(--fg)]">
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
