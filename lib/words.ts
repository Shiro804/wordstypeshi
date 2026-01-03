// lib/words.ts
export type WordLists = {
  allowed: string[]; // valid guesses
  solutions: string[]; // words used as answers
};

function normalizeLine(s: string) {
  return s.trim().toUpperCase();
}

function isValidFiveLetterWord(s: string) {
  return /^[A-Z]{5}$/.test(s);
}

export async function loadWordLists(): Promise<WordLists> {
  const [wordsRes, bannedRes] = await Promise.all([
    fetch("/words/words.txt", { cache: "force-cache" }),
    fetch("/words/banned.txt", { cache: "force-cache" }).catch(() => null),
  ]);

  const wordsText = await wordsRes.text();
  const bannedText = bannedRes ? await bannedRes.text() : "";

  const banned = new Set(
    bannedText.split(/\r?\n/).map(normalizeLine).filter(Boolean)
  );

  const all = wordsText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(isValidFiveLetterWord);

  // dedupe + filter banned
  const clean = Array.from(new Set(all)).filter((w) => !banned.has(w));

  // MVP: allowed == solutions (du kannst später trennen)
  return { allowed: clean, solutions: clean };
}
