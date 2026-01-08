/**
 * BataBlust - Deterministic PRNG
 * 
 * xorshift128 implementation for cross-platform reproducible randomness.
 * Never use Math.random() in game logic!
 */

// ============================================================================
// Types
// ============================================================================

export interface PRNGState {
  s0: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface PRNG {
  /** Get current state (for serialization) */
  getState(): PRNGState;
  /** Set state (for deserialization/replay) */
  setState(state: PRNGState): void;
  /** Get next random float in [0, 1) */
  next(): number;
  /** Get next random integer in [0, max) */
  nextInt(max: number): number;
  /** Get next random integer in [min, max) */
  nextIntRange(min: number, max: number): number;
  /** Shuffle an array in place */
  shuffle<T>(array: T[]): T[];
  /** Pick a weighted random index */
  weightedChoice(weights: number[]): number;
}

// ============================================================================
// Seed Hashing
// ============================================================================

/**
 * Hash a string to a 32-bit integer using MurmurHash3-like algorithm.
 */
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Initialize PRNG state from a seed string.
 */
function initState(seed: string): PRNGState {
  // Generate 4 different hashes from the seed
  const h0 = hashString(seed + "_0");
  const h1 = hashString(seed + "_1");
  const h2 = hashString(seed + "_2");
  const h3 = hashString(seed + "_3");
  
  return {
    s0: h0 || 1, // Ensure non-zero
    s1: h1 || 2,
    s2: h2 || 3,
    s3: h3 || 4,
  };
}

// ============================================================================
// xorshift128 Implementation
// ============================================================================

/**
 * Create a new PRNG instance from a seed string.
 */
export function createPRNG(seed: string): PRNG {
  let state = initState(seed);

  /**
   * xorshift128 step - generates next 32-bit value.
   */
  function xorshift128(): number {
    let t = state.s3;
    const s = state.s0;
    
    state.s3 = state.s2;
    state.s2 = state.s1;
    state.s1 = s;
    
    t ^= t << 11;
    t ^= t >>> 8;
    state.s0 = t ^ s ^ (s >>> 19);
    
    return state.s0 >>> 0;
  }

  return {
    getState(): PRNGState {
      return { ...state };
    },

    setState(newState: PRNGState): void {
      state = { ...newState };
    },

    next(): number {
      // Convert to [0, 1) range
      return xorshift128() / 0x100000000;
    },

    nextInt(max: number): number {
      return Math.floor(this.next() * max);
    },

    nextIntRange(min: number, max: number): number {
      return min + this.nextInt(max - min);
    },

    shuffle<T>(array: T[]): T[] {
      // Fisher-Yates shuffle
      for (let i = array.length - 1; i > 0; i--) {
        const j = this.nextInt(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    },

    weightedChoice(weights: number[]): number {
      const total = weights.reduce((sum, w) => sum + w, 0);
      let r = this.next() * total;
      
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
      }
      
      return weights.length - 1; // Fallback
    },
  };
}
