# TASK-033: Neues Spiel — BatasMine

## Spielbeschreibung

**BatasMine** ist ein klassisches Minesweeper-Puzzle, vollständig ins BataGames Game Hub integriert. Der Spieler deckt Felder auf einem Gitter auf, ohne eine Mine zu treffen. Zahlen zeigen an, wie viele der 8 benachbarten Felder Minen enthalten. Leere Felder (0 Nachbar-Minen) werden automatisch aufgedeckt (Flood-Fill). Der erste Klick ist immer sicher.

### Schwierigkeitsgrade
- **Easy**: 8×8 Gitter, 10 Minen
- **Medium**: 12×12 Gitter, 30 Minen
- **Hard**: 16×16 Gitter, 60 Minen

### Features
- Sprachunabhängig (keine Wörter, nur Zahlen + Icons)
- Flag-Modus (Button oder Rechtsklick/Long-Press)
- Mobil-freundlich mit adaptiver Zellgröße
- Vollständig integriert: GameShell, Stats, Leaderboard, Timer, i18n (EN+DE), Storage/Sync
- Game SDK Pattern: engine.ts, ruleset.ts, ui-adapter.ts, definition.ts
- Hub-Page Eintrag mit Bomb-Icon und rot/rose Farbgradient
- How to Play Anleitung
- Sitemap-Eintrag

### Implementierte Dateien
- `lib/games/batasmine/` (engine, ruleset, ui-adapter, definition, index)
- `components/games/batasmine/BatasMineGame.tsx`
- `app/batasmine/page.tsx`
- Registry, Hub, Sitemap, GameShell, HowToPlay, i18n aktualisiert
