# BataGames

Werbefreies Puzzle-Hub. Live: [www.batagames.com](https://www.batagames.com)

## Spiele

- **BatasWordle** — 5-Buchstaben-Wort raten (Legacy, noch nicht im Game SDK)
- **BatasMind** — Code knacken
- **BatasSearch** — Wörter im Gitter finden
- **BatasBlast** — Reihen und Spalten räumen
- **BatasColors** — Farben mischen, Zielfarbe treffen
- **BatasPairs** — Memory-Paare finden
- **BatasMine** — Minesweeper
- **BatasFlow** — Punkte verbinden, Grid füllen
- **BatasBottles** — Flüssigkeiten sortieren, 1000 Levels

Account optional: Stats und Spielstand syncen über Geräte.

## Tech Stack

- Next.js 16 (App Router), React 19
- Tailwind CSS, shadcn/ui
- Supabase (Auth, Stats-Sync)
- Vitest
- i18n: DE + EN

Neue Spiele: `docs/HOW_TO_ADD_GAME.md` (engine → ruleset → ui-adapter → definition).

## Development

```bash
npm install
cp .env.example .env   # Supabase-Keys eintragen
npm run dev
```

```bash
npm run test:run
npm run lint
npm run build
```
