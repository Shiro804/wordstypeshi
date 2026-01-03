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

export type Difficulty = "easy" | "medium" | "hard";

export async function loadWordLists(difficulty: Difficulty = "medium"): Promise<WordLists> {
  const solutionsPath =
    difficulty === "easy" ? "/words/easy.txt" : difficulty === "hard" ? "/words/hard.txt" : "/words/medium.txt";

  const [allowedRes, solutionsRes, bannedRes] = await Promise.all([
    fetch("/words/words.txt", { cache: "force-cache" }),
    fetch(solutionsPath, { cache: "force-cache" }),
    fetch("/words/banned.txt", { cache: "force-cache" }).catch(() => null),
  ]);

  const allowedText = await allowedRes.text();
  const solutionsText = await solutionsRes.text();
  const bannedText = bannedRes ? await bannedRes.text() : "";

  const banned = new Set(bannedText.split(/\r?\n/).map(normalizeLine).filter(Boolean));

  const allowed = Array.from(
    new Set(
      allowedText
        .split(/\r?\n/)
        .map(normalizeLine)
        .filter(isValidFiveLetterWord)
        .filter((w) => !banned.has(w)),
    ),
  );

  const solutions = Array.from(
    new Set(
      solutionsText
        .split(/\r?\n/)
        .map(normalizeLine)
        .filter(isValidFiveLetterWord)
        .filter((w) => !banned.has(w)),
    ),
  );

  return { allowed, solutions };
}
