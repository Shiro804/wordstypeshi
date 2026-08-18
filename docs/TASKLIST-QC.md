# QC-Taskliste — BataGames

Stand: 2026-08-18. 18 Finder (UI+Logik × 9 Spiele), danach am Code gegencheckt.
Verworfen: ungenutzte Adapter-Configs ohne Caller, reines Chord-Feature (HowToPlay verspricht es nicht), FloatingGameOver-Geschmack, `getInputConfig`-Nits.

Priorität: Shared zuerst (eine Datei, alle Spiele), dann spielspezifische Blocker.

---

## Sprint 1 — Shared Platform

### S1-01 [critical] GameResultOverlay blockiert Header und Modals
`components/games/common/GameResultOverlay.tsx` `z-50` + `fixed inset-0` ohne Dismiss. Header ist `z-10`. Stats/Leaderboard ebenfalls `z-50`, Overlay kommt später im DOM.
- Overlay unter Header (`z-40`) oder Header auf `z-[70]`.
- Nach Stats/Leaderboard Overlay wieder öffnen, wenn das Spiel terminal ist.
- Backdrop stärker (`bg-black/50`), klickbar schließt nicht ohne Alternative.
- `role="dialog"` + Escape + Focus.

### S1-02 [high] Overlay-Copy ignoriert i18n
Default `playAgainLabel = "Nochmal spielen"`, Button-Text `"Stats"`. Fast kein Spiel übergibt Labels.
- Defaults aus `t.common.playAgain` / `t.common.statistics`.
- Alle Game-Caller Labels durchreichen oder Overlay selbst `useLanguage` nutzen.

### S1-03 [high] HowToPlay ist überall Englisch
`HowToPlay.tsx` hat kein `useLanguage`. Menü sagt „Anleitung“, Body bleibt EN. Mehrere Texte widersprechen den Rulesets (WordSearch reverse/diagonal, Blast Combo, Bottles 2 Empties, Flow „Release to finish“).
- EN+DE für alle 9 Spiele.
- Copy an echte Rulesets anpassen (siehe S2–S10).

### S1-04 [high] GameShell: overflow-x clip, Header-Kollision, safe-area
`overflow-x-hidden` schneidet Mine/Search/Bottles-Boards ab. Titel `absolute` überlappt Timer/Difficulty/Reset auf ~320px. `fullHeight` fehlt bei mehreren Spielen → keine bottom safe-area. Union ohne `batasbottles`.
- Overflow: `auto` oder Boards skalieren (pro Spiel).
- Header: Titel `pointer-events-none`, kleiner/wrap.
- `batasbottles` in die `gameId`-Union.
- `fullHeight` oder explizites `paddingBottom: env(safe-area-inset-bottom)` für Mix/Guess/Actions.

### S1-05 [high] Timer vs Engine-Uhr — DONE
Engines setzen `startedAtMs = Date.now()` in `init`. UI-Timer startet erst bei der ersten Aktion. Stats speichern Engine-Dauer (Idle + Hidden-Tab). Restore schreibt `startedAtMs` aus `elapsedMs` um.
- Eine Quelle: erste Aktion ODER sichtbarer Timer. Restore muss fertige Spiele nicht neu justieren (`endedAtMs` gesetzt).
- Betrifft: Wordle, Mind, Search, Colors, Pairs, Mine, Flow, Blast.

### S1-06 [medium] `active-game-storage` revived Map/Set nicht
Save schreibt `{__mapEntries}` / `{__setValues}`. Load ist nacktes `JSON.parse`. Flow crasht/verliert Progress.
- Reviver in `loadActiveGame`. Tests für Map/Set-Roundtrip.

### S1-07 [medium] Stats-Sync überschreibt lokale Wins
`syncGameStats` merget den Snapshot vom Effect-Start. Win während Fetch → `.then` schreibt den alten Stand. `mergeStats` early-return wenn remote neuer+mehr Plays (Pairs `bestScore`/`bestMismatches` fallen weg).
- Merge gegen aktuellen localStorage-Stand.
- Pairs-Metriken immer `max`/`min`, nicht wholesale replace.

---

## Sprint 2 — Wordle

### S2-01 [critical] Seite behauptet deutsches Wordle, Answers sind Englisch
`app/wordle/page.tsx` + `lang=de`. Listen: `about`, `above`, … `t.wordle.invalidWord` existiert, wird nie gezeigt. QWERTZ-Keyboard, EN-Wörter.
- Ehrlich: EN-Wörter sichtbar kommunizieren (Hint-Komponente existiert, ist tot) ODER DE-Liste.
- Toast bei ungültigem Wort.

### S2-02 [high] Easy+Hint zählt als Loss, Copy sagt das Gegenteil
`WordleGame.tsx:597` vs Warning `:890`. Overlay zeigt trotzdem „You Won!“.
- Penalty nur Medium/Hard ODER Copy+Stats angleichen. Overlay = gespeichertes Outcome.

### S2-03 [high] Win beendet die Session nicht
Nur Lose ruft `endSession`. Nächstes Spiel reused die active row und überschreibt `answer`.
- `endSession` auf Win. Kein Reuse ohne Answer-Match.

### S2-04 [high] Difficulty-Wechsel: Loss versprochen, nicht geschrieben
`applyDifficultyChange` endet Session ohne `applyGameResult`, öffnet dann Reset für das *neue* Spiel.
- Ein Forfeit der alten Partie, dann neues Spiel, Reset-Modal zu.

### S2-05 [high] Reset-Confirm schließt nicht; Space-padded Rows
`forfeitCurrentGameAndReset` setzt `confirmResetOpen` nicht auf false. Delete ersetzt Buchstaben durch Space → `length===5`, stilles Reject.
- Modal schließen. Commit auf sichtbare Buchstaben / trim.

### S2-06 [medium] Keyboard trotz offener Modals; played-words stale; `__revealHint` — DONE
- Key-Handler alle Modal-Flags prüfen.
- Local `playedWords` nach Track updaten; Exhaust DB wirklich leeren.
- `window.__revealHint` entfernen.

---

## Sprint 3 — WordSearch

### S3-01 [critical] Fixes Zellen + overflow-x schneidet Spalten ab
`w-9` × 12/14 + gap > Phone-Breite. `touch-none` + preventDefault blockiert Scroll.
- Zellen `min(1fr, …)` / Scale-to-width. Touch-Scroll außerhalb Drag.

### S3-02 [high] Reverse-Select nur Hard; Easy-Diagonal zählt als Miss
`allowReverse: false` easy/medium. `extractPathWord` erlaubt jede Diagonale. HowToPlay lügt.
- Reverse immer matchen ODER HowToPlay korrekt. Easy: Diagonale rejecten, nicht als Miss zählen.

### S3-03 [high] Tap = Miss; Page forciert Medium
`start===end` → misselect. `initialDifficulty="medium"` umgeht `loadDifficulty()`.
- Taps ohne Drag ignorieren. Saved Difficulty ehren.

### S3-04 [medium] Seed-Shuffle `sort(() => random()-0.5)`; Fetch-Fail hängt auf Loading
- `pickRandomSeeded`. Fallback `BASE_WORDS` wenn Fetch leer.

---

## Sprint 4 — Mastermind

### S4-01 [critical] Schwarze Feedback-Pegs unsichtbar
`bg-zinc-900` auf `--surface` ~#09090b. HowToPlay ebenso.
- Kontrast: weißes Ring + Füllung oder Icon.

### S4-02 [high] Overlay/Stats wie S1; Distribution max 6 bei 10/12 Versuchen
`StatsModal` default 6. Hard hat 12.
- `distributionMax={params.maxAttempts}`.

### S4-03 [high] Forfeit ohne await vs initGame; Session reused alten Secret
- `await forfeit` vor `initGame`. Session nur bei gleichem Answer/Difficulty reused.

### S4-04 [medium] Hard-Row 5 Pegs clippt auf 320px; selectedColor tot — DONE
- Scale/wrap. Selection-State setzen oder UI entfernen.

---

## Sprint 5 — BatasBlast

### S5-01 [critical] Drag/Ghost ignoriert CSS-scale
`getBoundingClientRect` skaliert, `CELL_SIZE+GAP` nicht. Mobile-Placement falsch.
- Koordinaten durch `scale` teilen.

### S5-02 [critical] Line-Clear committet Engine 400ms später, ohne Lock
Zweiter Place auf altem Board. Timeout überlebt New Game.
- Lock während Animation. Timeout cancel. State sofort oder Queue.

### S5-03 [high] colorBoard-Restore unsichtbar belegt
Fehlendes `colorBoard` → alles `-1`, Board bleibt occupied.
- Backfill aus `board` oder `board` als Occupancy nutzen.

### S5-04 [medium] daily_challenge tot; Ruleset-Version nach Catalog-Add 1.0.0 — DONE
- Mode entfernen oder daily seed. Version bumpen.

---

## Sprint 6 — BatasColors

### S6-01 [high] Mix-Ergebnis wird nicht neben dem Target gezeigt
Pie wird geleert; History 20px, clippt auf Mobile. Terminal versteckt History.
- Result-Swatch in Target-Größe. History wrap/scroll. Terminal letzten Mix behalten.

### S6-02 [high] 100% Win bei Manhattan ≤ 3
`Math.round((1-diff/765)*100) === 100` für diff 0–3. Falsche Rezepte gewinnen.
- Win nur bei exact RGB oder `diff === 0`.

### S6-03 [high] Keine Engine-Tests
- `engine.test.ts`: mix, win-threshold, attempts, invalid, seed.

### S6-04 [medium] selectedColor immer null; Accuracy-Copy hardcoded; last-segment <10% — DONE
- Palette-Selection binden. i18n-Keys nutzen. Generator-Floor hart erzwingen.

---

## Sprint 7 — BatasPairs

### S7-01 [high] Restore während `isChecking` softlockt
Timer nur in `handleCardClick`. Reload → alle Karten disabled.
- Nach Load `resolve_check` schedulen wenn `isChecking`.

### S7-02 [high] Stale-Closure: Doppelklick / letzter Flip doppelt
`applyAction(gameState)` statt functional update. Stats können doppelt zählen.
- Ref oder `setGameState(prev => apply(prev))`. Win-Guard.

### S7-03 [high] StatsModal zeigt Wordle-Distribution, nicht Pairs-Metriken
`bestScore`/`bestMismatches` geschrieben, Modal zeigt 1–6 Guess-Bars.
- `showDistribution={false}` + Pairs-Karten.

---

## Sprint 8 — BatasMine

### S8-01 [critical] Hard 16×16 = 20px, overflow clippt Spalten
Kein Scale-to-viewport.
- `min()` / scale wie Blast, aber Koordinaten mitziehen. overflow-x auto.

### S8-02 [high] Long-press + contextmenu toggelt Flag zweimal
400ms Flag, dann `contextmenu` unflaggt. Leave vor 400ms → Reveal (Mine = Loss).
- Ein Kanal. Movement-Threshold. Flagged-Tap unflaggt.

### S8-03 [high] First Reveal wipet Flags, `flagsPlaced` bleibt
Mine-Counter dauerhaft falsch.
- `flagsPlaced` nach `placeMines` neu zählen.

### S8-04 [high] „Guess-free“ fällt auf Hard immer auf Fallback — DONE
Solver zu schwach, 100 Retries dann trotzdem Board.
- Ehrlich in HowToPlay ODER stärkerer Solver. Tests.

### S8-05 [high] Keine Engine-Tests
- First-click, flag-wipe, win, flood-fill.

---

## Sprint 9 — BatasFlow

### S9-01 [critical] Pointer-up löscht den Path (stale finish → clear)
`finish_path` auf altem `gameState`; bei invalid → `clear_path` auf *latest*.
- Functional state. Incomplete Paths behalten (Kommentar sagt das schon). Bresenham für übersprungene Zellen.

### S9-02 [high] Map/Set-Reload (S1-06) + length-1 Path nicht clearbar
- Nach S1-06: Dot-Tap clear/restart wenn `currentPath` gesetzt. pointercancel finish/clear.

### S9-03 [medium] 10×10 Hard, Lücken statt Pipes, zwei Farbtabellen — DONE
- Optional 9×9. gap 0 / echte Connectors. Eine `FLOW_COLORS`-Quelle.

---

## Sprint 10 — BatasBottles

### S10-01 [critical] Board breiter als Phone, overflow clippt Flaschen
Fixed px, 2–3 Spalten, kein Scale. Ab Easy unerreichbare Flaschen.
- Scale-to-width oder wrap. Nicht clippen.

### S10-02 [high] „Zurück zu Levels“ öffnet Reset und startet dasselbe Level
`forfeitCurrentGameAndReset` → `startLevel(level)`.
- Confirm: forfeit + `backToLevels()`.

### S10-03 [high] Pour-Anim: State zuerst, Stream eine Frame zu spät, Win-Modal darüber
- Anim vor Commit oder Overlay nach `POUR_ANIM_MS`. Layer-Keys nicht remounten.

### S10-04 [high] 0-Stern-Wins sehen aus wie ungespielt; Sync wipet Progress
`isCompleted = stars >= 1`. In-flight sync (S1-07).
- 0★ als completed markieren. Sync-Race S1-07.

### S10-05 [medium] HowToPlay „immer 2 Leere“ — 875/1000 haben eine — DONE
- Copy an Generator. Phase-Labels i18n. Level-Select Phase nach Sync nachziehen.

---

## Reihenfolge

1. S1 (Overlay, i18n, Shell, Timer, Storage, Sync)
2. S5-01/02, S9-01, S10-01/02, S8-01/02, S3-01, S2-01/02 (spielbare Blocker)
3. Rest High
4. Medium/Tests

Nicht in dieser Liste: CVD-Patterns überall (eigenes Design-Ticket), SEO-Metadata pro Route, `Date.now()`-Reinheit der Engines (nach S1-05, eigenes SDK-Ticket).
