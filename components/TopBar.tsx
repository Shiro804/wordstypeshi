"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  onNew: () => void;
  onShare: () => void;
  onOpenStats: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  timerText?: string;
  hintSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
};

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] shadow-sm backdrop-blur transition hover:bg-[color:var(--surface2)] active:translate-y-[1px]"
    >
      {children}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M12 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 20v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.93 4.93l1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17.66 17.66l1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.93 19.07l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21 12.8A8.5 8.5 0 0 1 11.2 3a7 7 0 1 0 9.8 9.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  // Simpler "settings" glyph to avoid the busy/odd look on small screens
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
      <path
        d="M12 16V3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 7l5-4 5 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
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
  onOpenSettings,
  timerText,
  hintSlot,
  actionsSlot,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] bg-[color:var(--bg)]/90 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold tracking-tight text-[color:var(--fg)]">WordsTypeShi</div>
        {timerText && (
          <div className="text-xs font-mono text-[color:var(--muted)]">{timerText}</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {hintSlot}
        {actionsSlot}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--fg)] shadow-sm backdrop-blur transition hover:bg-[color:var(--surface2)] active:translate-y-[1px]"
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
