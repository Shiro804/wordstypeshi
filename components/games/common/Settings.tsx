"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/games/common/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile, upsertMyProfile } from "@/lib/auth/profile";
import { deleteMyAvatarObject, getAvatarPublicUrl, uploadMyAvatar } from "@/lib/auth/avatar";
import BackgroundCustomizer from "@/components/games/common/BackgroundCustomizer";
import type { GamePreferences } from "@/lib/storage/preferences-storage";
import type { Difficulty } from "@/lib/difficulty";
import { useLanguage } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  // Optional: game context
  gameId?: string;

  // Preferences
  preferences: GamePreferences;
  onPreferencesChange: (prefs: GamePreferences) => void;

  // Optional: difficulty (only for games that have it)
  difficulty?: Difficulty;
  onDifficultyChange?: (d: Difficulty) => void;
};

const difficultyColors: Record<Difficulty, string> = {
  easy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  medium: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  hard: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function Settings({
  open,
  onClose,
  gameId: _gameId,
  preferences,
  onPreferencesChange,
  difficulty,
  onDifficultyChange
}: Props) {
  const [authEmail, setAuthEmail] = useState<string>("");
  const [username, setUsername] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const initialAvatarPathRef = useRef<string | null>(null);
  const lastUnsavedUploadRef = useRef<string | null>(null);
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
      const ap = p?.avatar_path ?? null;
      initialAvatarPathRef.current = ap;
      lastUnsavedUploadRef.current = null;
      setAvatarPath(ap);
      setAvatarPreviewUrl(getAvatarPublicUrl(ap));
    });
  }, [open]);

  const canSave = useMemo(() => {
    const u = username.trim();
    const usernameOk = u.length === 0 || /^[a-zA-Z0-9_.-]{2,20}$/.test(u);
    return usernameOk && !avatarUploading;
  }, [username, avatarUploading]);

  const [isTransparent, setIsTransparent] = useState(false);

  // Language
  const { t } = useLanguage();

  // Helper for difficulty labels
  const getDifficultyLabel = (d: Difficulty) => {
    if (d === 'easy') return t.settings.easy;
    if (d === 'medium') return t.settings.medium;
    return t.settings.hard;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.settings.title}
      transparent={isTransparent}
      footer={
        <div className="flex items-center justify-between gap-2">
          <LogoutButton />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-medium text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
              onClick={onClose}
            >
              {t.common.cancel}
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
              {saving ? t.settings.saving : t.common.save}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ═══ PROFILE SECTION ═══ */}
        <div>
          <div className="text-xs uppercase tracking-widest text-[color:var(--muted)] font-bold mb-3">📱 {t.settings.profile}</div>

          {/* Account email */}
          <div className="mb-3">
            <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{t.settings.account}</div>
            <div className="mt-1 text-sm text-[color:var(--fg)]/85">{authEmail}</div>
          </div>

          {/* Username */}
          <div className="mb-3">
            <label className="text-xs uppercase tracking-wide text-[color:var(--muted)]" htmlFor="username">
              {t.settings.username}
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              placeholder={t.settings.pickUsername}
              autoCapitalize="none"
              autoCorrect="off"
              className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-base sm:text-sm text-[color:var(--fg)] outline-none placeholder:text-[color:var(--muted)] focus:border-[color:var(--border)]"
            />
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {t.settings.usernameHint}
            </div>
          </div>

          {/* Profile picture */}
          <div>
            <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{t.settings.profilePicture}</div>
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
                      e.target.value = "";
                      if (!file) return;

                      setError(null);
                      setAvatarUploading(true);
                      try {
                        if (lastUnsavedUploadRef.current) {
                          try {
                            await deleteMyAvatarObject(lastUnsavedUploadRef.current);
                          } catch {
                            // best-effort cleanup
                          }
                          lastUnsavedUploadRef.current = null;
                        }

                        const { path } = await uploadMyAvatar(file);
                        if (path !== initialAvatarPathRef.current) {
                          lastUnsavedUploadRef.current = path;
                        }
                        setAvatarPath(path);
                        const url = getAvatarPublicUrl(path);
                        setAvatarPreviewUrl(url ? `${url}?t=${Date.now()}` : null);
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : "Failed to upload avatar");
                      } finally {
                        setAvatarUploading(false);
                      }
                    }}
                  />
                  <span>{avatarUploading ? t.settings.uploading : t.settings.upload}</span>
                </label>

                <button
                  type="button"
                  disabled={!avatarPath || avatarUploading}
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-medium text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)] disabled:opacity-50"
                  onClick={async () => {
                    if (lastUnsavedUploadRef.current) {
                      try {
                        await deleteMyAvatarObject(lastUnsavedUploadRef.current);
                      } catch {
                        // best-effort cleanup
                      }
                      lastUnsavedUploadRef.current = null;
                    }

                    setAvatarPath(null);
                    setAvatarPreviewUrl(null);
                  }}
                >
                  {t.settings.remove}
                </button>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-[color:var(--border)]" />

        {/* ═══ GAMEPLAY SECTION ═══ */}
        {difficulty && onDifficultyChange && (
          <>
            <div>
              <div className="text-xs uppercase tracking-widest text-[color:var(--muted)] font-bold mb-3">🎮 {t.settings.gameplay}</div>

              <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{t.settings.difficulty}</div>
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition hover:opacity-80 ${difficultyColors[difficulty]}`}
                    >
                      <span>{getDifficultyLabel(difficulty)}</span>
                      <span className="opacity-60">▾</span>
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
                        className="flex items-center gap-2"
                      >
                        <span className={`inline-block w-2 h-2 rounded-full ${d === "easy" ? "bg-emerald-400" : d === "medium" ? "bg-orange-400" : "bg-rose-400"
                          }`} />
                        <span>{getDifficultyLabel(d)}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <hr className="border-[color:var(--border)]" />
            <hr className="border-[color:var(--border)]" />
          </>
        )}

        {/* ═══ APPEARANCE SECTION ═══ */}
        <div>
          <div className="text-xs uppercase tracking-widest text-[color:var(--muted)] font-bold mb-3">🎨 {t.settings.appearance}</div>
          <BackgroundCustomizer
            preferences={preferences}
            onChange={onPreferencesChange}
            onInteractionStart={() => setIsTransparent(true)}
            onInteractionEnd={() => setIsTransparent(false)}
          />
        </div>

        {error ? <div className="text-sm text-rose-300">{error}</div> : null}
      </div>
    </Modal>
  );
}
