"use client";

type Props = {
  onNew: () => void;
  onShare: () => void;
  onOpenStats: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  theme: "dark" | "light";
  actionsSlot?: React.ReactNode; // e.g. Hint / dev buttons
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
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a7.9 7.9 0 0 0 .1-1l2-1.5-2-3.5-2.4.5a7.5 7.5 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.5 7.5 0 0 0-1.7 1L4.5 9 2.5 12.5l2 1.5a7.9 7.9 0 0 0 .1 1l-2 1.5 2 3.5 2.4-.5a7.5 7.5 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 1.7-1l2.4.5 2-3.5-2-1.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
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

export default function TopBar({
  onNew,
  onShare,
  onOpenStats,
  onOpenLeaderboard,
  onOpenSettings,
  onToggleTheme,
  theme,
  actionsSlot,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] bg-[color:var(--bg)]/90 px-4 py-3 backdrop-blur">
      <div className="text-base font-semibold tracking-tight text-[color:var(--fg)]">WordsTypeShi</div>

      <div className="flex items-center gap-2">
        {actionsSlot}

        <IconButton onClick={onToggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </IconButton>

        <IconButton onClick={onOpenLeaderboard} title="Leaderboard">
          <TrophyIcon />
        </IconButton>
        <IconButton onClick={onOpenSettings} title="Settings">
          <GearIcon />
        </IconButton>
        <IconButton onClick={onOpenStats} title="Stats">
          <StatsIcon />
        </IconButton>
        <IconButton onClick={onShare} title="Share">
          <ShareIcon />
        </IconButton>
        <IconButton onClick={onNew} title="New">
          <PlusIcon />
        </IconButton>
      </div>
    </div>
  );
}
