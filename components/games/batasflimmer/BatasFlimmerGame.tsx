"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import GameShell from "@/components/shared/GameShell";
import { useLanguage } from "@/lib/i18n";
import { getCard } from "@/lib/games/batasflimmer/decks";
import {
  FLIMMER_ROUND_COUNT,
  choiceOptions,
  flimmerPercent,
  localize,
  signalKindForRound,
} from "@/lib/games/batasflimmer/engine";
import type { Heat } from "@/lib/games/batasflimmer/types";
import { useFlimmerPair } from "./FlimmerPairProvider";

const EMOJIS = ["💛", "🔥", "🌙", "👀", "🤫", "💋", "🫶", "⚡", "🍷", "🦋", "🫠", "😈", "🥹", "🚪", "🖤", "✨"];

export default function BatasFlimmerGame() {
  const { t, language } = useLanguage();
  const lang = language === "de" ? "de" : "en";
  const copy = t.batasflimmer;
  const {
    me,
    partner,
    allowed,
    partnerOnline,
    inviteFrom,
    outgoing,
    session,
    invitePartner,
    cancelInvite,
    acceptInvite,
    declineInvite,
    dispatch,
  } = useFlimmerPair();

  const [draft, setDraft] = useState("");
  const [spectrumGuess, setSpectrumGuess] = useState(50);

  const card = session?.cardId ? getCard(session.cardId) : undefined;
  const kind = session ? signalKindForRound(session.roundIndex) : "emoji";
  const iAmSender = !!(me && session && me === session.sender);
  const percent = session ? flimmerPercent(session.results) : 0;

  const options = useMemo(() => {
    if (!card || card.kind !== "choice") return [];
    return choiceOptions(card).map((opt, index) => ({ index, text: localize(opt, lang) }));
  }, [card, lang]);

  if (!allowed || !me || !partner) {
    return (
      <div className="min-h-dvh grid place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-white/50">{copy.privateLock}</p>
          <Link href="/" className="mt-4 inline-block text-rose-300 underline">
            {t.hub.title}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flimmer-skin min-h-dvh">
      <GameShell gameId="batasflimmer" gameName={copy.name} onNewGame={() => dispatch({ type: "reset" })} fullHeight>
        <div className="mx-auto w-full max-w-lg px-4 pb-10">
          {inviteFrom && !session && (
            <InviteCard
              from={inviteFrom}
              copy={copy}
              onAccept={acceptInvite}
              onDecline={declineInvite}
            />
          )}

          {!session && !inviteFrom && (
            <Lobby
              me={me}
              partner={partner}
              partnerOnline={partnerOnline}
              outgoing={outgoing}
              copy={copy}
              onInvite={invitePartner}
              onCancel={cancelInvite}
            />
          )}

          {session && session.phase === "heat" && (
            <HeatScreen
              sessionHeat={session.heat}
              me={me}
              hostReady={session.hostReady}
              guestReady={session.guestReady}
              host={session.host}
              copy={copy}
              onHeat={(heat) => dispatch({ type: "set_heat", heat, by: me })}
              onReady={() => dispatch({ type: "toggle_ready", by: me })}
            />
          )}

          {session && session.started && session.phase !== "done" && session.phase !== "heat" && (
            <RoundScreen
              me={me}
              copy={copy}
              lang={lang}
              kind={kind}
              iAmSender={iAmSender}
              session={session}
              card={card}
              options={options}
              draft={draft}
              spectrumGuess={spectrumGuess}
              onDraft={setDraft}
              onSpectrumGuess={setSpectrumGuess}
              onSendEmoji={(emoji) => dispatch({ type: "set_signal", value: emoji, by: me })}
              onSendWord={() => {
                if (!draft.trim()) return;
                dispatch({
                  type: "set_signal",
                  value: draft.trim(),
                  spectrum: kind === "spectrum" ? spectrumGuess : undefined,
                  by: me,
                });
                setDraft("");
              }}
              onGuess={(index) => dispatch({ type: "set_guess", value: index, by: me })}
              onGuessSpectrum={() => dispatch({ type: "set_guess", value: spectrumGuess, by: me })}
              onDual={(value) => dispatch({ type: "set_dual", value, by: me })}
              onLock={() => dispatch({ type: "lock", by: me })}
              onNext={() => dispatch({ type: "next", by: me })}
            />
          )}

          {session?.phase === "done" && (
            <DoneScreen percent={percent} copy={copy} onAgain={() => dispatch({ type: "reset" })} />
          )}
        </div>
      </GameShell>
    </div>
  );
}

function Lobby({
  me,
  partner,
  partnerOnline,
  outgoing,
  copy,
  onInvite,
  onCancel,
}: {
  me: string;
  partner: string;
  partnerOnline: boolean;
  outgoing: boolean;
  copy: { pulse: string; waiting: string; invite: string; cancel: string; pairOnly: string; online: string; offline: string };
  onInvite: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="pt-6 text-center">
      <div className="flimmer-pulse mx-auto" />
      <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-rose-200/60">{copy.pulse}</p>
      <h2
        className="mt-3 text-4xl text-rose-50"
        style={{ fontFamily: "var(--font-display), Georgia, serif", fontStyle: "italic" }}
      >
        {me}
        <span className="mx-2 text-rose-300/40">×</span>
        {partner}
      </h2>
      <p className="mt-3 text-sm text-white/50">{copy.pairOnly}</p>
      <p className={`mt-2 text-xs ${partnerOnline ? "text-emerald-300" : "text-white/35"}`}>
        {partner} · {partnerOnline ? copy.online : copy.offline}
      </p>
      <button
        type="button"
        onClick={outgoing ? onCancel : onInvite}
        className="mt-8 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-amber-400 py-3.5 text-sm font-semibold text-zinc-950"
      >
        {outgoing ? copy.cancel : copy.invite.replace("{name}", partner)}
      </button>
      {outgoing && <p className="mt-3 text-xs text-white/40">{copy.waiting}</p>}
    </div>
  );
}

function InviteCard({
  from,
  copy,
  onAccept,
  onDecline,
}: {
  from: string;
  copy: { inviteTitle: string; join: string; later: string };
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="mt-6 rounded-[2rem] border border-rose-300/25 bg-black/30 p-6 text-center">
      <div className="flimmer-pulse mx-auto mb-4" />
      <h2 className="text-2xl text-rose-50" style={{ fontFamily: "var(--font-display), Georgia, serif", fontStyle: "italic" }}>
        {from}
      </h2>
      <p className="mt-2 text-sm text-white/55">{copy.inviteTitle}</p>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onDecline} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm text-white/70">
          {copy.later}
        </button>
        <button type="button" onClick={onAccept} className="flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-400 py-3 text-sm font-semibold text-zinc-950">
          {copy.join}
        </button>
      </div>
    </div>
  );
}

function HeatScreen({
  sessionHeat,
  me,
  hostReady,
  guestReady,
  host,
  copy,
  onHeat,
  onReady,
}: {
  sessionHeat: Heat;
  me: string;
  hostReady: boolean;
  guestReady: boolean;
  host: string;
  copy: { heat: string; soft: string; warm: string; hot: string; ready: string };
  onHeat: (heat: Heat) => void;
  onReady: () => void;
}) {
  const ready = me === host ? hostReady : guestReady;
  return (
    <div className="pt-8 text-center">
      <p className="text-[11px] uppercase tracking-[0.28em] text-rose-200/60">{copy.heat}</p>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {(["soft", "warm", "hot"] as Heat[]).map((heat) => (
          <button
            key={heat}
            type="button"
            onClick={() => onHeat(heat)}
            className={`rounded-2xl border py-4 text-sm ${
              sessionHeat === heat
                ? "border-rose-300/50 bg-rose-400/15 text-rose-50"
                : "border-white/10 text-white/55"
            }`}
          >
            {copy[heat]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onReady}
        className={`mt-8 w-full rounded-2xl py-3.5 text-sm font-semibold ${
          ready ? "bg-white/10 text-white" : "bg-gradient-to-r from-rose-500 to-amber-400 text-zinc-950"
        }`}
      >
        {copy.ready}
      </button>
      <p className="mt-3 text-xs text-white/35">
        {hostReady ? "✓" : "○"} {host} · {guestReady ? "✓" : "○"} {me === host ? copy.ready : me}
      </p>
    </div>
  );
}

function RoundScreen({
  me,
  copy,
  lang,
  kind,
  iAmSender,
  session,
  card,
  options,
  draft,
  spectrumGuess,
  onDraft,
  onSpectrumGuess,
  onSendEmoji,
  onSendWord,
  onGuess,
  onGuessSpectrum,
  onDual,
  onLock,
  onNext,
}: {
  me: string;
  copy: Record<string, string>;
  lang: "en" | "de";
  kind: ReturnType<typeof signalKindForRound>;
  iAmSender: boolean;
  session: NonNullable<ReturnType<typeof useFlimmerPair>["session"]>;
  card: ReturnType<typeof getCard>;
  options: { index: number; text: string }[];
  draft: string;
  spectrumGuess: number;
  onDraft: (v: string) => void;
  onSpectrumGuess: (v: number) => void;
  onSendEmoji: (emoji: string) => void;
  onSendWord: () => void;
  onGuess: (index: number) => void;
  onGuessSpectrum: () => void;
  onDual: (value: string) => void;
  onLock: () => void;
  onNext: () => void;
}) {
  const prompt = card ? localize(card.prompt, lang) : "";

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-rose-200/55">
        <span>
          {copy.round} {session.roundIndex + 1}/{FLIMMER_ROUND_COUNT}
        </span>
        <span>{iAmSender ? copy.youSend : copy.youCatch}</span>
      </div>

      {session.phase === "signal" && iAmSender && (
        <div className="mt-6">
          <h3 className="text-2xl text-rose-50" style={{ fontFamily: "var(--font-display), Georgia, serif", fontStyle: "italic" }}>
            {prompt}
          </h3>
          {card?.kind === "choice" && (
            <p className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-50">
              {localize(card.truth, lang)}
            </p>
          )}
          {card?.kind === "spectrum" && (
            <SpectrumField
              left={localize(card.left, lang)}
              right={localize(card.right, lang)}
              value={spectrumGuess}
              onChange={onSpectrumGuess}
            />
          )}
          {(kind === "emoji") && (
            <div className="mt-5 grid grid-cols-8 gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSendEmoji(emoji)}
                  className="grid h-10 place-items-center rounded-xl bg-white/5 text-lg hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          {(kind === "word" || kind === "pulse" || kind === "spectrum") && (
            <div className="mt-5 flex gap-2">
              <input
                value={draft}
                maxLength={12}
                onChange={(e) => onDraft(e.target.value)}
                placeholder={kind === "pulse" ? "••••" : copy.oneWord}
                className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-rose-300/40"
              />
              <button type="button" onClick={onSendWord} className="rounded-2xl bg-rose-400 px-4 text-sm font-semibold text-zinc-950">
                {copy.send}
              </button>
            </div>
          )}
        </div>
      )}

      {session.phase === "signal" && !iAmSender && (
        <div className="mt-16 text-center">
          <div className="flimmer-pulse mx-auto" />
          <p className="mt-6 text-sm text-white/50">{copy.theyThink}</p>
        </div>
      )}

      {session.phase === "guess" && kind !== "dual" && !iAmSender && (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-200/50">{copy.signal}</p>
          <p className="mt-2 text-5xl" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
            {session.signal || "…"}
          </p>
          {card?.kind === "choice" && (
            <div className="mt-6 space-y-2">
              {options.map((opt) => (
                <button
                  key={opt.index}
                  type="button"
                  onClick={() => onGuess(opt.index)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${
                    session.guess === opt.index
                      ? "border-rose-300/50 bg-rose-400/15"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {opt.text}
                </button>
              ))}
              <button
                type="button"
                onClick={onLock}
                disabled={session.guess == null}
                className="mt-3 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-amber-400 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-40"
              >
                {copy.lock}
              </button>
            </div>
          )}
          {card?.kind === "spectrum" && (
            <div className="mt-6">
              <SpectrumField
                left={localize(card.left, lang)}
                right={localize(card.right, lang)}
                value={spectrumGuess}
                onChange={onSpectrumGuess}
              />
              <button
                type="button"
                onClick={() => {
                  onGuessSpectrum();
                  onLock();
                }}
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-amber-400 py-3 text-sm font-semibold text-zinc-950"
              >
                {copy.lock}
              </button>
            </div>
          )}
        </div>
      )}

      {session.phase === "guess" && kind !== "dual" && iAmSender && (
        <div className="mt-16 text-center">
          <div className="flimmer-pulse mx-auto" />
          <p className="mt-6 text-sm text-white/50">{copy.theyCatch}</p>
        </div>
      )}

      {session.phase === "guess" && kind === "dual" && (
        <div className="mt-6">
          <h3 className="text-2xl text-rose-50" style={{ fontFamily: "var(--font-display), Georgia, serif", fontStyle: "italic" }}>
            {copy.dualPrompt}
          </h3>
          <input
            defaultValue={me === session.host ? session.dualHost : session.dualGuest}
            maxLength={48}
            onChange={(e) => onDual(e.target.value)}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={onLock}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-amber-400 py-3 text-sm font-semibold text-zinc-950"
          >
            {copy.lock}
          </button>
        </div>
      )}

      {session.phase === "reveal" && (
        <div className="mt-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-rose-200/60">
            {session.lastHit === "direct" ? copy.direct : session.lastHit === "almost" ? copy.almost : copy.miss}
          </p>
          <h3
            className="mt-3 text-4xl text-rose-50"
            style={{ fontFamily: "var(--font-display), Georgia, serif", fontStyle: "italic" }}
          >
            {session.lastHit === "almost" ? copy.almostTitle : session.lastHit === "direct" ? copy.directTitle : copy.missTitle}
          </h3>
          {card?.kind === "choice" && (
            <p className="mt-4 text-sm text-white/70">{localize(card.truth, lang)}</p>
          )}
          <button
            type="button"
            onClick={onNext}
            className="mt-8 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-amber-400 py-3 text-sm font-semibold text-zinc-950"
          >
            {copy.next}
          </button>
        </div>
      )}
    </div>
  );
}

function SpectrumField({
  left,
  right,
  value,
  onChange,
}: {
  left: string;
  right: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mt-5 block">
      <div className="mb-2 flex justify-between text-[11px] uppercase tracking-wider text-white/40">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-rose-400"
      />
    </label>
  );
}

function DoneScreen({
  percent,
  copy,
  onAgain,
}: {
  percent: number;
  copy: { done: string; flimmer: string; again: string };
  onAgain: () => void;
}) {
  return (
    <div className="pt-10 text-center">
      <div className="flimmer-pulse mx-auto" />
      <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-rose-200/60">{copy.flimmer}</p>
      <p className="mt-2 text-6xl text-rose-50" style={{ fontFamily: "var(--font-display), Georgia, serif", fontStyle: "italic" }}>
        {percent}%
      </p>
      <p className="mt-3 text-sm text-white/50">{copy.done}</p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-8 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-amber-400 py-3 text-sm font-semibold text-zinc-950"
      >
        {copy.again}
      </button>
    </div>
  );
}
