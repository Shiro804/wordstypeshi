# Couple-Game Konzept — BatasFlimmer

Datum: 2026-08-18  
Status: Freigegeben. Sichtbar nur für `SuperBata1804` und `SuperSelim0606`.  
Repo: wordstypeshi / BataGames

---

## Empfehlung

**BatasFlimmer** — ein 2-Personen-Live-Spiel, in dem ihr abwechselnd einen geheimen Gedanken über den anderen habt und ihn nur mit einem winzigen Signal schickt (Emoji → Wort → Spektrum). Der andere muss ihn fangen. Der Jackpot ist nicht der Volltreffer, sondern das **Beinahe**.

Ein Satz: *Nicht „wie gut kennt ihr euch?“ — sondern „kannst du den Gedanken fangen, den ich gerade über dich habe?“*

---

## Recherche: Markt

### AAA / Konsolen-Co-op (Bindung, aber nicht Schmetterling-Web)
- It Takes Two, Split Fiction (2025), Together: Moon Escape (2026), Bip and Bop, Chained Together, Luigi’s Mansion 3, Stardew, Sea of Thieves
- GamesRadar+ Date-Night-Listen: Kooperation + Lachen. Kein 8-Minuten-Browser, kein Invite-in-App.

### Couple-Apps (Kommunikation, oft fade nach Woche 2)
- **Paired** (8M+ Downloads): Daily Question, Quiz, Journeys. City University Studie: Relationship Quality steigt bei >3 Monaten Nutzung, Mechanismus = habituierte Gespräche + „neutraler Dritter“. Inhalt ist Therapie-lite + Quiz. Kein Game-Feel.
- **We’re Not Really Strangers Couples** (1M+ Boxen): Karten, Stufen, Zuhören. Virtuell nur als Prompt-Deck. Kein Live-Catch.
- **Lovify, Couples Flirt, Lovely Couple, Vorspiel, Paarspiel**: Fragen / Wahrheit-oder-Pflicht / Soft–Extrem. Markt ist voll. Cringe-Risiko hoch, sobald „Aufgabe: zieh ein Kleidungsstück aus“ die Kernschleife ist.
- **SyncWithLove / CoupleQ**: Simultaneous lock, Would-You-Rather, Compatibility-Score. Dünn, austauschbar, 10 Runden Multiple Choice.

### Brettspiele, die wirklich „wir denken gleich“ erzeugen
- **Wavelength** (Warsch/Hague/Vickers): Spektrum + Clue. Gefühl = Telepathie / Empathie. Bullseye fühlt sich an wie ein Zaubertrick. Near-miss ist schon belohnend.
- **The Mind**: Sync ohne Reden. Stille + Timing = körperliche Spannung.
- **So Clover / Codenames Duet**: gemeinsame mentale Landkarte.

### Affection-Games-Forschung (Couillard, DiGRA)
- Game-Verben: flirten, umarmen, küssen, sexuelle Zuneigung.
- Drei Dynamiken: digitally *contained* / *facilitated* / *communicated* affection.
- Klassische Web-Kuss-Spiele = „kiss and evade“ (Autorität kommt, loslassen). Spannung = *almost caught*.
- Hugging-Games sind selten. Flirt-Games existieren, sind aber meist Single-Player gegen NPC.

### Couple-Gaming (PGT / Gottman SRH, University of Washington)
- Shared Gaming stützt Fondness, Love Maps, Shared Meaning — wenn Design und Couple-Needs kongruent sind.
- Inkongruenz (ein Partner carryt, der andere langweilt sich) erzeugt Frust.
- Design-Implikation: beide Rollen gleich wichtig, kein Skill-Gap, kein Public Shame.

---

## Psychologie: was Schmetterlinge wirklich macht

Vier Passion-Theorien (Carswell & Impett 2021, *Social and Personality Psychology Compass*):

1. **Limerence (Tennov):** Unsicherheit über Erwiderung. Herzklopfen ≈ Angst. In etablierten Beziehungen unsicher als Hebel — wir nutzen **sichere Unsicherheit**: *was denkt der andere *jetzt* über mich*, nicht *liebt der mich noch*.
2. **Rate of Change in Intimacy (Baumeister & Bratslavsky):** Passion = Ableitung der Intimität. Braucht einen *Sprung* an Nähe in wenigen Minuten, nicht eine Checkliste.
3. **Self-Expansion (Aron):** Neue, leicht erregende gemeinsame Aktivität. Aron et al. 2000: **7 Minuten** novel+arousing heben Relationship Quality vs. mundane Task. Muise et al. 2019: Self-Expansion → Desire → Satisfaction.
4. **Triangular (Sternberg):** Passion habituert. Gegenmittel: neue Bedürfnisse sichtbar machen, nicht dieselben Love-Language-Fragen.

Zusätzlich:
- **Novelty + mild arousal** (Aron newspaper + 3 Lab-Experiments).
- **Being seen / Love Maps (Gottman):** richtig gelesen werden ist intimer als selbst reden.
- **Perceived partner responsiveness:** verstanden + validiert.
- **Scaffolding (Couple-Therapeuten):** Spiel nimmt das Awkward aus „sollen wir…?“.
- Paired-Evaluation (Witney / City): Daily Questions wirken, *weil die App der neutrale Dritte ist* — schwere Themen ohne Anklage. Fun + Ernst mischen.

Was wir **nicht** bauen: Unsicherheit über die Beziehung selbst. Das ist ängstlich, nicht prickelnd.

---

## Warum die üblichen Couple-Games fade sind

| Typ | Problem |
|---|---|
| „Wie gut kennst du mich?“ Quiz | Trivia über Fakten. Kein Jetzt. Nach 2 Runden vorhersehbar. |
| Daily Question (Paired) | Habit, kein Herzklopfen. Gut für Gesundheit, schlecht für Date-Night-Spark. |
| Wahrheit oder Pflicht / Extrem-Karten | Entweder Kindergarten oder Porn-To-Do-Liste. Kein Spiel, nur Prompt. |
| Compatibility-Score 0–10 | Reduziert das Paar auf Prozent. Tötet Mystery. |
| AAA-Co-op | Bindet, braucht 8 Stunden und eine Konsole. |

Marktlücke für BataGames: **Live, 8–12 Minuten, Browser, Invite-in-App, Game-Feel wie Wavelength, Inhalt wie Flirt, Score wie Beinahe.**

---

## Spielkonzept BatasFlimmer

### Fantasy
Ihr sitzt nicht gegenüber mit Karteikarten. Einer von euch hat *gerade* einen Gedanken über den anderen. Der darf ihn nicht sagen. Nur ein Signal. Der andere muss ihn fangen, bevor er zerfällt.

### Setup (60 Sekunden)
1. Eingeloggt → Spiel öffnen → **Partner einladen** (Username / Recents).
2. Ist der Partner **online in der App**: Full-screen Pulse-Toast („X denkt an dich. Mitspielen?“). Annehmen / später.
3. Ist er offline: Invite bleibt in der Inbox + optional ntfy.
4. Zusammen **Heat** wählen: Soft / Warm / Hot. Beide müssen zustimmen. Jederzeit senken.
5. 7 Runden, Rollen tauschen. ~90 Sekunden pro Runde.

### Rollen
- **Sender** sieht die geheime Karte.
- **Catcher** sieht sie nicht.

### Kartentypen (mischen, Heat filtert)
- **Want** — was ich *jetzt* von dir will (kein Haushalts-Quiz).
- **Memory** — welcher Moment mit dir immer noch im Bauch knallt.
- **Almost** — was ich fast gesagt / fast getan hätte.
- **Spectrum** — geheime Position auf einem Pol-Paar (Wavelength-Gen).

Beispiele Soft:
- Want: „Ich will, dass du mich *so* ansiehst, wie beim ersten Date.“
- Memory: „Der Moment, in dem ich wusste, dass du gefährlich bist (im guten Sinn).“
- Spectrum: *sicheres Nest ←→ offene Straße nachts*

Beispiele Warm:
- Want: „Ich will, dass du mich unterbrichst — mit einem Kuss, nicht mit einem Argument.“
- Almost: „Was ich gestern fast geschrieben hätte, dann gelöscht habe.“
- Spectrum: *vertrautes Chaos ←→ neues Versteck*

Beispiele Hot (witzig, nie klinisch, nie Checkliste):
- Want: „Ich will, dass du so tust, als kenntest du mich noch nicht.“
- Almost: „Der Gedanke, den ich nicht laut sagen würde, wenn deine Mitbewohnerin im Zimmer wäre.“
- Spectrum: *langsam quälen ←→ jetzt sofort*

### Signal-Constraint (die eigentliche Mechanik)
Sender darf den Gedanken **nicht** erklären.

| Runde | Kanal |
|---|---|
| 1–2 | ein Emoji |
| 3–4 | ein Wort (max. 12 Zeichen) |
| 5 | Spektrum: Sender setzt unsichtbar, Catcher schiebt blind |
| 6 | 3-Sekunden-Voice *oder* getippter Puls (••••) |
| 7 | **Doppel-Beinahe:** beide schreiben, was der *andere* gerade denkt. Gleichzeitiges Reveal. |

Catcher wählt bei Want/Memory/Almost aus **1 Wahrheit + 3 plausiblen Ködern** (Heat-Deck, auf das Paar kalibriert, nicht random-absurd).

### Scoring — das Beinahe ist der Hit
- **Direct hit:** selten. Animation: zwei Pulse werden eins. +3.
- **Almost** (benachbarter Köder / Spektrum im inneren Ring): Signatur des Spiels. Motten kreisen, verfehlen sich, treffen sich doch. +2. Sender darf *einen halben Satz* nachreichen — nur dann.
- **Wrong frequency:** kein Shame. Kurzer Witz, Karte wird aufgedeckt, ihr lacht. +0, nächste Runde.

Session-Score = **Flimmer%** (wie oft ihr in Hit+Almost wart). Privat. Kein öffentliches Leaderboard der Antworten.

### Live-Präsenz (Schmetterlinge vor dem Reveal)
- Catcher sieht: „schreibt…“ / Cursor zittert / Herzfrequenz-Ring, der schneller wird, je länger der Sender braucht (nicht je näher — das wäre Cheat).
- Beide locken unabhängig. Reveal in derselben Sekunde (SyncWithLove-Lektion: sonst justiert man nach).
- Kein Textchat während der Runde. Danach 20s Flüstern optional.

### Invite / Multiplayer (Produktanforderung)
- Nur eingeloggte User.
- Invite aus dem Spiel, nicht per nacktem Link als Default (Link als Fallback).
- **Online:** Overlay über dem aktuellen Screen (auch mitten in Wordle) — Pulse, Name, „Mitspielen“.
- Accept → beide in Room, Heat-Handshake, Start.
- Disconnect: Pause, 60s Reconnect, sonst Invite bleibt offen.
- Erster echter Multiplayer auf BataGames. Kein Skill-Carry.

### Privacy / Safety
- Antworten nie public, nie in Stats-Distribution.
- Soft default. Hot nur nach beidseitigem Opt-in + 18+-Hinweis.
- Skip-Karte ohne Begründung.
- Kein User-generated Sex-Content im v1 (Decks kuratiert).
- Session nach Ende löschbar.
- Kein „macht das im echten Leben“-Zwang. Digital contained + digital communicated (Couillard). Off-game bleibt optional.

### Session-Länge
8–12 Minuten. Aron: 7 Minuten reichen für den Quality-Sprung. Danach „Noch eine Runde“ oder Hub.

---

## Warum das auf BataGames sitzt

- Kurze Sessions wie Wordle, Wort/Emoji/Spektrum = DNA der Hub-Spiele.
- GameShell, Auth, i18n, Difficulty (Heat ≈ Difficulty) wiederverwendbar.
- Erster Invite-Layer nützt später anderen Spielen.
- Differenzierung: 9 Solospiele + 1 Paar-Live-Spiel.

SDK-Anpassung nötig: Engine ist nicht mehr single-player deterministic-vs-clock, sondern room-state (Supabase Realtime). Das ist neu, aber klein, wenn v1 nur 2 Sitze hat.

---

## Verworfene Alternativen

1. **Paired-Klon** — Markt tot, fade, kein Game.
2. **Truth-or-Dare-Deck** — Lovely Couple / Vorspiel besitzen DE. Cringe.
3. **It-Takes-Two-Lite** — zu groß für Web, kein Schmetterling-Kern.
4. **Reines Wavelength** — smart, aber nicht couple-coded. Fehlt Want/Almost/Heat.
5. **Pictionary der Fantasien** — Shame-Risiko, Skill-Gap Zeichnen.
6. **Digitale 36 Fragen** — berühmt, fühlt sich nach Hausaufgabe an.
7. **Would You Rather only** — SyncWithLove hat das, 20 A/B, kein Fang-den-Gedanken.

---

## v1-Schnitt (nur nach Approve)

- Room + Invite-Overlay + Presence
- Soft + Warm Decks (DE/EN), Hot als Flag
- Runden 1–5 (Emoji, Wort, Spektrum)
- Almost-Scoring + Reveal
- Kein Voice, kein User-Deck-Editor, kein öffentliches Board

---

## Quellen (Auswahl)

- Carswell & Impett (2021). What fuels passion? *SPPC*. https://doi.org/10.1111/spc3.12629
- Aron, Norman, Aron, McKenna, Heyman (2000). Shared participation in novel and arousing activities. *J Personality & Social Psychology*.
- Muise et al. (2019). Broadening your horizons. *JPSP* 116(2).
- Aron et al. (2022). Self-expansion motivation… *J Social & Personal Relationships*.
- Emery (2025). Self-Expansion Theory. *SPPC*.
- Baumeister & Bratslavsky (1999). Rate of change in intimacy.
- Tennov (1979). *Love and Limerence*.
- Sternberg (1986). Triangular theory of love.
- Lew, PGT: How Romantic Partners Build Sound Relationship Houses through Shared Gaming. https://faculty.washington.edu/alexisr/PGT.pdf
- Couillard. Affection Games in Digital Play (DiGRA 2013). https://doi.org/10.26503/dl.v2013i1.645
- Couillard. Love, Lust, Courtship… (DiGRA 2017). https://doi.org/10.26503/dl.v2017i1.931
- Paired mixed-methods: City Research Online eprint 35125; Witney et al. *JFTR*.
- Wavelength Kickstarter / reviews (calibration, bullseye-as-magic).
- WNRS Couples Edition; Paired support; Lovely Couple; SyncWithLove WYR; CoupleQ; GamesRadar best couple games 2025/26; Steam Together: Moon Escape, Bip and Bop.
