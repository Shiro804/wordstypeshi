// lib/dictionary.ts
// Fetches word definitions from the Free Dictionary API

export interface WordDefinition {
  word: string;
  phonetic?: string;
  meaning: string;
  meaningGerman?: string;
  partOfSpeech?: string;
}

interface DictionaryAPIResponse {
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

/**
 * Fetches the definition of an English word from the Free Dictionary API.
 * Returns the first definition found, or null if not found.
 */
export async function fetchWordDefinition(word: string): Promise<WordDefinition | null> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`,
      { cache: "force-cache" }
    );

    if (!response.ok) {
      return null;
    }

    const data: DictionaryAPIResponse[] = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }

    const entry = data[0];
    const firstMeaning = entry.meanings[0];
    const firstDefinition = firstMeaning?.definitions[0]?.definition;

    if (!firstDefinition) {
      return null;
    }

    return {
      word: entry.word,
      phonetic: entry.phonetic || entry.phonetics?.find(p => p.text)?.text,
      meaning: firstDefinition,
      partOfSpeech: firstMeaning.partOfSpeech,
    };
  } catch {
    return null;
  }
}

// Simple German translations for common word types/parts of speech
const germanPartsOfSpeech: Record<string, string> = {
  noun: "Substantiv",
  verb: "Verb",
  adjective: "Adjektiv",
  adverb: "Adverb",
  pronoun: "Pronomen",
  preposition: "Präposition",
  conjunction: "Konjunktion",
  interjection: "Interjektion",
};

export function translatePartOfSpeech(pos: string): string {
  return germanPartsOfSpeech[pos.toLowerCase()] || pos;
}

/**
 * Translates text from English to German using MyMemory API.
 */
export async function translateToGerman(text: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|de`,
      { cache: "force-cache" }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data?.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      // Filter out error messages or empty translations
      if (translated && !translated.includes("MYMEMORY WARNING") && translated.toUpperCase() !== text.toUpperCase()) {
        return translated;
      }
    }
    return null;
  } catch {
    return null;
  }
}
