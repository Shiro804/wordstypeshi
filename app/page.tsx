import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Palette, Type, Gamepad2, Search } from "lucide-react";

export const dynamic = "force-dynamic";

// Game cards data
const GAMES = [
  {
    id: "wordle",
    name: "Wordle",
    description: "Guess the 5-letter word in 6 tries. Get feedback on each guess!",
    icon: Type,
    href: "/wordle",
    color: "from-emerald-500 to-green-600",
    enabled: true,
  },
  {
    id: "mastermind",
    name: "Mastermind",
    description: "Crack the secret color code! Get feedback to deduce the solution.",
    icon: Palette,
    href: "/mastermind",
    color: "from-purple-500 to-pink-600",
    enabled: true,
  },
  {
    id: "wordsearch",
    name: "Word Search",
    description: "Find all hidden words in the letter grid! Multiple difficulty levels.",
    icon: Search,
    href: "/wordsearch",
    color: "from-blue-500 to-cyan-600",
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
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="p-6 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold">BatasHub</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-xl text-zinc-400 mb-2">Choose a game</h2>
          <p className="text-zinc-500">
            Challenge your mind with our collection of puzzle games.
          </p>
        </div>

        {/* Game Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {GAMES.filter(g => g.enabled).map((game) => {
            const Icon = game.icon;
            return (
              <Link
                key={game.id}
                href={game.href}
                className={`
                  group relative overflow-hidden rounded-2xl p-6
                  bg-gradient-to-br ${game.color}
                  hover:scale-[1.02] transition-all duration-300
                  shadow-lg hover:shadow-2xl
                `}
              >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white_1px,transparent_1px)] bg-[length:20px_20px]" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold">{game.name}</h3>
                  </div>
                  <p className="text-white/80 leading-relaxed">
                    {game.description}
                  </p>

                  {/* Play button */}
                  <div className="mt-6 flex items-center gap-2 text-white/90 group-hover:text-white transition">
                    <span className="font-medium">Play Now</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
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
