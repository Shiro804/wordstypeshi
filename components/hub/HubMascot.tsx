type HubMascotProps = {
  className?: string;
};

export default function HubMascot({ className = "w-28" }: HubMascotProps) {
  return (
    <svg
      className={`h-auto animate-duck-bob ${className}`}
      viewBox="0 0 320 320"
      role="img"
      aria-label="Bata, the BataGames duck"
      style={{ filter: "drop-shadow(0 10px 18px rgba(255, 216, 107, 0.18))" }}
    >
      <g>
        <g className="animate-duck-pop origin-center">
          <path
            d="M252 62c6 10 6 22 0 32c-10 6-22 6-32 0c-6-10-6-22 0-32c10-6 22-6 32 0z"
            fill="rgba(255,255,255,0.75)"
          />
        </g>
        <ellipse cx="160" cy="192" rx="118" ry="88" fill="#FFD86B" />
        <ellipse cx="160" cy="210" rx="68" ry="52" fill="#FFF3C9" />
        <circle cx="160" cy="120" r="72" fill="#FFD86B" />
        <g className="animate-duck-flap origin-[25%_55%]">
          <ellipse cx="86" cy="198" rx="44" ry="34" fill="rgba(0,0,0,0.06)" />
          <ellipse cx="92" cy="190" rx="48" ry="36" fill="#FFD86B" />
          <ellipse cx="105" cy="194" rx="28" ry="22" fill="#FFF3C9" />
        </g>
        <path
          d="M160 140 c26 0 44 10 44 24 c0 14-18 24-44 24 c-26 0-44-10-44-24 c0-14 18-24 44-24z"
          fill="#FF8B4A"
        />
        <circle cx="120" cy="158" r="10" fill="rgba(255,120,150,0.18)" />
        <circle cx="200" cy="158" r="10" fill="rgba(255,120,150,0.18)" />
        <g className="animate-duck-blink origin-center">
          <circle cx="136" cy="118" r="10" fill="#1E2430" />
          <circle cx="132" cy="114" r="3.2" fill="rgba(255,255,255,0.9)" />
        </g>
        <g className="animate-duck-blink origin-center">
          <circle cx="184" cy="118" r="10" fill="#1E2430" />
          <circle cx="180" cy="114" r="3.2" fill="rgba(255,255,255,0.9)" />
        </g>
      </g>
    </svg>
  );
}
