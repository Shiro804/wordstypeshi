"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile, upsertMyProfile } from "@/lib/profile";

import type { Difficulty } from "@/lib/difficulty";

type Props = {
  open: boolean;
  onClose: () => void;
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
};

export default function Settings({ open, onClose, difficulty, onDifficultyChange }: Props) {
  const [authEmail, setAuthEmail] = useState<string>("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setAuthEmail(data.user?.email ?? ""));

    getMyProfile().then((p) => {
      setUsername(p?.username ?? "");
    });
  }, [open]);

  const canSave = useMemo(() => {
    const u = username.trim();
    return u.length === 0 || /^[a-zA-Z0-9_.-]{2,20}$/.test(u);
  }, [username]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      footer={
        <div className="flex items-center justify-between gap-2">
          <LogoutButton />

          <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-medium text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            className="rounded-xl border border-[color:var(--border)] bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30 disabled:opacity-50"
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                await upsertMyProfile({ username: username.trim() || null });
                await getMyProfile();
                onClose();
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Failed to save");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Account</div>
          <div className="mt-1 text-sm text-[color:var(--fg)]/85">{authEmail}</div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Difficulty</div>
          <div className="mt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] shadow-sm transition hover:bg-[color:var(--surface2)]"
                >
                  <span className="capitalize">{difficulty}</span>
                  <span className="text-[color:var(--muted)]">▾</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-32">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                  <DropdownMenuItem
                    key={d}
                    onClick={() => {
                      onDifficultyChange(d);
                      onClose();
                    }}
                  >
                    <span className="capitalize">{d}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-[color:var(--muted)]" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              // prevent game key handler from also receiving keystrokes while typing
              e.stopPropagation();
            }}
            placeholder="Pick a username"
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--fg)] outline-none placeholder:text-[color:var(--muted)] focus:border-[color:var(--border)]"
          />
          <div className="mt-1 text-xs text-[color:var(--muted)]">
            2–20 chars. Letters, numbers, underscore, dash, dot.
          </div>
        </div>

        {error ? <div className="text-sm text-rose-300">{error}</div> : null}
      </div>
    </Modal>
  );
}
