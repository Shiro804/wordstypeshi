import { describe, it, expect } from 'vitest';
import { scoreGuess, marksToEmoji, pickRandom, type Mark } from '../game';

describe('scoreGuess', () => {
  it('marks all correct when guess matches answer', () => {
    const result = scoreGuess('HELLO', 'HELLO');
    expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('marks all absent when no letters match', () => {
    const result = scoreGuess('AAAAA', 'BBBBB');
    expect(result).toEqual(['absent', 'absent', 'absent', 'absent', 'absent']);
  });

  it('marks present for letters in wrong position', () => {
    const result = scoreGuess('ABCDE', 'EDCBA');
    // A is at 0, should be at 4 -> present
    // B is at 1, should be at 3 -> present
    // C is at 2, correct
    // D is at 3, should be at 1 -> present
    // E is at 4, should be at 0 -> present
    expect(result).toEqual(['present', 'present', 'correct', 'present', 'present']);
  });

  it('handles duplicate letters correctly - one correct, one absent', () => {
    // Answer has one L, guess has two Ls
    const result = scoreGuess('ALLOY', 'ALONE');
    // A - correct (position 0)
    // L - correct (position 1)
    // L - absent (no more Ls in answer)
    // O - present (O is in answer at position 2, not 3)
    // Y - absent
    expect(result[0]).toBe('correct'); // A
    expect(result[1]).toBe('correct'); // L (first one matches)
    expect(result[2]).toBe('absent');  // L (second one, no more Ls)
    expect(result[3]).toBe('present'); // O (exists but wrong position)
    expect(result[4]).toBe('absent');  // Y
  });

  it('handles all letters present but wrong positions', () => {
    const result = scoreGuess('EARTH', 'HEART');
    // E at 0 should be at 1 -> present
    // A at 1 should be at 2 -> present
    // R at 2 should be at 3 -> present
    // T at 3 should be at 4 -> present
    // H at 4 should be at 0 -> present
    expect(result).toEqual(['present', 'present', 'present', 'present', 'present']);
  });

  it('is case insensitive', () => {
    const result = scoreGuess('hello', 'HELLO');
    expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('handles repeated letters in answer correctly', () => {
    // Answer GEESE has multiple Es
    const result = scoreGuess('EERIE', 'GEESE');
    // E at 0 -> present (E exists at positions 1,2,4)
    // E at 1 -> correct
    // R at 2 -> absent
    // I at 3 -> absent
    // E at 4 -> correct
    expect(result[0]).toBe('present');
    expect(result[1]).toBe('correct');
    expect(result[2]).toBe('absent');
    expect(result[3]).toBe('absent');
    expect(result[4]).toBe('correct');
  });
});

describe('marksToEmoji', () => {
  it('converts correct marks to green squares', () => {
    const marks: Mark[] = ['correct', 'correct', 'correct', 'correct', 'correct'];
    expect(marksToEmoji(marks)).toBe('🟩🟩🟩🟩🟩');
  });

  it('converts absent marks to black squares', () => {
    const marks: Mark[] = ['absent', 'absent', 'absent', 'absent', 'absent'];
    expect(marksToEmoji(marks)).toBe('⬛⬛⬛⬛⬛');
  });

  it('converts present marks to yellow squares', () => {
    const marks: Mark[] = ['present', 'present', 'present', 'present', 'present'];
    expect(marksToEmoji(marks)).toBe('🟨🟨🟨🟨🟨');
  });

  it('handles mixed marks correctly', () => {
    const marks: Mark[] = ['correct', 'absent', 'present', 'correct', 'absent'];
    expect(marksToEmoji(marks)).toBe('🟩⬛🟨🟩⬛');
  });
});

describe('pickRandom', () => {
  it('returns an element from the array', () => {
    const arr = ['a', 'b', 'c'];
    const result = pickRandom(arr);
    expect(arr).toContain(result);
  });

  it('returns the only element for single-element array', () => {
    const result = pickRandom(['only']);
    expect(result).toBe('only');
  });
});
