"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile, upsertMyProfile } from "@/lib/profile";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function Settings({ open, onClose }: Props) {
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
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            className="rounded-xl border border-white/10 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30 disabled:opacity-50"
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                await upsertMyProfile({ username: username.trim() || null });
                const p = await getMyProfile();
                setProfile(p);
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
          <div className="text-xs uppercase tracking-wide text-white/60">Account</div>
          <div className="mt-1 text-sm text-white/85">{authEmail}</div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-white/60" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Pick a username"
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
          />
          <div className="mt-1 text-xs text-white/50">
            2–20 chars. Letters, numbers, underscore, dash, dot.
          </div>
        </div>

        {error ? <div className="text-sm text-rose-300">{error}</div> : null}
      </div>
    </Modal>
  );
}
