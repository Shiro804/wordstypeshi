"use client";

import { Clock3, HelpCircle } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Difficulty } from "@/lib/difficulty";

type Props = {
  onNew: () => void;
  onShare: () => void;
  onOpenStats: () => void;
  onOpenLeaderboard: () => void;
  onOpenWordHistory: () => void;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  // Timer
  timerText: string;
  // Hint slot (rendered by parent)
  hintSlot?: React.ReactNode;
  // Dev buttons slot
  actionsSlot?: React.ReactNode;
};

function StatsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 20v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 20v-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M7 4h10v3a5 5 0 0 1-10 0V4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M5 6H3a2 2 0 0 0 2 2h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 6h2a2 2 0 0 1-2 2h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 7h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="7" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="17" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 16V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 7l5-4 5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M12 12h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M19 12h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function TopBar({
  onNew,
  onShare,
  onOpenStats,
  onOpenLeaderboard,
  onOpenWordHistory,
  onOpenSettings,
  onOpenHowToPlay,
  difficulty,
  onDifficultyChange,
  timerText,
  hintSlot,
  actionsSlot,
}: Props) {
  const difficultyColors: Record<Difficulty, string> = {
    easy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    medium: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    hard: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };

  return (
    <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] bg-[color:var(--bg)]/90 px-3 py-2 backdrop-blur">
      {/* Left: Logo + Timer */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-[color:var(--fg)] hover:text-emerald-400 transition">
          ← Hub
        </Link>

        {/* Timer badge */}
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs font-semibold text-[color:var(--fg)]">
          <Clock3 size={12} className="text-[color:var(--muted)]" />
          <span className="tabular-nums inline-block w-[2rem] text-right">{timerText}</span>
        </div>

        {/* Difficulty dropdown badge */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={
                "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide transition cursor-pointer hover:opacity-80 " +
                difficultyColors[difficulty]
              }
            >
              {difficulty}
              <span className="opacity-60">▾</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-28">
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <DropdownMenuItem
                key={d}
                onClick={() => onDifficultyChange(d)}
                className="flex items-center gap-2"
              >
                <span className={`inline-block w-2 h-2 rounded-full ${d === "easy" ? "bg-emerald-400" : d === "medium" ? "bg-orange-400" : "bg-rose-400"
                  }`} />
                <span className="capitalize">{d}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: Hint + Actions + Menu */}
      <div className="flex items-center gap-2">
        {/* Dev buttons */}
        {actionsSlot}

        {/* Hint button (passed from parent) */}
        {hintSlot}

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] shadow-sm backdrop-blur transition hover:bg-[color:var(--surface2)] active:translate-y-[1px]"
            >
              <MoreIcon />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={onNew} className="flex items-center gap-2">
              <PlusIcon />
              <span>New game</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare} className="flex items-center gap-2">
              <ShareIcon />
              <span>Share</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenStats} className="flex items-center gap-2">
              <StatsIcon />
              <span>Stats</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenLeaderboard} className="flex items-center gap-2">
              <TrophyIcon />
              <span>Leaderboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenWordHistory} className="flex items-center gap-2">
              <span className="text-lg">📚</span>
              <span>Worthistorie</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenHowToPlay} className="flex items-center gap-2">
              <HelpCircle size={18} />
              <span>How to Play</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings} className="flex items-center gap-2">
              <GearIcon />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}