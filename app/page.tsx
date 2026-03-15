"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Palette, Type, Search, LayoutGrid, Droplets, Brain, Bomb, LogIn, UserPlus, Settings, LogOut, User } from "lucide-react";
import { getMyProfile, type UserProfile } from "@/lib/auth/profile";
import UsernameModal from "@/components/auth/UsernameModal";
import ProfileSettingsModal from "@/components/hub/ProfileSettingsModal";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { useLanguage } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Game cards data - descriptions come from translations
const GAMES = [
  {
    id: "wordle" as const,
    icon: Type,
    href: "/wordle",
    color: "from-emerald-500 to-green-600",
    enabled: true,
  },
  {
    id: "mastermind" as const,
    icon: Palette,
    href: "/mastermind",
    color: "from-purple-500 to-pink-600",
    enabled: true,
  },
  {
    id: "wordsearch" as const,
    icon: Search,
    href: "/wordsearch",
    color: "from-blue-500 to-cyan-600",
    enabled: true,
  },
  {
    id: "batasblast" as const,
    icon: LayoutGrid,
    href: "/batasblast",
    color: "from-amber-500 to-orange-600",
    enabled: true,
  },
  {
    id: "batascolors" as const,
    icon: Droplets,
    href: "/batascolors",
    color: "from-rose-500 to-orange-500",
    enabled: true,
  },
  {
    id: "bataspairs" as const,
    icon: Brain,
    href: "/bataspairs",
    color: "from-violet-500 to-indigo-600",
    enabled: true,
  },
  {
    id: "batasmine" as const,
    icon: Bomb,
    href: "/batasmine",
    color: "from-red-500 to-rose-700",
    enabled: true,
  },
];

const USERNAME_MODAL_DISMISSED_KEY = "batagames_username_modal_dismissed";

// Helper to get game info from translations
const getGameInfo = (gameId: string, t: ReturnType<typeof useLanguage>['t']) => {
  const gameTranslations = t[gameId as keyof typeof t] as { name: string; description: string };
  return {
    name: gameTranslations?.name ?? gameId,
    description: gameTranslations?.description ?? '',
  };
};

export default function Page() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const refreshProfile = async () => {
    const p = await getMyProfile();
    setProfile(p);
  };

  useEffect(() => {
    const supabase = createClient();

    // Check auth state
    supabase.auth.getUser().then(({ data }) => {
      const loggedIn = !!data.user;
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        // Fetch profile to check username
        getMyProfile().then((p) => {
          setProfile(p);

          // Show username modal if no username and not dismissed this session
          if (p && !p.username) {
            const dismissed = sessionStorage.getItem(USERNAME_MODAL_DISMISSED_KEY);
            if (!dismissed) {
              setShowUsernameModal(true);
            }
          }
        });
      }
    });
  }, []);

  const handleUsernameModalClose = () => {
    setShowUsernameModal(false);
    sessionStorage.setItem(USERNAME_MODAL_DISMISSED_KEY, "true");
  };

  const handleUsernameSaved = (newUsername: string) => {
    setShowUsernameModal(false);
    setProfile((prev) => (prev ? { ...prev, username: newUsername } : null));
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setProfile(null);
    router.refresh();
  };

  return (
    <div className="min-h-screen text-white relative" style={{ backgroundColor: '#09090b' }}>
      {/* Language Selector - Top Left with safe area offset */}
      <div
        className="absolute left-4 z-20"
        style={{ top: 'max(env(safe-area-inset-top, 0px) + 1rem, 1rem)' }}
      >
        <LanguageSelector />
      </div>

      {/* User Menu - Top Right (for logged-in users) */}
      {isLoggedIn === true && (
        <div
          className="absolute right-4 z-20"
          style={{ top: 'max(env(safe-area-inset-top, 0px) + 1rem, 1rem)' }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-white hover:bg-zinc-700/80 transition-all"
              >
                <User size={16} />
                <span className="text-sm font-medium max-w-24 truncate">
                  {profile?.username || t.hub.profile}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onClick={() => setShowProfileSettings(true)}>
                <Settings size={14} className="mr-2" />
                {t.common.settings}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-400">
                <LogOut size={14} className="mr-2" />
                {t.common.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

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
        {/* Auth buttons for non-logged-in users */}
        {isLoggedIn === false && (
          <div className="mb-6 flex justify-center gap-3">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-white hover:bg-zinc-700/80 transition-all"
            >
              <LogIn size={16} />
              <span>{t.common.login}</span>
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all"
            >
              <UserPlus size={16} />
              <span>{t.common.register}</span>
            </Link>
          </div>
        )}

        {/* Welcome message for logged-in users */}
        {isLoggedIn === true && profile?.username && (
          <div className="mb-4 text-center">
            <p className="text-sm text-zinc-400">
              {t.auth.welcomeBack.replace('!', `, `)} <span className="text-white font-medium">{profile.username}</span>!
            </p>
          </div>
        )}

        <div className="mb-4 text-center">
          <p className="text-sm text-zinc-500">{t.hub.selectGame}</p>
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
                    <h3 className="text-base md:text-lg font-bold">{getGameInfo(game.id, t).name}</h3>
                  </div>
                  <p className="text-xs md:text-sm text-zinc-400 leading-snug line-clamp-2">
                    {getGameInfo(game.id, t).description}
                  </p>

                  {/* Play indicator */}
                  <div className="mt-3 md:mt-4 flex items-center gap-1.5 text-xs md:text-sm text-zinc-400 group-hover:text-white transition">
                    <span className="font-medium">{t.common.play}</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            );
          })}

        </div>

        {/* Info for anonymous users */}
        {isLoggedIn === false && (
          <div className="mt-8 p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-center">
            <p className="text-sm text-zinc-400">
              <span className="text-emerald-400 font-medium">{t.common.hint}:</span> {t.hub.guestTip}
            </p>
          </div>
        )}

        {/* Coming Soon */}
        <div className="mt-12 text-center">
          <p className="text-zinc-500">{t.hub.moreGamesSoon}</p>
        </div>
      </main>

      {/* Username Modal */}
      <UsernameModal
        open={showUsernameModal}
        onClose={handleUsernameModalClose}
        onSave={handleUsernameSaved}
      />

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        open={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
        onProfileUpdate={refreshProfile}
      />

    </div>
  );
}
