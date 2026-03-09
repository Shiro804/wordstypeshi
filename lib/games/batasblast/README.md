# BataBlust

A Block Blast clone - place blocks on an 8×8 grid and clear lines to score!

## Rules

1. **Board**: 8×8 grid of cells
2. **Tray**: 3 pieces at a time - place all 3 to get a new set
3. **Placement**: Tap a piece, then tap the board where it fits
4. **Clearing**: Full rows/columns clear instantly
5. **Game Over**: When no piece can be placed anywhere

## Scoring (v1.0.0)

| Event | Points |
|-------|--------|
| Placement | +1 per cell |
| Line clear | +10 per line |
| Multi-clear bonus | +5 × (lines - 1) |
| Combo bonus | +2 × combo_streak × lines |

**Combo**: Consecutive moves with clears.

## Modes

- **Classic**: Endless score chasing
- **Daily Challenge**: Same seed for everyone (coming soon)

## Determinism

- Uses xorshift128 PRNG seeded from string
- Same seed → same piece stream
- Fully replay-verifiable for leaderboards

## Adding a New Piece

1. Edit `ruleset.ts`
2. Add to `PIECE_CATALOG` with `id`, `name`, `cells` (offsets), `weight`
3. Higher weight = more frequent
