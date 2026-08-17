/**
 * Game SDK - Deterministic PRNG primitives
 *
 * Kept in its own module so level / puzzle generators can import them
 * without pulling the whole SDK barrel (which would create a cycle via
 * `types.ts` → `levels.ts` → `index.ts`).
 */

/**
 * Simple seeded random number generator (Mulberry32).
 * Returns a function that generates numbers between 0 and 1.
 */
export function createSeededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  let state = hash >>> 0;

  return () => {
    state = Math.imul(state ^ (state >>> 16), 0x85ebca6b);
    state = Math.imul(state ^ (state >>> 13), 0xc2b2ae35);
    state ^= state >>> 16;
    return (state >>> 0) / 4294967296;
  };
}

/**
 * Generate a deterministic seed from inputs.
 * Used for daily challenges and reproducible games.
 */
export function generateDailySeed(
  gameId: string,
  mode: string,
  date: Date
): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `${gameId}-${mode}-${dateStr}`;
}

/**
 * Pick N random items from an array using seeded random.
 */
export function pickRandomSeeded<T>(
  arr: T[],
  n: number,
  random: () => number
): T[] {
  const result: T[] = [];
  const copy = [...arr];

  for (let i = 0; i < n && copy.length > 0; i++) {
    const index = Math.floor(random() * copy.length);
    result.push(copy.splice(index, 1)[0]);
  }

  return result;
}
