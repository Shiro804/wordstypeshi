"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/games/common/Modal";
import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile, upsertMyProfile } from "@/lib/auth/profile";
import { deleteMyAvatarObject, getAvatarPublicUrl, uploadMyAvatar } from "@/lib/auth/avatar";
import {
    checkUsernameAvailability,
    validateUsernameFormat,
} from "@/lib/auth/check-username-availability";
import { Loader2, Check, X } from "lucide-react";

type Props = {
    open: boolean;
    onClose: () => void;
    onProfileUpdate?: () => void;
};

export default function ProfileSettingsModal({ open, onClose, onProfileUpdate }: Props) {
    const [authEmail, setAuthEmail] = useState<string>("");
    const [username, setUsername] = useState("");
    const [originalUsername, setOriginalUsername] = useState("");
    const [avatarPath, setAvatarPath] = useState<string | null>(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const initialAvatarPathRef = useRef<string | null>(null);
    const lastUnsavedUploadRef = useRef<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Username availability check
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [usernameError, setUsernameError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setSaving(false);
        setAvatarUploading(false);
        setUsernameError(null);
        setUsernameAvailable(null);

        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            setAuthEmail(data.user?.email ?? "");
            setCurrentUserId(data.user?.id ?? null);
        });

        getMyProfile().then((p) => {
            const uname = p?.username ?? "";
            setUsername(uname);
            setOriginalUsername(uname);
            const ap = p?.avatar_path ?? null;
            initialAvatarPathRef.current = ap;
            lastUnsavedUploadRef.current = null;
            setAvatarPath(ap);
            setAvatarPreviewUrl(getAvatarPublicUrl(ap));
        });
    }, [open]);

    // Debounced username availability check
    useEffect(() => {
        const trimmed = username.trim();

        // Reset
        setUsernameError(null);
        setUsernameAvailable(null);

        // If same as original, no need to check
        if (trimmed.toLowerCase() === originalUsername.toLowerCase()) {
            return;
        }

        // Validate format first
        const formatErr = validateUsernameFormat(trimmed);
        if (formatErr) {
            setUsernameError(formatErr);
            return;
        }

        if (trimmed.length < 2) {
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsCheckingUsername(true);
            try {
                const available = await checkUsernameAvailability(trimmed, currentUserId ?? undefined);
                setUsernameAvailable(available);
                if (!available) {
                    setUsernameError("Dieser Username ist bereits vergeben");
                }
            } catch {
                setUsernameError("Fehler bei der Überprüfung");
            } finally {
                setIsCheckingUsername(false);
            }
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [username, originalUsername, currentUserId]);

    const canSave = useMemo(() => {
        const u = username.trim();

        // If username didn't change, allow save
        if (u.toLowerCase() === originalUsername.toLowerCase()) {
            return !avatarUploading;
        }

        // If username changed, need it to be valid and available
        const usernameOk = u.length === 0 || (usernameAvailable === true && !usernameError);
        return usernameOk && !avatarUploading && !isCheckingUsername;
    }, [username, originalUsername, usernameAvailable, usernameError, avatarUploading, isCheckingUsername]);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Profil Einstellungen"
            footer={
                <div className="flex items-center justify-between gap-2">
                    <LogoutButton />

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-medium text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
                            onClick={onClose}
                        >
                            Abbrechen
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
                                    onProfileUpdate?.();
                                    onClose();
                                } catch (e: unknown) {
                                    if (e instanceof Error && (e.message.includes("unique") || e.message.includes("duplicate"))) {
                                        setUsernameError("Dieser Username ist bereits vergeben");
                                        setUsernameAvailable(false);
                                    } else {
                                        setError(e instanceof Error ? e.message : "Fehler beim Speichern");
                                    }
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            {saving ? "Speichern..." : "Speichern"}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                {/* ═══ PROFILE SECTION ═══ */}
                <div>
                    <div className="text-xs uppercase tracking-widest text-[color:var(--muted)] font-bold mb-3">📱 Profil</div>

                    {/* Account email */}
                    <div className="mb-3">
                        <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Account</div>
                        <div className="mt-1 text-sm text-[color:var(--fg)]/85">{authEmail}</div>
                    </div>

                    {/* Username */}
                    <div className="mb-3">
                        <label className="text-xs uppercase tracking-wide text-[color:var(--muted)]" htmlFor="username">
                            Username
                        </label>
                        <div className="relative">
                            <input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder="Wähle einen Username"
                                autoCapitalize="none"
                                autoCorrect="off"
                                maxLength={20}
                                className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 pr-10 text-sm text-[color:var(--fg)] outline-none placeholder:text-[color:var(--muted)] focus:border-[color:var(--border)]"
                            />
                            {/* Status indicator */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5">
                                {isCheckingUsername && (
                                    <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                                )}
                                {!isCheckingUsername && usernameAvailable === true && (
                                    <Check className="w-4 h-4 text-emerald-400" />
                                )}
                                {!isCheckingUsername && usernameAvailable === false && (
                                    <X className="w-4 h-4 text-red-400" />
                                )}
                            </div>
                        </div>
                        {usernameError && (
                            <div className="mt-1 text-xs text-red-400">{usernameError}</div>
                        )}
                        {!usernameError && usernameAvailable && (
                            <div className="mt-1 text-xs text-emerald-400">Username verfügbar!</div>
                        )}
                        <div className="mt-1 text-xs text-[color:var(--muted)]">
                            2–20 Zeichen. Buchstaben, Zahlen, _, -, .
                        </div>
                    </div>

                    {/* Profile picture */}
                    <div>
                        <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Profilbild</div>
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
                                                setError(err instanceof Error ? err.message : "Fehler beim Hochladen");
                                            } finally {
                                                setAvatarUploading(false);
                                            }
                                        }}
                                    />
                                    <span>{avatarUploading ? "Hochladen..." : "Hochladen"}</span>
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
                                    Entfernen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {error ? <div className="text-sm text-rose-300">{error}</div> : null}
            </div>
        </Modal>
    );
}
