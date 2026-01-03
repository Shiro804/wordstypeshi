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
import { getAvatarPublicUrl, uploadMyAvatar } from "@/lib/avatar";

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
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setAvatarUploading(false);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setAuthEmail(data.user?.email ?? ""));

    getMyProfile().then((p) => {
      setUsername(p?.username ?? "");
      setAvatarPath(p?.avatar_path ?? null);
      setAvatarPreviewUrl(getAvatarPublicUrl(p?.avatar_path ?? null));
    });
  }, [open]);

  const canSave = useMemo(() => {
    const u = username.trim();
    const usernameOk = u.length === 0 || /^[a-zA-Z0-9_.-]{2,20}$/.test(u);
    return usernameOk && !avatarUploading;
  }, [username, avatarUploading]);

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
                await upsertMyProfile({ username: username.trim() || null, avatar_path: avatarPath });
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
          <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Profile picture</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--surface2)]">
              {avatarPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreviewUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[color:var(--muted)]">
                  –
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)] ${avatarUploading ? "opacity-60 pointer-events-none" : ""}`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    // allow re-selecting same file
                    e.target.value = "";
                    if (!file) return;

                    setError(null);
                    setAvatarUploading(true);
                    try {
                      const { path } = await uploadMyAvatar(file);
                      setAvatarPath(path);
                      setAvatarPreviewUrl(getAvatarPublicUrl(path));
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : "Failed to upload avatar");
                    } finally {
                      setAvatarUploading(false);
                    }
                  }}
                />
                <span>{avatarUploading ? "Uploading..." : "Upload"}</span>
              </label>

              <button
                type="button"
                disabled={!avatarPath || avatarUploading}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-medium text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)] disabled:opacity-50"
                onClick={() => {
                  setAvatarPath(null);
                  setAvatarPreviewUrl(null);
                }}
              >
                Remove
              </button>

              <div className="text-xs text-[color:var(--muted)]">Max 2MB. Square works best.</div>
            </div>
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
