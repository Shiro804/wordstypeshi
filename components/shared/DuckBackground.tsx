"use client";

export interface DuckBackgroundProps {
    /** Text displayed above the duck */
    title?: string;
    /** Background color (default: #7d8c98) */
    bgColor?: string;
    /** Duck body color (default: #FFD86B) */
    duckColor?: string;
    /** Duck belly/light part color (default: #FFF3C9) */
    duckBellyColor?: string;
    /** Beak color (default: #FF8B4A) */
    beakColor?: string;
    /** Eye color (default: #1E2430) */
    eyeColor?: string;
    /** Position of duck: 'center' (default) or 'top' */
    position?: 'center' | 'top';
}

/**
 * Animated duck background component - replaces iframe-based HTML backgrounds
 * for instant loading without network requests.
 * CSS animations are defined in globals.css
 */
export default function DuckBackground({
    title = "BataGames",
    bgColor = "#7d8c98",
    duckColor = "#FFD86B",
    duckBellyColor = "#FFF3C9",
    beakColor = "#FF8B4A",
    eyeColor = "#1E2430",
    position = "center",
}: DuckBackgroundProps) {
    const positionClasses = position === 'top'
        ? 'items-start pt-16'
        : 'place-items-center';

    return (
        <div
            className={`fixed inset-0 grid ${positionClasses} pointer-events-none transition-colors duration-500`}
            style={{ backgroundColor: bgColor }}
        >
            <div className="flex flex-col items-center justify-center gap-[clamp(6px,1.5vw,14px)]">
                {/* Title */}
                <div
                    className="font-black text-[clamp(22px,4vw,56px)] text-[#1E2430] text-center select-none"
                    style={{
                        fontFamily: 'ui-rounded, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
                        letterSpacing: '0.02em',
                        textShadow: '0 6px 0 rgba(0,0,0,0.06)'
                    }}
                >
                    {title}
                </div>

                {/* Animated Duck SVG */}
                <svg
                    className="w-[clamp(100px,18vw,260px)] h-auto animate-duck-bob"
                    viewBox="0 0 320 320"
                    role="img"
                    aria-label="Cute duck mascot"
                    style={{ filter: 'drop-shadow(0 10px 0 rgba(0,0,0,0.06))' }}
                >
                    <g>
                        {/* Sparkle */}
                        <g className="animate-duck-pop origin-center">
                            <path
                                d="M252 62c6 10 6 22 0 32c-10 6-22 6-32 0c-6-10-6-22 0-32c10-6 22-6 32 0z"
                                fill="rgba(255,255,255,0.75)"
                            />
                        </g>

                        {/* Body */}
                        <ellipse cx="160" cy="192" rx="118" ry="88" fill={duckColor} />
                        {/* Belly */}
                        <ellipse cx="160" cy="210" rx="68" ry="52" fill={duckBellyColor} />

                        {/* Head */}
                        <circle cx="160" cy="120" r="72" fill={duckColor} />

                        {/* Wing */}
                        <g className="animate-duck-flap origin-[25%_55%]">
                            <ellipse cx="86" cy="198" rx="44" ry="34" fill="rgba(0,0,0,0.06)" />
                            <ellipse cx="92" cy="190" rx="48" ry="36" fill={duckColor} />
                            <ellipse cx="105" cy="194" rx="28" ry="22" fill={duckBellyColor} />
                        </g>

                        {/* Beak */}
                        <path
                            d="M160 140 c26 0 44 10 44 24 c0 14-18 24-44 24 c-26 0-44-10-44-24 c0-14 18-24 44-24z"
                            fill={beakColor}
                        />

                        {/* Cheeks */}
                        <circle cx="120" cy="158" r="10" fill="rgba(255,120,150,0.18)" />
                        <circle cx="200" cy="158" r="10" fill="rgba(255,120,150,0.18)" />

                        {/* Left Eye */}
                        <g className="animate-duck-blink origin-center">
                            <circle cx="136" cy="118" r="10" fill={eyeColor} />
                            <circle cx="132" cy="114" r="3.2" fill="rgba(255,255,255,0.9)" />
                        </g>

                        {/* Right Eye */}
                        <g className="animate-duck-blink origin-center">
                            <circle cx="184" cy="118" r="10" fill={eyeColor} />
                            <circle cx="180" cy="114" r="3.2" fill="rgba(255,255,255,0.9)" />
                        </g>
                    </g>
                </svg>
            </div>
        </div>
    );
}
