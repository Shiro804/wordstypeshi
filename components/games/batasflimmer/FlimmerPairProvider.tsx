"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMyProfile } from "@/lib/auth/profile";
import {
  canonicalFlimmerName,
  flimmerPartnerOf,
  isFlimmerUsername,
} from "@/lib/games/batasflimmer/allowlist";
import {
  applyFlimmerAction,
  createSession,
} from "@/lib/games/batasflimmer/engine";
import type { FlimmerAction, FlimmerSession } from "@/lib/games/batasflimmer/types";
import { connectFlimmerChannel } from "@/lib/sync/flimmer-realtime";
import { useLanguage } from "@/lib/i18n";

type PairApi = {
  me: string | null;
  partner: string | null;
  allowed: boolean;
  online: string[];
  partnerOnline: boolean;
  inviteFrom: string | null;
  outgoing: boolean;
  session: FlimmerSession | null;
  invitePartner: () => void;
  cancelInvite: () => void;
  acceptInvite: () => void;
  declineInvite: () => void;
  dispatch: (action: FlimmerAction) => void;
};

const FlimmerPairContext = createContext<PairApi | null>(null);

export function useFlimmerPair(): PairApi {
  const ctx = useContext(FlimmerPairContext);
  if (!ctx) {
    throw new Error("useFlimmerPair needs FlimmerPairProvider");
  }
  return ctx;
}

export function FlimmerPairProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  const [me, setMe] = useState<string | null>(null);
  const [online, setOnline] = useState<string[]>([]);
  const [inviteFrom, setInviteFrom] = useState<string | null>(null);
  const [outgoing, setOutgoing] = useState(false);
  const [session, setSession] = useState<FlimmerSession | null>(null);
  const sendRef = useRef<((payload: Parameters<ReturnType<typeof connectFlimmerChannel>["send"]>[0]) => Promise<void>) | null>(null);
  const sessionRef = useRef<FlimmerSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    pathnameRef.current = pathname;
    routerRef.current = router;
  }, [pathname, router]);

  useEffect(() => {
    let leave: (() => Promise<void>) | null = null;
    let cancelled = false;

    getMyProfile().then((profile) => {
      if (cancelled) return;
      const name = canonicalFlimmerName(profile?.username ?? "");
      if (!name || !isFlimmerUsername(name)) {
        setMe(null);
        return;
      }
      setMe(name);

      const conn = connectFlimmerChannel({
        username: name,
        onInvite: (from) => {
          setInviteFrom(from);
          setOutgoing(false);
        },
        onCancel: () => {
          setInviteFrom(null);
        },
        onAccept: (from) => {
          setOutgoing(false);
          setInviteFrom(null);
          const partner = flimmerPartnerOf(name);
          if (!partner || from !== partner) return;
          const next = createSession(name, partner);
          sessionRef.current = next;
          setSession(next);
          void sendRef.current?.({ kind: "state", from: name, state: next });
          if (pathnameRef.current !== "/batasflimmer") routerRef.current.push("/batasflimmer");
        },
        onDecline: () => {
          setOutgoing(false);
        },
        onAction: (_from, action) => {
          setSession((prev) => {
            if (!prev) return prev;
            const next = applyFlimmerAction(prev, action);
            sessionRef.current = next;
            return next;
          });
        },
        onState: (incoming) => {
          setSession((prev) => {
            if (prev && incoming.version < prev.version) return prev;
            sessionRef.current = incoming;
            return incoming;
          });
        },
        onPresence: (users) => setOnline(users),
      });
      sendRef.current = conn.send;
      leave = conn.leave;
    });

    return () => {
      cancelled = true;
      void leave?.();
    };
  }, []);

  const partner = me ? flimmerPartnerOf(me) : null;

  const invitePartner = useCallback(() => {
    if (!me || !partner) return;
    setOutgoing(true);
    void sendRef.current?.({ kind: "invite", from: me, to: partner, at: Date.now() });
  }, [me, partner]);

  const cancelInvite = useCallback(() => {
    if (!me || !partner) return;
    setOutgoing(false);
    void sendRef.current?.({ kind: "cancel", from: me, to: partner });
  }, [me, partner]);

  const acceptInvite = useCallback(() => {
    if (!me || !partner || !inviteFrom) return;
    setInviteFrom(null);
    void sendRef.current?.({ kind: "accept", from: me, to: partner });
    if (pathname !== "/batasflimmer") router.push("/batasflimmer");
  }, [inviteFrom, me, partner, pathname, router]);

  const declineInvite = useCallback(() => {
    if (!me || !partner) return;
    setInviteFrom(null);
    void sendRef.current?.({ kind: "decline", from: me, to: partner });
  }, [me, partner]);

  const dispatch = useCallback((action: FlimmerAction) => {
    if (!me) return;
    setSession((prev) => {
      if (!prev) return prev;
      const next = applyFlimmerAction(prev, action);
      sessionRef.current = next;
      void sendRef.current?.({ kind: "action", from: me, action });
      void sendRef.current?.({ kind: "state", from: me, state: next });
      return next;
    });
  }, [me]);

  const value = useMemo<PairApi>(
    () => ({
      me,
      partner,
      allowed: !!me,
      online,
      partnerOnline: !!(partner && online.includes(partner)),
      inviteFrom,
      outgoing,
      session,
      invitePartner,
      cancelInvite,
      acceptInvite,
      declineInvite,
      dispatch,
    }),
    [
      acceptInvite,
      cancelInvite,
      declineInvite,
      dispatch,
      inviteFrom,
      invitePartner,
      me,
      online,
      outgoing,
      partner,
      session,
    ]
  );

  return (
    <FlimmerPairContext.Provider value={value}>
      {children}
      <FlimmerInviteOverlay />
    </FlimmerPairContext.Provider>
  );
}

function FlimmerInviteOverlay() {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { allowed, inviteFrom, acceptInvite, declineInvite } = useFlimmerPair();

  if (!allowed || !inviteFrom || pathname === "/batasflimmer") return null;

  const copy = t.batasflimmer;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-label={copy.inviteTitle}
    >
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-rose-300/30 bg-[#16080d] shadow-[0_30px_80px_-20px_rgba(255,80,90,0.45)]">
        <div className="relative px-6 pt-8 pb-6 text-center">
          <div className="flimmer-pulse mx-auto mb-5" />
          <p className="text-[11px] uppercase tracking-[0.28em] text-rose-200/70">
            {copy.pulse}
          </p>
          <h2
            className="mt-2 text-3xl text-rose-50"
            style={{ fontFamily: "var(--font-display), Georgia, serif", fontStyle: "italic" }}
          >
            {inviteFrom}
          </h2>
          <p className="mt-2 text-sm text-rose-100/70">
            {language === "de" ? "denkt gerade an dich." : "is thinking about you."}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={declineInvite}
              className="flex-1 rounded-2xl border border-white/10 py-3 text-sm text-white/70 hover:bg-white/5"
            >
              {copy.later}
            </button>
            <button
              type="button"
              onClick={acceptInvite}
              className="flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-400 py-3 text-sm font-semibold text-zinc-950"
            >
              {copy.join}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
