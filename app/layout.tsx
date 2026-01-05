import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BatasWordle",
  description: "Clean, ad-free word puzzle.",
  applicationName: "BatasWordle",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} dark`}>
      <head>
        {/* iOS home screen (Safari → Add to Home Screen) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BatasWordle" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-dvh bg-[color:var(--bg)] text-[color:var(--fg)]">{children}</body>
    </html>
  );
}
