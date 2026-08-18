import type { ChoiceCard, FlimmerCard, Heat, SpectrumCard } from "./types";

const want = (
  id: string,
  heat: Heat,
  prompt: ChoiceCard["prompt"],
  truth: ChoiceCard["truth"],
  decoys: ChoiceCard["decoys"],
  almostDecoy: ChoiceCard["almostDecoy"]
): ChoiceCard => ({ id, heat, kind: "choice", type: "want", prompt, truth, decoys, almostDecoy });

const memory = (
  id: string,
  heat: Heat,
  prompt: ChoiceCard["prompt"],
  truth: ChoiceCard["truth"],
  decoys: ChoiceCard["decoys"],
  almostDecoy: ChoiceCard["almostDecoy"]
): ChoiceCard => ({ id, heat, kind: "choice", type: "memory", prompt, truth, decoys, almostDecoy });

const almost = (
  id: string,
  heat: Heat,
  prompt: ChoiceCard["prompt"],
  truth: ChoiceCard["truth"],
  decoys: ChoiceCard["decoys"],
  almostDecoy: ChoiceCard["almostDecoy"]
): ChoiceCard => ({ id, heat, kind: "choice", type: "almost", prompt, truth, decoys, almostDecoy });

const spectrum = (
  id: string,
  heat: Heat,
  prompt: SpectrumCard["prompt"],
  left: SpectrumCard["left"],
  right: SpectrumCard["right"]
): SpectrumCard => ({ id, heat, kind: "spectrum", prompt, left, right });

export const FLIMMER_DECK: FlimmerCard[] = [
  want(
    "s-want-look",
    "soft",
    { en: "What I want from you right now", de: "Was ich jetzt von dir will" },
    { en: "Look at me the way you did on our first date", de: "Sieh mich an wie beim ersten Date" },
    [
      { en: "Tell me a stupid joke until I snort", de: "Erzähl einen dummen Witz, bis ich schnaube" },
      { en: "Sit closer, no talking", de: "Setz dich näher, ohne zu reden" },
      { en: "Plan something tiny for this week", de: "Plan irgendwas Kleines für diese Woche" },
    ],
    1
  ),
  memory(
    "s-mem-danger",
    "soft",
    { en: "The moment that still drops my stomach", de: "Der Moment, der immer noch im Bauch knallt" },
    { en: "The second I knew you were dangerous — in the good way", de: "Als ich wusste, dass du gefährlich bist — im guten Sinn" },
    [
      { en: "Our most embarrassing public laugh", de: "Unser peinlichstes Lachen in der Öffentlichkeit" },
      { en: "The first time you waited for me without asking", de: "Als du das erste Mal ohne Frage auf mich gewartet hast" },
      { en: "A quiet night that felt longer than it was", de: "Ein stiller Abend, der länger wirkte als er war" },
    ],
    0
  ),
  almost(
    "s-almost-text",
    "soft",
    { en: "What I almost sent you, then deleted", de: "Was ich dir fast geschickt und dann gelöscht habe" },
    { en: "I miss your face in this exact room", de: "Dein Gesicht fehlt mir in genau diesem Raum" },
    [
      { en: "Did you eat?", de: "Hast du schon gegessen?" },
      { en: "I saw something that reminded me of us", de: "Ich hab etwas gesehen, das an uns erinnert" },
      { en: "Come over if you're not too tired", de: "Komm rüber, wenn du nicht zu müde bist" },
    ],
    2
  ),
  spectrum(
    "s-spec-nest",
    "soft",
    { en: "Tonight I lean toward…", de: "Heute Abend tendiere ich zu…" },
    { en: "Safe nest", de: "Sicheres Nest" },
    { en: "Open street at night", de: "Offene Straße nachts" }
  ),
  want(
    "w-want-interrupt",
    "warm",
    { en: "What I want from you right now", de: "Was ich jetzt von dir will" },
    { en: "Interrupt me — with a kiss, not an argument", de: "Unterbrich mich — mit einem Kuss, nicht mit einem Argument" },
    [
      { en: "Tell me I'm being dramatic and stay anyway", de: "Sag mir, dass ich dramatisch bin, und bleib trotzdem" },
      { en: "Replay a fight we already survived, softly", de: "Spiel einen Streit nach, den wir schon überlebt haben, weich" },
      { en: "Let me win one tiny thing", de: "Lass mich eine winzige Sache gewinnen" },
    ],
    0
  ),
  memory(
    "w-mem-almost-said",
    "warm",
    { en: "A moment I still carry in my throat", de: "Ein Moment, der mir noch im Hals sitzt" },
    { en: "The pause before you said my name differently", de: "Die Pause, bevor du meinen Namen anders gesagt hast" },
    [
      { en: "When we got lost on purpose", de: "Als wir uns absichtlich verlaufen haben" },
      { en: "The first time you fell asleep on my shoulder", de: "Als du das erste Mal auf meiner Schulter eingeschlafen bist" },
      { en: "A kitchen at 1am that felt like a secret", de: "Eine Küche um 1 Uhr, die sich wie ein Geheimnis anfühlte" },
    ],
    2
  ),
  almost(
    "w-almost-yesterday",
    "warm",
    { en: "What I almost did yesterday", de: "Was ich gestern fast getan hätte" },
    { en: "Showed up without texting first", de: "Einfach aufgetaucht, ohne vorher zu schreiben" },
    [
      { en: "Started a fight about something small", de: "Einen Streit über etwas Kleines angefangen" },
      { en: "Bought you something pointless and perfect", de: "Dir etwas Sinnloses und Perfektes gekauft" },
      { en: "Left a voice note and panicked", de: "Eine Sprachnachricht hinterlassen und Panik bekommen" },
    ],
    1
  ),
  spectrum(
    "w-spec-chaos",
    "warm",
    { en: "What I want us to be tonight", de: "Was wir heute Nacht sein sollen" },
    { en: "Familiar chaos", de: "Vertrautes Chaos" },
    { en: "A new hiding place", de: "Ein neues Versteck" }
  ),
  want(
    "h-want-stranger",
    "hot",
    { en: "What I want from you right now", de: "Was ich jetzt von dir will" },
    { en: "Pretend you don't know me yet", de: "Tu so, als kenntest du mich noch nicht" },
    [
      { en: "Be a little mean, then ruin it by smiling", de: "Sei ein bisschen fies, und spoilere es mit einem Lächeln" },
      { en: "Tell me exactly where to put my hands", de: "Sag mir genau, wohin mit meinen Händen" },
      { en: "Make me wait one minute longer than I want", de: "Lass mich eine Minute länger warten, als ich will" },
    ],
    2
  ),
  almost(
    "h-almost-loud",
    "hot",
    { en: "The thought I would not say out loud", de: "Der Gedanke, den ich nicht laut sagen würde" },
    { en: "I want you to ruin my evening in the best way", de: "Ich will, dass du meinen Abend auf die beste Art ruinierst" },
    [
      { en: "I keep replaying this afternoon", de: "Ich spule diesen Nachmittag immer wieder ab" },
      { en: "I want your voice closer than the screen", de: "Ich will deine Stimme näher als den Bildschirm" },
      { en: "If you asked, I would already be gone", de: "Wenn du fragst, wäre ich schon weg" },
    ],
    0
  ),
  memory(
    "h-mem-pulse",
    "hot",
    { en: "The memory that still changes my pulse", de: "Die Erinnerung, die meinen Puls noch ändert" },
    { en: "The first time you didn't look away", de: "Das erste Mal, als du nicht weggeschaut hast" },
    [
      { en: "A doorway we both hesitated in", de: "Eine Tür, in der wir beide gezögert haben" },
      { en: "Your hand deciding something before you did", de: "Deine Hand, die etwas entschieden hat vor dir" },
      { en: "A laugh that turned into something else", de: "Ein Lachen, das zu etwas anderem wurde" },
    ],
    1
  ),
  spectrum(
    "h-spec-pace",
    "hot",
    { en: "The pace I want from you", de: "Das Tempo, das ich von dir will" },
    { en: "Slow torture", de: "Langsam quälen" },
    { en: "Right now", de: "Jetzt sofort" }
  ),
  want(
    "s-want-quiet",
    "soft",
    { en: "Pick the want that is actually mine", de: "Finde den Wunsch, der wirklich meiner ist" },
    { en: "Stay on the call even after we run out of words", de: "Bleib in der Leitung, auch wenn uns die Worte ausgehen" },
    [
      { en: "Send me the song you won't admit you like", de: "Schick mir den Song, den du nicht zugibst" },
      { en: "Remind me of a nickname I pretended to hate", de: "Erinner mich an einen Spitznamen, den ich gehasst habe (gelogen)" },
      { en: "Count to three and say something true", de: "Zähl bis drei und sag etwas Wahres" },
    ],
    0
  ),
  spectrum(
    "w-spec-distance",
    "warm",
    { en: "How close is too close tonight?", de: "Wie nah ist heute zu nah?" },
    { en: "Across the room is enough", de: "Gegenüber reicht" },
    { en: "No air between us", de: "Keine Luft dazwischen" }
  ),
];

const HEAT_RANK: Record<Heat, number> = { soft: 0, warm: 1, hot: 2 };

export function cardsForHeat(heat: Heat): FlimmerCard[] {
  return FLIMMER_DECK.filter((card) => HEAT_RANK[card.heat] <= HEAT_RANK[heat]);
}

export function getCard(id: string): FlimmerCard | undefined {
  return FLIMMER_DECK.find((card) => card.id === id);
}
