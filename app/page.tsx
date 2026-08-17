"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Palette,
  Type,
  Search,
  LayoutGrid,
  Droplets,
  Brain,
  Bomb,
  Route,
  FlaskConical,
  LogIn,
  UserPlus,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { getMyProfile, type UserProfile } from "@/lib/auth/profile";
import UsernameModal from "@/components/auth/UsernameModal";
import ProfileSettingsModal from "@/components/hub/ProfileSettingsModal";
import HubMascot from "@/components/hub/HubMascot";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { useLanguage } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    color: "from-fuchsia-500 to-pink-600",
    enabled: true,
  },
  {
    id: "wordsearch" as const,
    icon: Search,
    href: "/wordsearch",
    color: "from-sky-500 to-cyan-600",
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
  {
    id: "batasflow" as const,
    icon: Route,
    href: "/batasflow",
    color: "from-teal-500 to-emerald-600",
    enabled: true,
  },
  {
    id: "batasbottles" as const,
    icon: FlaskConical,
    href: "/batasbottles",
    color: "from-sky-500 to-indigo-600",
    enabled: true,
    badge: "1000",
  },
];

const USERNAME_MODAL_DISMISSED_KEY = "batagames_username_modal_dismissed";
const HEADER_CHIP =
  "h-10 rounded-full bg-white/[0.04] border border-white/10 text-white/90 hover:bg-white/[0.08] hover:border-white/20 px-3";

const getGameInfo = (gameId: string, t: ReturnType<typeof useLanguage>["t"]) => {
  const gameTranslations = t[gameId as keyof typeof t] as { name: string; description: string };
  return {
    name: gameTranslations?.name ?? gameId,
    description: gameTranslations?.description ?? "",
  };
};

export default function Page() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const enabledGames = GAMES.filter((g) => g.enabled);
  const activeGame = enabledGames.find((g) => g.id === activeGameId) ?? enabledGames[0];
  const activeInfo = activeGame ? getGameInfo(activeGame.id, t) : { name: "", description: "" };

  const refreshProfile = async () => {
    const p = await getMyProfile();
    setProfile(p);
  };

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      const loggedIn = !!data.user;
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        getMyProfile().then((p) => {
          setProfile(p);

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
    <div className="hub-home relative isolate flex min-h-dvh flex-col text-white overflow-x-hidden">
      <header
        className="relative z-20 flex items-center justify-between px-4 sm:px-6"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 0.75rem, 0.75rem)" }}
      >
        <LanguageSelector className={HEADER_CHIP} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t.hub.account}
              className={`inline-flex items-center gap-2 ${HEADER_CHIP} max-w-[10rem]`}
            >
              <User size={16} />
              {isLoggedIn === true && (
                <span className="text-sm font-medium truncate">
                  {profile?.username || t.hub.profile}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {isLoggedIn === true ? (
              <>
                <DropdownMenuItem onClick={() => setShowProfileSettings(true)}>
                  <Settings size={14} className="mr-2" />
                  {t.common.settings}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400">
                  <LogOut size={14} className="mr-2" />
                  {t.common.logout}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/auth/login">
                    <LogIn size={14} className="mr-2" />
                    {t.common.login}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/auth/sign-up">
                    <UserPlus size={14} className="mr-2" />
                    {t.common.register}
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="relative z-10 flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)] lg:items-center lg:gap-8 xl:gap-16 px-4 sm:px-6 pb-6 lg:pb-10 lg:pt-2">
        <section className="flex flex-col items-center text-center lg:items-start lg:text-left pt-1 pb-4 lg:py-0">
          <HubMascot className="w-[4.75rem] sm:w-24 lg:w-[13.5rem] xl:w-60" />
          <h1 className="hub-wordmark mt-1 lg:mt-4 text-[clamp(1.7rem,4vw,3.4rem)] font-semibold tracking-tight text-white">
            BataGames
          </h1>
          <p className="mt-1 max-w-sm text-[13px] sm:text-sm text-white/45 leading-relaxed">
            {t.hub.subtitle}
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[#ffd86b]/70">
            {t.hub.gameCount.replace("{n}", String(enabledGames.length))}
          </p>
          {isLoggedIn === true && profile?.username && (
            <p className="mt-2 text-sm text-white/40">
              {t.auth.welcomeBack.replace("!", ", ")}
              <span className="text-white/80 font-medium">{profile.username}</span>
            </p>
          )}
        </section>

        <section className="flex flex-1 flex-col justify-center min-h-0">
          <div
            className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3"
            onMouseLeave={() => setActiveGameId(null)}
          >
            {enabledGames.map((game, index) => {
              const Icon = game.icon;
              const info = getGameInfo(game.id, t);
              const isActive = activeGame?.id === game.id;

              return (
                <Link
                  key={game.id}
                  href={game.href}
                  onMouseEnter={() => setActiveGameId(game.id)}
                  onFocus={() => setActiveGameId(game.id)}
                  className={`hub-tile group relative flex flex-col items-center justify-center gap-2 rounded-[1.35rem] px-2 py-3 sm:py-4
                    bg-white/[0.035] border border-white/[0.07]
                    hover:bg-white/[0.07] hover:border-white/15
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd86b]/70
                    transition-colors duration-200
                    ${isActive ? "border-white/20 bg-white/[0.06]" : ""}`}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div
                    className={`relative grid size-11 sm:size-12 place-items-center rounded-2xl bg-gradient-to-br ${game.color} shadow-[0_8px_20px_-8px_rgba(0,0,0,0.65)] transition-transform duration-200 group-hover:-translate-y-0.5`}
                  >
                    <Icon className="size-5 sm:size-[1.35rem] text-white" strokeWidth={2.1} />
                    {game.badge && (
                      <span className="absolute -top-1.5 -right-1.5 rounded-full bg-[#ffd86b] px-1.5 py-px text-[9px] font-bold text-zinc-900 leading-4">
                        {game.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-white/80 group-hover:text-white text-center leading-tight line-clamp-1">
                    {info.name.replace(/^Batas/, "")}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 min-h-[3.25rem] text-center lg:text-left">
            <p className="text-sm font-medium text-white/85">{activeInfo.name}</p>
            <p className="text-xs sm:text-sm text-white/40 leading-relaxed line-clamp-2">
              {activeInfo.description || t.hub.selectGame}
            </p>
          </div>
        </section>
      </main>

      <UsernameModal
        open={showUsernameModal}
        onClose={handleUsernameModalClose}
        onSave={handleUsernameSaved}
      />

      <ProfileSettingsModal
        open={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
        onProfileUpdate={refreshProfile}
      />
    </div>
  );
}
