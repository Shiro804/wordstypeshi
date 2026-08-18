export type Heat = "soft" | "warm" | "hot";
export type CardKind = "choice" | "spectrum";
export type SignalKind = "emoji" | "word" | "spectrum" | "pulse" | "dual";
export type HitKind = "direct" | "almost" | "miss";
export type Phase =
  | "lobby"
  | "heat"
  | "signal"
  | "guess"
  | "reveal"
  | "done";

export type L10n = { en: string; de: string };

export interface ChoiceCard {
  id: string;
  heat: Heat;
  kind: "choice";
  type: "want" | "memory" | "almost";
  prompt: L10n;
  truth: L10n;
  decoys: [L10n, L10n, L10n];
  almostDecoy: 0 | 1 | 2;
}

export interface SpectrumCard {
  id: string;
  heat: Heat;
  kind: "spectrum";
  prompt: L10n;
  left: L10n;
  right: L10n;
}

export type FlimmerCard = ChoiceCard | SpectrumCard;

export interface RoundResult {
  cardId: string;
  hit: HitKind;
  sender: string;
  catcher: string;
}

export interface FlimmerSession {
  version: number;
  host: string;
  guest: string;
  heat: Heat;
  hostReady: boolean;
  guestReady: boolean;
  started: boolean;
  phase: Phase;
  roundIndex: number;
  sender: string;
  catcher: string;
  cardId: string | null;
  secretSpectrum: number | null;
  signal: string | null;
  guess: string | number | null;
  dualHost: string;
  dualGuest: string;
  hostLocked: boolean;
  guestLocked: boolean;
  lastHit: HitKind | null;
  results: RoundResult[];
  seed: string;
}

export type FlimmerAction =
  | { type: "set_heat"; heat: Heat; by: string }
  | { type: "toggle_ready"; by: string }
  | { type: "start"; by: string }
  | { type: "set_signal"; value: string; spectrum?: number; by: string }
  | { type: "set_guess"; value: string | number; by: string }
  | { type: "set_dual"; value: string; by: string }
  | { type: "lock"; by: string }
  | { type: "next"; by: string }
  | { type: "reset" };
