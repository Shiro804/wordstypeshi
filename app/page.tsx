import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Palette, Type, Search, LayoutGrid } from "lucide-react";

export const dynamic = "force-dynamic";

// Game cards data
const GAMES = [
  {
    id: "wordle",
    name: "BatasWordle",
    description: "Errate das 5-Buchstaben-Wort in 6 Versuchen!",
    icon: Type,
    href: "/wordle",
    color: "from-emerald-500 to-green-600",
    enabled: true,
  },
  {
    id: "mastermind",
    name: "BatasMind",
    description: "Knacke den geheimen Farbcode durch logisches Denken!",
    icon: Palette,
    href: "/mastermind",
    color: "from-purple-500 to-pink-600",
    enabled: true,
  },
  {
    id: "wordsearch",
    name: "BatasSearch",
    description: "Finde alle versteckten Wörter im Buchstabengitter!",
    icon: Search,
    href: "/wordsearch",
    color: "from-blue-500 to-cyan-600",
    enabled: true,
  },
  {
    id: "batasblast",
    name: "BatasBlast",
    description: "Platziere Blöcke auf dem 8×8 Raster und räume Reihen ab!",
    icon: LayoutGrid,
    href: "/batasblast",
    color: "from-amber-500 to-orange-600",
    enabled: true,
  },
];

export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen text-white relative" style={{ backgroundColor: '#09090b' }}>
      {/* Duck Area - Top third */}
      <div className="h-[33vh] min-h-[200px] flex flex-col items-center justify-center pt-safe relative">
        {/* Title */}
        <h1
          className="font-black text-[clamp(28px,5vw,48px)] text-white/90 text-center select-none mb-2"
          style={{
            fontFamily: 'ui-rounded, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          BataGames
        </h1>

        {/* Duck SVG */}
        <svg
          className="w-[clamp(100px,18vw,160px)] h-auto animate-duck-bob"
          viewBox="0 0 320 320"
          role="img"
          aria-label="Cute duck mascot"
          style={{ filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.15))' }}
        >
          <g>
            {/* Sparkle */}
            <g className="animate-duck-pop origin-center">
              <path d="M252 62c6 10 6 22 0 32c-10 6-22 6-32 0c-6-10-6-22 0-32c10-6 22-6 32 0z" fill="rgba(255,255,255,0.75)" />
            </g>
            {/* Body */}
            <ellipse cx="160" cy="192" rx="118" ry="88" fill="#FFD86B" />
            {/* Belly */}
            <ellipse cx="160" cy="210" rx="68" ry="52" fill="#FFF3C9" />
            {/* Head */}
            <circle cx="160" cy="120" r="72" fill="#FFD86B" />
            {/* Wing */}
            <g className="animate-duck-flap origin-[25%_55%]">
              <ellipse cx="86" cy="198" rx="44" ry="34" fill="rgba(0,0,0,0.06)" />
              <ellipse cx="92" cy="190" rx="48" ry="36" fill="#FFD86B" />
              <ellipse cx="105" cy="194" rx="28" ry="22" fill="#FFF3C9" />
            </g>
            {/* Beak */}
            <path d="M160 140 c26 0 44 10 44 24 c0 14-18 24-44 24 c-26 0-44-10-44-24 c0-14 18-24 44-24z" fill="#FF8B4A" />
            {/* Cheeks */}
            <circle cx="120" cy="158" r="10" fill="rgba(255,120,150,0.18)" />
            <circle cx="200" cy="158" r="10" fill="rgba(255,120,150,0.18)" />
            {/* Left Eye */}
            <g className="animate-duck-blink origin-center">
              <circle cx="136" cy="118" r="10" fill="#1E2430" />
              <circle cx="132" cy="114" r="3.2" fill="rgba(255,255,255,0.9)" />
            </g>
            {/* Right Eye */}
            <g className="animate-duck-blink origin-center">
              <circle cx="184" cy="118" r="10" fill="#1E2430" />
              <circle cx="180" cy="114" r="3.2" fill="rgba(255,255,255,0.9)" />
            </g>
          </g>
        </svg>
      </div>

      {/* Main Content - Starts after duck */}
      <main className="max-w-lg mx-auto px-4 pb-8 relative z-10">
        <div className="mb-4 text-center">
          <p className="text-sm text-zinc-500">Wähle ein Spiel</p>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {GAMES.filter(g => g.enabled).map((game) => {
            const Icon = game.icon;
            return (
              <Link
                key={game.id}
                href={game.href}
                className={`
                  group relative overflow-hidden rounded-xl p-3 md:p-4
                  backdrop-blur-md bg-zinc-900/60 border border-zinc-700/50
                  hover:bg-zinc-800/70 hover:border-zinc-600/60
                  hover:scale-[1.02] transition-all duration-300
                  shadow-lg hover:shadow-2xl
                `}
              >
                {/* Colored accent glow */}
                <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${game.color} opacity-30 blur-2xl group-hover:opacity-50 transition-opacity`} />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                    <div className={`p-2 md:p-2.5 rounded-lg bg-gradient-to-br ${game.color}`}>
                      <Icon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <h3 className="text-base md:text-lg font-bold">{game.name}</h3>
                  </div>
                  <p className="text-xs md:text-sm text-zinc-400 leading-snug line-clamp-2">
                    {game.description}
                  </p>

                  {/* Play indicator */}
                  <div className="mt-3 md:mt-4 flex items-center gap-1.5 text-xs md:text-sm text-zinc-400 group-hover:text-white transition">
                    <span className="font-medium">Play</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Coming Soon */}
        <div className="mt-12 text-center">
          <p className="text-zinc-500">More games coming soon...</p>
        </div>
      </main>
    </div>
  );
}
