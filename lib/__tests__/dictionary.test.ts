import { describe, it, expect } from 'vitest';
import { translatePartOfSpeech } from '../dictionary';

describe('translatePartOfSpeech', () => {
  it('translates noun to Substantiv', () => {
    expect(translatePartOfSpeech('noun')).toBe('Substantiv');
  });

  it('translates verb to Verb', () => {
    expect(translatePartOfSpeech('verb')).toBe('Verb');
  });

  it('translates adjective to Adjektiv', () => {
    expect(translatePartOfSpeech('adjective')).toBe('Adjektiv');
  });

  it('translates adverb to Adverb', () => {
    expect(translatePartOfSpeech('adverb')).toBe('Adverb');
  });

  it('translates pronoun to Pronomen', () => {
    expect(translatePartOfSpeech('pronoun')).toBe('Pronomen');
  });

  it('translates preposition to Präposition', () => {
    expect(translatePartOfSpeech('preposition')).toBe('Präposition');
  });

  it('translates conjunction to Konjunktion', () => {
    expect(translatePartOfSpeech('conjunction')).toBe('Konjunktion');
  });

  it('translates interjection to Interjektion', () => {
    expect(translatePartOfSpeech('interjection')).toBe('Interjektion');
  });

  it('is case insensitive', () => {
    expect(translatePartOfSpeech('NOUN')).toBe('Substantiv');
    expect(translatePartOfSpeech('Verb')).toBe('Verb');
  });

  it('returns original for unknown parts of speech', () => {
    expect(translatePartOfSpeech('determiner')).toBe('determiner');
    expect(translatePartOfSpeech('unknown')).toBe('unknown');
  });
});
