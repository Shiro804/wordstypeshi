"use client";

import { useState, useEffect, useCallback } from "react";
import ValentineDuck, { type DuckMood } from "./ValentineDuck";

interface ValentineModalProps {
    open: boolean;
    onClose: () => void;
}

// Funny/angry responses when clicking "No"
const NO_RESPONSES = [
    "NAAAAM?!?!?! 😠",
    "dafuq",
    "nö",
    "🔫🔫🔫",
    "Ich fick dich",
    "HAIKEL",
];

// Confetti piece component
function ConfettiPiece({ delay, left }: { delay: number; left: number }) {
    const colors = ["#FF69B4", "#FF1493", "#FFB6C1", "#FF6B6B", "#FFD700", "#FF85A2"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 8 + Math.random() * 8;
    const rotation = Math.random() * 360;

    return (
        <div
            className="absolute animate-confetti pointer-events-none"
            style={{
                left: `${left}%`,
                top: "-20px",
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                transform: `rotate(${rotation}deg)`,
                animationDelay: `${delay}s`,
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            }}
        />
    );
}

// Heart particle for celebration
function HeartParticle({ delay, left }: { delay: number; left: number }) {
    const size = 16 + Math.random() * 16;

    return (
        <div
            className="absolute animate-heart-fall pointer-events-none text-pink-500"
            style={{
                left: `${left}%`,
                top: "-30px",
                fontSize: `${size}px`,
                animationDelay: `${delay}s`,
            }}
        >
            ❤️
        </div>
    );
}

export default function ValentineModal({ open, onClose }: ValentineModalProps) {
    const [duckMood, setDuckMood] = useState<DuckMood>("normal");
    const [noClickCount, setNoClickCount] = useState(0);
    const [toast, setToast] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [noButtonPosition, setNoButtonPosition] = useState({ x: 0, y: 0 });
    const [isRunaway, setIsRunaway] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setDuckMood("normal");
            setNoClickCount(0);
            setToast(null);
            setShowCelebration(false);
            setAccepted(false);
            setNoButtonPosition({ x: 0, y: 0 });
            setIsRunaway(false);
        }
    }, [open]);

    // Handle "No" button click
    const handleNo = useCallback(() => {
        // Make duck grumpy
        setDuckMood("grumpy");

        // Show random response
        const response = NO_RESPONSES[noClickCount % NO_RESPONSES.length];
        setToast(response);
        setNoClickCount(prev => prev + 1);

        // Move button to random position after 3 clicks
        if (noClickCount >= 2) {
            const randomX = (Math.random() - 0.5) * 150;
            const randomY = (Math.random() - 0.5) * 100;
            setNoButtonPosition({ x: randomX, y: randomY });
            setIsRunaway(true);
        }

        // Reset duck mood after a moment
        setTimeout(() => {
            if (!accepted) {
                setDuckMood("normal");
            }
        }, 1500);

        // Clear toast
        setTimeout(() => {
            setToast(null);
        }, 1000);
    }, [noClickCount, accepted]);

    // Handle "No" button hover (runaway effect after many clicks)
    const handleNoHover = useCallback(() => {
        if (noClickCount >= 5) {
            const randomX = (Math.random() - 0.5) * 200;
            const randomY = (Math.random() - 0.5) * 150;
            setNoButtonPosition({ x: randomX, y: randomY });
        }
    }, [noClickCount]);

    // Handle "Yes" button click
    const handleYes = useCallback(() => {
        setAccepted(true);
        setDuckMood("happy");
        setShowCelebration(true);
        setToast(null);
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={accepted ? onClose : undefined}
            />

            {/* Confetti and Hearts */}
            {showCelebration && (
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-50">
                    {/* Confetti pieces */}
                    {Array.from({ length: 50 }).map((_, i) => (
                        <ConfettiPiece
                            key={`confetti-${i}`}
                            delay={Math.random() * 2}
                            left={Math.random() * 100}
                        />
                    ))}
                    {/* Heart particles */}
                    {Array.from({ length: 20 }).map((_, i) => (
                        <HeartParticle
                            key={`heart-${i}`}
                            delay={Math.random() * 3}
                            left={Math.random() * 100}
                        />
                    ))}
                </div>
            )}

            {/* Modal Content */}
            <div
                className={`
                    relative z-10 w-full max-w-md mx-auto
                    bg-gradient-to-b from-pink-950/90 to-rose-950/90
                    backdrop-blur-xl rounded-3xl p-6 md:p-8
                    border border-pink-500/30
                    ${accepted ? 'animate-celebration' : 'animate-valentine-glow'}
                `}
            >
                {/* Close button (only after accepting) */}
                {accepted && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-pink-300 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}

                {!accepted ? (
                    <>
                        {/* Question Part 1 */}
                        <h2
                            className="text-center text-2xl md:text-3xl font-bold mb-4"
                            style={{
                                fontFamily: "'Georgia', 'Times New Roman', serif",
                                background: "linear-gradient(135deg, #FFB6C1, #FF69B4, #FF1493)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                textShadow: "0 2px 20px rgba(255, 105, 180, 0.5)",
                            }}
                        >
                            Do you want to be...
                        </h2>

                        {/* Duck */}
                        <div className="flex justify-center my-6">
                            <ValentineDuck mood={duckMood} size="lg" />
                        </div>

                        {/* Question Part 2 */}
                        <h2
                            className="text-center text-2xl md:text-3xl font-bold mb-6"
                            style={{
                                fontFamily: "'Georgia', 'Times New Roman', serif",
                                background: "linear-gradient(135deg, #FF1493, #FF69B4, #FFB6C1)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                textShadow: "0 2px 20px rgba(255, 105, 180, 0.5)",
                            }}
                        >
                            ...my Valentine? 💕
                        </h2>

                        {/* No click counter */}
                        {noClickCount > 0 && (
                            <p className="text-center text-pink-300/60 text-sm mb-4">
                                Du hast {noClickCount}x &quot;Nein&quot; gedrückt... aber die Antwort ist trotzdem Ja! 💕
                            </p>
                        )}

                        {/* Buttons */}
                        <div className="flex justify-center items-center gap-4 min-h-[52px]">
                            {/* Yes Button */}
                            <button
                                onClick={handleYes}
                                className="
                                    px-8 py-3 rounded-xl font-bold text-lg
                                    bg-gradient-to-r from-pink-500 to-rose-500
                                    hover:from-pink-400 hover:to-rose-400
                                    text-white shadow-lg shadow-pink-500/30
                                    hover:shadow-pink-500/50 hover:scale-105
                                    transition-all duration-300
                                    animate-wiggle
                                    shrink-0
                                "
                            >
                                Ja ❤️
                            </button>

                            {/* No Button (Troll) - uses margin to offset without breaking layout */}
                            <button
                                onClick={handleNo}
                                onMouseEnter={handleNoHover}
                                className="
                                    px-8 py-3 rounded-xl font-bold text-lg
                                    bg-zinc-700/50 hover:bg-zinc-600/50
                                    text-zinc-300 border border-zinc-600/50
                                    transition-all duration-200
                                    shrink-0
                                "
                                style={{
                                    marginLeft: `${noButtonPosition.x}px`,
                                    marginTop: `${noButtonPosition.y}px`,
                                    transition: isRunaway ? 'margin 0.2s ease-out' : 'none',
                                }}
                            >
                                Nein
                            </button>
                        </div>

                        {/* Toast */}
                        {toast && (
                            <div
                                className="
                                    mt-6 p-3 rounded-xl text-center
                                    bg-pink-500/20 border border-pink-500/30
                                    text-pink-200 font-medium
                                    animate-bounce
                                "
                            >
                                {toast}
                            </div>
                        )}
                    </>
                ) : (
                    /* Celebration View */
                    <div className="text-center py-4">
                        <h2
                            className="text-3xl md:text-4xl font-bold mb-6"
                            style={{
                                fontFamily: "'Georgia', 'Times New Roman', serif",
                                background: "linear-gradient(135deg, #FFD700, #FF69B4, #FF1493)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            Yay! 🎉💕
                        </h2>

                        <div className="flex justify-center">
                            <ValentineDuck mood="happy" size="lg" />
                        </div>

                        <p
                            className="mt-6 text-xl text-pink-200"
                            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                        >
                            Ich liebe dich! 💖🦆
                        </p>

                        <p className="mt-2 text-pink-300/70 text-sm">
                            Happy Valentine&apos;s Day 2026 💕
                        </p>

                        <button
                            onClick={onClose}
                            className="
                                mt-6 px-6 py-2 rounded-xl
                                bg-gradient-to-r from-pink-500 to-rose-500
                                text-white font-medium
                                hover:from-pink-400 hover:to-rose-400
                                transition-all
                            "
                        >
                            Schließen 💕
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
