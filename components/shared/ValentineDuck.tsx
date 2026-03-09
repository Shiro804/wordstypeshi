"use client";

export type DuckMood = "normal" | "happy" | "grumpy";

interface ValentineDuckProps {
    mood?: DuckMood;
    size?: "sm" | "md" | "lg";
    className?: string;
}

/**
 * Valentine Duck component with different moods
 * - normal: Sweet duck with pink cheeks
 * - happy: Heart eyes and excited expression
 * - grumpy: Angry eyebrows and frown
 */
export default function ValentineDuck({
    mood = "normal",
    size = "lg",
    className = "",
}: ValentineDuckProps) {
    const sizeClasses = {
        sm: "w-24 h-auto",
        md: "w-36 h-auto",
        lg: "w-48 h-auto",
    };

    // Duck colors - Valentine theme
    const duckColor = "#FFD86B";
    const duckBellyColor = "#FFF3C9";
    const beakColor = "#FF8B4A";
    const cheekColor = "rgba(255, 120, 150, 0.35)"; // More pink for Valentine

    // Eye rendering based on mood
    const renderEyes = () => {
        if (mood === "happy") {
            // Heart eyes! 💕
            return (
                <>
                    {/* Left Heart Eye */}
                    <g className="animate-pulse">
                        <path
                            d="M136 108 C130 102 120 102 120 112 C120 122 136 132 136 132 C136 132 152 122 152 112 C152 102 142 102 136 108Z"
                            fill="#FF69B4"
                        />
                    </g>
                    {/* Right Heart Eye */}
                    <g className="animate-pulse">
                        <path
                            d="M184 108 C178 102 168 102 168 112 C168 122 184 132 184 132 C184 132 200 122 200 112 C200 102 190 102 184 108Z"
                            fill="#FF69B4"
                        />
                    </g>
                </>
            );
        } else if (mood === "grumpy") {
            // Angry eyes with eyebrows
            return (
                <>
                    {/* Angry eyebrows */}
                    <line x1="118" y1="95" x2="148" y2="105" stroke="#1E2430" strokeWidth="6" strokeLinecap="round" />
                    <line x1="202" y1="95" x2="172" y2="105" stroke="#1E2430" strokeWidth="6" strokeLinecap="round" />
                    {/* Squinting eyes */}
                    <ellipse cx="136" cy="120" rx="10" ry="6" fill="#1E2430" />
                    <ellipse cx="184" cy="120" rx="10" ry="6" fill="#1E2430" />
                    {/* Eye glints */}
                    <circle cx="132" cy="118" r="2" fill="rgba(255,255,255,0.7)" />
                    <circle cx="180" cy="118" r="2" fill="rgba(255,255,255,0.7)" />
                </>
            );
        } else {
            // Normal cute eyes with blink
            return (
                <>
                    <g className="animate-duck-blink origin-center">
                        <circle cx="136" cy="118" r="12" fill="#1E2430" />
                        <circle cx="131" cy="113" r="4" fill="rgba(255,255,255,0.9)" />
                    </g>
                    <g className="animate-duck-blink origin-center">
                        <circle cx="184" cy="118" r="12" fill="#1E2430" />
                        <circle cx="179" cy="113" r="4" fill="rgba(255,255,255,0.9)" />
                    </g>
                </>
            );
        }
    };

    // Beak based on mood
    const renderBeak = () => {
        if (mood === "grumpy") {
            // Frowny beak
            return (
                <path
                    d="M160 145 c26 0 44 8 44 20 c0 12-18 16-44 16 c-26 0-44-4-44-16 c0-12 18-20 44-20z"
                    fill={beakColor}
                />
            );
        } else if (mood === "happy") {
            // Happy open beak
            return (
                <>
                    <path
                        d="M160 138 c30 0 48 12 48 28 c0 16-18 26-48 26 c-30 0-48-10-48-26 c0-16 18-28 48-28z"
                        fill={beakColor}
                    />
                    <ellipse cx="160" cy="168" rx="20" ry="8" fill="#FF6B35" />
                </>
            );
        } else {
            // Normal cute beak
            return (
                <path
                    d="M160 140 c26 0 44 10 44 24 c0 14-18 24-44 24 c-26 0-44-10-44-24 c0-14 18-24 44-24z"
                    fill={beakColor}
                />
            );
        }
    };

    // Floating hearts for happy mood
    const renderFloatingHearts = () => {
        if (mood !== "happy") return null;
        return (
            <g className="opacity-80">
                <path
                    className="animate-float-heart-1"
                    d="M260 70 C256 64 248 64 248 72 C248 80 260 88 260 88 C260 88 272 80 272 72 C272 64 264 64 260 70Z"
                    fill="#FF69B4"
                />
                <path
                    className="animate-float-heart-2"
                    d="M75 90 C72 86 66 86 66 92 C66 98 75 104 75 104 C75 104 84 98 84 92 C84 86 78 86 75 90Z"
                    fill="#FF1493"
                />
                <path
                    className="animate-float-heart-3"
                    d="M280 150 C277 145 270 145 270 152 C270 159 280 166 280 166 C280 166 290 159 290 152 C290 145 283 145 280 150Z"
                    fill="#FFB6C1"
                />
            </g>
        );
    };

    const animationClass = mood === "happy"
        ? "animate-bounce"
        : mood === "grumpy"
            ? "animate-shake-grumpy"
            : "animate-duck-bob";

    return (
        <svg
            className={`${sizeClasses[size]} ${animationClass} ${className}`}
            viewBox="0 0 320 320"
            role="img"
            aria-label={`Valentine duck - ${mood} mood`}
            style={{ filter: 'drop-shadow(0 10px 0 rgba(0,0,0,0.1))' }}
        >
            <g>
                {/* Floating hearts (happy mood only) */}
                {renderFloatingHearts()}

                {/* Sparkle */}
                <g className="animate-duck-pop origin-center">
                    <path
                        d="M252 62c6 10 6 22 0 32c-10 6-22 6-32 0c-6-10-6-22 0-32c10-6 22-6 32 0z"
                        fill={mood === "happy" ? "#FFB6C1" : "rgba(255,255,255,0.75)"}
                    />
                </g>

                {/* Body */}
                <ellipse cx="160" cy="192" rx="118" ry="88" fill={duckColor} />
                {/* Belly */}
                <ellipse cx="160" cy="210" rx="68" ry="52" fill={duckBellyColor} />

                {/* Head */}
                <circle cx="160" cy="120" r="72" fill={duckColor} />

                {/* Wing */}
                <g className={mood === "happy" ? "animate-wing-wave origin-[25%_55%]" : "animate-duck-flap origin-[25%_55%]"}>
                    <ellipse cx="86" cy="198" rx="44" ry="34" fill="rgba(0,0,0,0.06)" />
                    <ellipse cx="92" cy="190" rx="48" ry="36" fill={duckColor} />
                    <ellipse cx="105" cy="194" rx="28" ry="22" fill={duckBellyColor} />
                </g>

                {/* Beak */}
                {renderBeak()}

                {/* Extra pink cheeks for Valentine */}
                <circle cx="115" cy="158" r="14" fill={cheekColor} />
                <circle cx="205" cy="158" r="14" fill={cheekColor} />

                {/* Eyes */}
                {renderEyes()}

                {/* Little bow/ribbon for valentine look */}
                <g>
                    <ellipse cx="100" cy="70" rx="12" ry="8" fill="#FF69B4" transform="rotate(-20 100 70)" />
                    <ellipse cx="85" cy="65" rx="12" ry="8" fill="#FF69B4" transform="rotate(20 85 65)" />
                    <circle cx="92" cy="72" r="6" fill="#FF1493" />
                </g>
            </g>
        </svg>
    );
}
