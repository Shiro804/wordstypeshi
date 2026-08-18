import { cardsForHeat, getCard } from "./decks";
import type {
  FlimmerAction,
  FlimmerCard,
  FlimmerSession,
  Heat,
  HitKind,
  SignalKind,
} from "./types";

export const FLIMMER_ROUND_COUNT = 7;

export function signalKindForRound(roundIndex: number): SignalKind {
  if (roundIndex <= 1) return "emoji";
  if (roundIndex <= 3) return "word";
  if (roundIndex === 4) return "spectrum";
  if (roundIndex === 5) return "pulse";
  return "dual";
}

export function localize(text: { en: string; de: string }, lang: "en" | "de"): string {
  return text[lang];
}

export function scoreChoice(guessIndex: number, almostDecoy: 0 | 1 | 2): HitKind {
  if (guessIndex === 0) return "direct";
  if (guessIndex === almostDecoy + 1) return "almost";
  return "miss";
}

export function scoreSpectrum(secret: number, guess: number): HitKind {
  const diff = Math.abs(secret - guess);
  if (diff <= 8) return "direct";
  if (diff <= 20) return "almost";
  return "miss";
}

export function normalizeDual(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function scoreDual(a: string, b: string): HitKind {
  const left = normalizeDual(a);
  const right = normalizeDual(b);
  if (!left || !right) return "miss";
  if (left === right) return "direct";
  if (left.includes(right) || right.includes(left)) return "almost";
  const tokens = new Set(left.split(" ").filter((t) => t.length >= 4));
  if ([...tokens].some((t) => right.includes(t))) return "almost";
  return "miss";
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickCard(heat: Heat, seed: string, roundIndex: number, kind: SignalKind): FlimmerCard {
  const wantSpectrum = kind === "spectrum";
  const pool = cardsForHeat(heat).filter((card) =>
    wantSpectrum ? card.kind === "spectrum" : card.kind === "choice"
  );
  const rng = mulberry32(hashSeed(`${seed}:${roundIndex}:${kind}`));
  return pool[Math.floor(rng() * pool.length)] ?? cardsForHeat(heat)[0];
}

export function createSession(host: string, guest: string, seed = `${Date.now()}`): FlimmerSession {
  return {
    version: 1,
    host,
    guest,
    heat: "warm",
    hostReady: false,
    guestReady: false,
    started: false,
    phase: "heat",
    roundIndex: 0,
    sender: host,
    catcher: guest,
    cardId: null,
    secretSpectrum: null,
    signal: null,
    guess: null,
    dualHost: "",
    dualGuest: "",
    hostLocked: false,
    guestLocked: false,
    lastHit: null,
    results: [],
    seed,
  };
}

function roleFor(state: FlimmerSession, username: string): "host" | "guest" | null {
  if (username === state.host) return "host";
  if (username === state.guest) return "guest";
  return null;
}

function beginRound(state: FlimmerSession, roundIndex: number): FlimmerSession {
  const sender = roundIndex % 2 === 0 ? state.host : state.guest;
  const catcher = sender === state.host ? state.guest : state.host;
  const kind = signalKindForRound(roundIndex);
  const card = pickCard(state.heat, state.seed, roundIndex, kind);
  return {
    ...state,
    version: state.version + 1,
    started: true,
    phase: kind === "dual" ? "guess" : "signal",
    roundIndex,
    sender,
    catcher,
    cardId: card.id,
    secretSpectrum: null,
    signal: null,
    guess: null,
    dualHost: "",
    dualGuest: "",
    hostLocked: false,
    guestLocked: false,
    lastHit: null,
  };
}

function resolveRound(state: FlimmerSession): FlimmerSession {
  const card = state.cardId ? getCard(state.cardId) : undefined;
  const kind = signalKindForRound(state.roundIndex);
  let hit: HitKind = "miss";

  if (kind === "dual") {
    hit = scoreDual(state.dualHost, state.dualGuest);
  } else if (kind === "spectrum" && card?.kind === "spectrum") {
    const secret = state.secretSpectrum ?? 50;
    const guess = typeof state.guess === "number" ? state.guess : 50;
    hit = scoreSpectrum(secret, guess);
  } else if (card?.kind === "choice" && typeof state.guess === "number") {
    hit = scoreChoice(state.guess, card.almostDecoy);
  }

  return {
    ...state,
    version: state.version + 1,
    phase: "reveal",
    lastHit: hit,
    hostLocked: false,
    guestLocked: false,
    results: [
      ...state.results,
      {
        cardId: state.cardId ?? "",
        hit,
        sender: state.sender,
        catcher: state.catcher,
      },
    ],
  };
}

export function applyFlimmerAction(state: FlimmerSession, action: FlimmerAction): FlimmerSession {
  if (action.type === "reset") {
    return createSession(state.host, state.guest);
  }

  if (action.type === "set_heat" && !state.started) {
    return {
      ...state,
      version: state.version + 1,
      heat: action.heat,
      hostReady: false,
      guestReady: false,
    };
  }

  if (action.type === "toggle_ready" && !state.started) {
    const role = roleFor(state, action.by);
    if (!role) return state;
    const next = {
      ...state,
      version: state.version + 1,
      hostReady: role === "host" ? !state.hostReady : state.hostReady,
      guestReady: role === "guest" ? !state.guestReady : state.guestReady,
    };
    if (next.hostReady && next.guestReady) {
      return beginRound(next, 0);
    }
    return next;
  }

  if (action.type === "start" && !state.started && state.hostReady && state.guestReady) {
    return beginRound(state, 0);
  }

  if (action.type === "set_signal" && state.phase === "signal" && action.by === state.sender) {
    return {
      ...state,
      version: state.version + 1,
      signal: action.value,
      secretSpectrum: action.spectrum ?? state.secretSpectrum,
      phase: "guess",
      hostLocked: false,
      guestLocked: false,
    };
  }

  if (action.type === "set_guess" && state.phase === "guess" && action.by === state.catcher) {
    return {
      ...state,
      version: state.version + 1,
      guess: action.value,
    };
  }

  if (action.type === "set_dual" && state.phase === "guess" && signalKindForRound(state.roundIndex) === "dual") {
    const role = roleFor(state, action.by);
    if (!role) return state;
    return {
      ...state,
      version: state.version + 1,
      dualHost: role === "host" ? action.value : state.dualHost,
      dualGuest: role === "guest" ? action.value : state.dualGuest,
    };
  }

  if (action.type === "lock" && state.phase === "guess") {
    const role = roleFor(state, action.by);
    if (!role) return state;
    const next = {
      ...state,
      version: state.version + 1,
      hostLocked: role === "host" ? true : state.hostLocked,
      guestLocked: role === "guest" ? true : state.guestLocked,
    };
    const kind = signalKindForRound(state.roundIndex);
    if (kind === "dual") {
      if (next.hostLocked && next.guestLocked) return resolveRound(next);
      return next;
    }
    if (action.by === state.catcher) return resolveRound(next);
    return next;
  }

  if (action.type === "next" && state.phase === "reveal") {
    const following = state.roundIndex + 1;
    if (following >= FLIMMER_ROUND_COUNT) {
      return { ...state, version: state.version + 1, phase: "done" };
    }
    return beginRound(state, following);
  }

  return state;
}

export function flimmerPercent(results: { hit: HitKind }[]): number {
  if (results.length === 0) return 0;
  const pts = results.reduce((sum, r) => sum + (r.hit === "direct" ? 3 : r.hit === "almost" ? 2 : 0), 0);
  return Math.round((pts / (results.length * 3)) * 100);
}

export function choiceOptions(card: Extract<FlimmerCard, { kind: "choice" }>) {
  return [card.truth, ...card.decoys];
}
