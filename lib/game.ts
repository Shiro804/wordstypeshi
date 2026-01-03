// lib/game.ts
export type Mark = "correct" | "present" | "absent";

export function scoreGuess(guess: string, answer: string): Mark[] {
  guess = guess.toUpperCase();
  answer = answer.toUpperCase();

  const result: Mark[] = Array(5).fill("absent");
  const remaining: Record<string, number> = {};

  for (const ch of answer) remaining[ch] = (remaining[ch] ?? 0) + 1;

  // Pass 1: correct (green)
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      remaining[guess[i]] -= 1;
    }
  }

  // Pass 2: present (yellow)
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    const ch = guess[i];
    if ((remaining[ch] ?? 0) > 0) {
      result[i] = "present";
      remaining[ch] -= 1;
    }
  }

  return result;
}

export function marksToEmoji(marks: Mark[]) {
  return marks
    .map((m) => (m === "correct" ? "🟩" : m === "present" ? "🟨" : "⬛"))
    .join("");
}

export function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
