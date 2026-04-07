"use client";

import Modal from "./Modal";

type GameId = "wordle" | "mastermind" | "wordsearch" | "batasblast" | "batascolors" | "bataspairs" | "batasmine" | "batasflow";

interface HowToPlayProps {
    gameId: GameId;
    isOpen: boolean;
    onClose: () => void;
}


// Visual components for instructions
const WordleTile = ({ letter, status }: { letter: string; status: "correct" | "present" | "absent" }) => (
    <div className={`
        inline-flex h-10 w-10 items-center justify-center rounded border-2 text-xl font-bold uppercase
        ${status === "correct" ? "bg-[color:var(--correct-bg)] border-[color:var(--correct-border)]" : ""}
        ${status === "present" ? "bg-[color:var(--present-bg)] border-[color:var(--present-border)]" : ""}
        ${status === "absent" ? "bg-[color:var(--absent-bg)] border-[color:var(--absent-border)]" : ""}
    `}>
        {letter}
    </div>
);

const MastermindPeg = ({ color }: { color: "black" | "white" }) => (
    <div className={`
        h-4 w-4 rounded-full border border-white/20 shadow-sm
        ${color === "black" ? "bg-black" : "bg-white"}
    `} />
);

const WordSearchCell = ({ letter, status }: { letter: string; status: "selected" | "found" | "default" }) => (
    <div className={`
        inline-flex h-9 w-9 items-center justify-center rounded-md border text-lg font-bold uppercase
        ${status === "selected" ? "bg-blue-500/20 border-blue-500 text-blue-200" : ""}
        ${status === "found" ? "bg-[color:var(--correct-bg)] border-[color:var(--correct-border)]" : ""}
        ${status === "default" ? "bg-[color:var(--surface)] border-[color:var(--border)] text-[color:var(--muted)]" : ""}
    `}>
        {letter}
    </div>
);

const BatasBlastBlock = ({ status }: { status: "filled" | "empty" | "preview" }) => (
    <div className={`
        inline-flex h-8 w-8 items-center justify-center rounded-md border-2
        ${status === "filled" ? "bg-gradient-to-br from-amber-400 to-orange-500 border-orange-600 shadow-md" : ""}
        ${status === "empty" ? "bg-zinc-800/50 border-zinc-700" : ""}
        ${status === "preview" ? "bg-gradient-to-br from-amber-400/40 to-orange-500/40 border-orange-400/50 border-dashed" : ""}
    `} />
);

// Mini pie chart for HowToPlay visualization
const MiniPieChart = ({ segments }: { segments: Array<{ color: string; percentage: number }> }) => {
    const size = 48;
    const center = size / 2;
    const radius = size / 2 - 2;

    // Build pie slices
    let currentAngle = -90; // Start at top
    const slices = segments.map((seg, i) => {
        const angle = (seg.percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        // SVG arc path
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = center + radius * Math.cos(startRad);
        const y1 = center + radius * Math.sin(startRad);
        const x2 = center + radius * Math.cos(endRad);
        const y2 = center + radius * Math.sin(endRad);
        const largeArc = angle > 180 ? 1 : 0;

        const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

        return <path key={i} d={d} fill={seg.color} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />;
    });

    return (
        <svg width={size} height={size} className="drop-shadow-md">
            {slices}
            {/* Center hole for donut effect */}
            <circle cx={center} cy={center} r={radius * 0.3} fill="var(--surface)" />
        </svg>
    );
};

const GAME_INSTRUCTIONS: Record<GameId, {
    title: string;
    sections: Array<{
        heading: string;
        content: string;
        examples?: Array<{ label: React.ReactNode; description: string }>;
    }>;
}> = {
    wordle: {
        title: "How to Play Wordle",
        sections: [
            {
                heading: "Objective",
                content: "Guess the 5-letter word in 6 tries or less.",
            },
            {
                heading: "How to Play",
                content: "Type your guess and press Enter. After each guess, the tiles will change color to show how close you are:",
                examples: [
                    {
                        label: <WordleTile letter="W" status="correct" />,
                        description: "Letter is correct and in the right position"
                    },
                    {
                        label: <WordleTile letter="I" status="present" />,
                        description: "Letter is in the word but wrong position"
                    },
                    {
                        label: <WordleTile letter="N" status="absent" />,
                        description: "Letter is not in the word"
                    },
                ],
            },
            {
                heading: "Tips",
                content: "Start with common vowels and consonants. Use the feedback to eliminate letters and narrow down possibilities.",
            },
            {
                heading: "Note",
                content: "🇬🇧 Currently only English words are available. German words coming soon!",
            },
        ],
    },
    mastermind: {
        title: "How to Play Mastermind",
        sections: [
            {
                heading: "Objective",
                content: "Crack the secret color code by deducing the correct sequence.",
            },
            {
                heading: "How to Play",
                content: "Select colors to fill each slot, then submit your guess. You'll receive feedback:",
                examples: [
                    {
                        label: <MastermindPeg color="black" />,
                        description: "Correct color in correct position"
                    },
                    {
                        label: <MastermindPeg color="white" />,
                        description: "Correct color in wrong position"
                    },
                ],
            },
            {
                heading: "Strategy",
                content: "Use logical deduction. Each guess gives you information to narrow down the possibilities. Start with diverse colors to gather maximum information.",
            },
        ],
    },
    wordsearch: {
        title: "How to Play BatasSearch",
        sections: [
            {
                heading: "Objective",
                content: "Find all hidden words in the letter grid as quickly as possible.",
            },
            {
                heading: "How to Play",
                content: "Words can be hidden horizontally, vertically, or diagonally. Click and drag to select a word. Found words will be highlighted.",
            },
            {
                heading: "Visuals",
                content: "Drag to select words. Correctly found words turn green.",
                examples: [
                    {
                        label: <WordSearchCell letter="S" status="selected" />,
                        description: "Selection (Dragging)"
                    },
                    {
                        label: <WordSearchCell letter="F" status="found" />,
                        description: "Found Word"
                    },
                    {
                        label: <WordSearchCell letter="A" status="default" />,
                        description: "Standard Grid Letter"
                    }
                ]
            },
            {
                heading: "Tips",
                content: "Scan systematically. Look for uncommon letters first (Q, X, Z). Words can read forwards or backwards.",
            },
            {
                heading: "Note",
                content: "🇬🇧 Currently only English words are available. German words coming soon!",
            },
        ],
    },
    batasblast: {
        title: "How to Play BatasBlast",
        sections: [
            {
                heading: "Objective",
                content: "Place blocks on an 8×8 grid. Clear complete rows and columns to score as many points as possible!",
            },
            {
                heading: "How to Play",
                content: "Tap a piece from the tray, then tap or drag to the board to place it. You can also drag pieces directly. Place all 3 pieces to get a new set. Game ends when no pieces fit.",
                examples: [
                    {
                        label: <BatasBlastBlock status="filled" />,
                        description: "Placed block on the grid"
                    },
                    {
                        label: <BatasBlastBlock status="preview" />,
                        description: "Preview (valid placement)"
                    },
                    {
                        label: <BatasBlastBlock status="empty" />,
                        description: "Empty grid cell"
                    },
                ],
            },
            {
                heading: "Scoring",
                content: "Your score is shown in the center. Earn points for:",
                examples: [
                    {
                        label: <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">42</span>,
                        description: "+1 point per block placed"
                    },
                    {
                        label: <span className="text-lg font-bold text-emerald-400">+10</span>,
                        description: "+10 points per line cleared"
                    },
                    {
                        label: <span className="text-lg font-bold text-purple-400">+5</span>,
                        description: "+5 bonus per extra line in multi-clear"
                    },
                ],
            },
            {
                heading: "Bonuses",
                content: "Two special indicators appear next to your score when active:",
                examples: [
                    {
                        label: (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400">
                                <span className="text-lg">🔥</span>
                                <span className="font-bold">3x</span>
                            </div>
                        ),
                        description: "Combo: Clears on consecutive moves. Multiplies line points!"
                    },
                    {
                        label: (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400">
                                <span className="text-lg">⚡</span>
                                <span className="font-bold">2</span>
                            </div>
                        ),
                        description: "Round Streak: Consecutive rounds with at least one clear"
                    },
                ],
            },
            {
                heading: "Tips",
                content: "Plan ahead! Leave space for larger pieces. Clear multiple lines at once for bigger combos. Keep your combo alive by clearing at least one line each move.",
            },
        ],
    },
    batascolors: {
        title: "How to Play BatasColors",
        sections: [
            {
                heading: "Objective",
                content: "Mix colors in a pie chart to match the target color. Each segment has a percentage weight – blend the right colors to hit 100% accuracy!",
                examples: [
                    {
                        label: (
                            <div className="flex items-center gap-3">
                                <MiniPieChart segments={[
                                    { color: "#ef4444", percentage: 40 },
                                    { color: "#3b82f6", percentage: 60 },
                                ]} />
                                <span className="text-lg text-white/60">→</span>
                                <div className="w-8 h-8 rounded-full bg-purple-500 ring-2 ring-purple-400 shadow-lg" />
                            </div>
                        ),
                        description: "Red (40%) + Blue (60%) = Purple target"
                    },
                ],
            },
            {
                heading: "The Pie Chart",
                content: "Click a segment to select it, then pick a color from the palette. Each segment's percentage shows how much it contributes to the mix.",
                examples: [
                    {
                        label: (
                            <div className="flex items-center gap-1">
                                <div className="w-6 h-6 rounded-full bg-zinc-700 border-2 border-dashed border-zinc-500" />
                                <span className="text-xs text-zinc-400">40%</span>
                            </div>
                        ),
                        description: "Empty segment – click to select"
                    },
                    {
                        label: (
                            <div className="flex items-center gap-1">
                                <div className="w-6 h-6 rounded-full bg-rose-500 ring-2 ring-rose-400 ring-offset-2 ring-offset-zinc-900" />
                                <span className="text-xs text-rose-300">40%</span>
                            </div>
                        ),
                        description: "Selected segment – pick a color"
                    },
                    {
                        label: (
                            <div className="flex items-center gap-1">
                                <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white/30" />
                                <span className="text-xs text-blue-300">60%</span>
                            </div>
                        ),
                        description: "Filled segment – click again to clear"
                    },
                ],
            },
            {
                heading: "Color Palette",
                content: "Pick colors from the palette to fill your segments. Tap a color to apply it to the selected segment.",
                examples: [
                    {
                        label: (
                            <div className="flex gap-1">
                                {["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"].map((c, i) => (
                                    <div key={i} className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        ),
                        description: "Available colors"
                    },
                ],
            },
            {
                heading: "Mixing & Feedback",
                content: "Once all segments are filled, press 'Mix' to blend your colors. You'll see your accuracy:",
                examples: [
                    {
                        label: <span className="text-2xl font-black text-emerald-400">100%</span>,
                        description: "Perfect match – You win! 🎯"
                    },
                    {
                        label: <span className="text-2xl font-black text-yellow-400">79%</span>,
                        description: "Close – Adjust your colors"
                    },
                    {
                        label: <span className="text-2xl font-black text-rose-400">45%</span>,
                        description: "Far off – Try different colors"
                    },
                ],
            },
            {
                heading: "Attempt History",
                content: "Your previous attempts appear in a compact bar showing the colors you tried, the result, and the accuracy:",
                examples: [
                    {
                        label: (
                            <div className="flex items-center gap-2 py-1 px-2 rounded-full bg-black/30 border border-white/10">
                                <div className="flex -space-x-0.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-black/30" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-black/30" />
                                </div>
                                <span className="text-[8px] text-white/40">→</span>
                                <div className="relative flex items-center justify-center w-5 h-5 rounded-full ring-1 ring-yellow-400 bg-purple-500">
                                    <span className="text-[8px] font-black text-white drop-shadow-sm">79</span>
                                </div>
                            </div>
                        ),
                        description: "Red + Blue → Purple (79% match)"
                    },
                ],
            },
            {
                heading: "Difficulty Levels",
                content: "",
                examples: [
                    { label: <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">EASY</span>, description: "2 segments" },
                    { label: <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-xs font-bold">MEDIUM</span>, description: "3 segments" },
                    { label: <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-bold">HARD</span>, description: "4 segments" },
                ],
            },
            {
                heading: "Tips",
                content: "Every puzzle has a guaranteed 100% solution! Larger segments influence the mix more. Click a filled segment twice to clear it.",
            },
        ],
    },
    batasmine: {
        title: "How to Play BatasMine",
        sections: [
            {
                heading: "Objective",
                content: "Reveal all safe cells on the grid without hitting any mines. Use logic and the numbers to deduce where mines are hidden.",
            },
            {
                heading: "How to Play",
                content: "Tap a cell to reveal it. Numbers show how many of the 8 surrounding cells contain mines. Empty cells (0 mines nearby) auto-expand. Right-click or long-press to flag suspected mines.",
                examples: [
                    {
                        label: <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 bg-zinc-700/50 border-zinc-600 text-sm font-bold text-blue-400">1</span>,
                        description: "1 mine in adjacent cells"
                    },
                    {
                        label: <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 bg-zinc-700/50 border-zinc-600 text-sm font-bold text-red-400">3</span>,
                        description: "3 mines in adjacent cells"
                    },
                    {
                        label: <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 bg-amber-500/10 border-amber-500/40 text-sm">🚩</span>,
                        description: "Flagged cell (suspected mine)"
                    },
                ],
            },
            {
                heading: "Difficulty Levels",
                content: "",
                examples: [
                    { label: <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">EASY</span>, description: "8×8 grid, 10 mines" },
                    { label: <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-xs font-bold">MEDIUM</span>, description: "12×12 grid, 30 mines" },
                    { label: <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-bold">HARD</span>, description: "16×16 grid, 60 mines" },
                ],
            },
            {
                heading: "Tips",
                content: "The first click is always safe! Use the flag button or long-press to mark mines. Count carefully – the numbers are your best clue.",
            },
        ],
    },
    batasflow: {
        title: "How to Play BatasFlow",
        sections: [
            {
                heading: "Objective",
                content: "Connect pairs of colored dots by drawing paths. Fill the entire grid to win!",
            },
            {
                heading: "How to Play",
                content: "Tap a colored dot to start drawing a path. Drag to adjacent cells to extend the path toward the matching dot. Release to finish. Paths cannot cross or overlap.",
                examples: [
                    {
                        label: <div className="w-8 h-8 rounded-full bg-red-500 shadow-lg shadow-red-500/40" />,
                        description: "Colored dot – tap to start a path"
                    },
                    {
                        label: <div className="w-8 h-8 rounded-md bg-blue-500/80 animate-pulse" />,
                        description: "Active path – currently drawing"
                    },
                    {
                        label: <div className="w-8 h-8 rounded-md bg-green-500" />,
                        description: "Completed path – flow connected"
                    },
                ],
            },
            {
                heading: "Tap to Clear",
                content: "Tap on any existing path cell to clear that flow and try a different route.",
            },
            {
                heading: "Difficulty Levels",
                content: "",
                examples: [
                    { label: <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">EASY</span>, description: "6×6 grid, 5 flows" },
                    { label: <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-xs font-bold">MEDIUM</span>, description: "8×8 grid, 7 flows" },
                    { label: <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-bold">HARD</span>, description: "10×10 grid, 9 flows" },
                ],
            },
            {
                heading: "Tips",
                content: "Start with flows whose dots are close together or at the edges. Every cell must be filled – no empty spaces allowed!",
            },
        ],
    },
    bataspairs: {
        title: "How to Play BatasPairs",
        sections: [
            {
                heading: "Objective",
                content: "Find all matching pairs of cards by flipping them two at a time. Match all pairs to win!",
            },
            {
                heading: "How to Play",
                content: "Tap a card to flip it and reveal the icon. Then tap another card. If both icons match, the pair stays revealed. If not, both cards flip back after a short delay.",
            },
            {
                heading: "Difficulty Levels",
                content: "",
                examples: [
                    { label: <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">EASY</span>, description: "4×3 grid (6 pairs)" },
                    { label: <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-xs font-bold">MEDIUM</span>, description: "4×4 grid (8 pairs)" },
                    { label: <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-bold">HARD</span>, description: "5×4 grid (10 pairs)" },
                ],
            },
            {
                heading: "Scoring",
                content: "Score is based on speed and accuracy. Fewer mismatches and faster completion mean higher scores!",
            },
            {
                heading: "Tips",
                content: "Try to remember card positions. Focus on a few cards at a time rather than randomly flipping. Build a mental map of what you've seen.",
            },
        ],
    },
};

export default function HowToPlay({ gameId, isOpen, onClose }: HowToPlayProps) {
    const instructions = GAME_INSTRUCTIONS[gameId];

    return (
        <Modal open={isOpen} onClose={onClose} title={instructions.title}>
            <div className="space-y-6">
                {instructions.sections.map((section, idx) => (
                    <div key={idx}>
                        <h3 className="text-lg font-semibold text-[color:var(--fg)] mb-2">
                            {section.heading}
                        </h3>
                        <p className="text-[color:var(--muted)] leading-relaxed mb-3">
                            {section.content}
                        </p>
                        {section.examples && (
                            <div className="space-y-3 mt-4 bg-[color:var(--surface)] p-4 rounded-xl border border-[color:var(--border)]">
                                {section.examples.map((example, exIdx) => (
                                    <div key={exIdx} className="flex items-center gap-4">
                                        <div className="flex-shrink-0">
                                            {example.label}
                                        </div>
                                        <span className="text-sm font-medium text-[color:var(--fg)]">
                                            {example.description}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}


                <div className="pt-4 border-t border-[color:var(--border)]">
                    <p className="text-sm text-[color:var(--muted)] text-center">
                        Good luck! 🎮
                    </p>
                </div>
            </div>
        </Modal>
    );
}
