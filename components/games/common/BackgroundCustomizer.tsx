"use client";

import { useState, useRef } from "react";
import type { GamePreferences } from "@/lib/storage/preferences-storage";
import { createClient } from "@/lib/supabase/client";

type Props = {
    preferences: GamePreferences;
    onChange: (prefs: GamePreferences) => void;
    // Optional: game context for image upload path
    gameId?: string;
    userId?: string | null;
    onInteractionStart?: () => void;
    onInteractionEnd?: () => void;
};

// Preset colors
const PRESETS = [
    "#7d8c98", // Default Grey
    "#0ea5e9", // Sky Blue
    "#10b981", // Emerald
    "#8b5cf6", // Violet
    "#f43f5e", // Rose
    "#f59e0b", // Amber
    "#09090b", // Dark
];

export default function BackgroundCustomizer({ preferences, onChange, gameId = "global", onInteractionStart, onInteractionEnd }: Props) {
    const currentBg = preferences.backgroundColor || "#7d8c98";
    const currentDuck = preferences.duckColor || "#FFD86B";
    const currentImage = preferences.backgroundImage;

    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (key: keyof GamePreferences, value: string | null) => {
        onChange({ ...preferences, [key]: value });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            // Check auth for remote upload vs local
            // For now, assuming we use the same util as before, but mapped to new prefs
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            let url: string;
            if (user) {
                const { uploadRemoteBackground } = await import("@/lib/remote-backgrounds");
                url = await uploadRemoteBackground(file, gameId);
            } else {
                const { setCustomBackground } = await import("@/lib/storage/background-storage");
                url = await setCustomBackground(file, gameId);
            }

            handleChange("backgroundImage", url);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    const clearImage = async () => {
        handleChange("backgroundImage", null);
        // Optional: cleanup remote file? For now just detaching it is fine.
    };

    return (
        <div className="space-y-6">
            {/* 1. Background Image */}
            <div>
                <label className="text-xs uppercase tracking-wide text-[color:var(--muted)] block mb-2">
                    Image
                </label>

                <div className="flex items-start gap-4">
                    <div className="w-24 h-16 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] overflow-hidden relative">
                        {currentImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={currentImage} alt="Background" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full text-xs text-[color:var(--muted)]">None</div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] hover:bg-[color:var(--surface2)] cursor-pointer transition ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                            {uploading ? "Uploading..." : "Upload Image"}
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>

                        {currentImage && (
                            <button
                                type="button"
                                onClick={clearImage}
                                className="text-xs text-rose-400 hover:text-rose-300 transition"
                            >
                                Remove Image
                            </button>
                        )}
                    </div>
                </div>
                {error && <div className="text-xs text-rose-400 mt-1">{error}</div>}
            </div>

            <hr className="border-[color:var(--border)]" />

            {/* 2. Colors */}
            <div>
                <label className="text-xs uppercase tracking-wide text-[color:var(--muted)] block mb-3">
                    Colors
                </label>

                <div className="grid grid-cols-[80px_1fr] gap-4 items-center mb-4">
                    <div className="text-xs text-[color:var(--fg)]">Background</div>
                    <div className="flex flex-wrap gap-2 items-center">
                        {PRESETS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${currentBg === color ? "border-white scale-110 shadow" : "border-transparent opacity-80"
                                    }`}
                                style={{ backgroundColor: color }}
                                onClick={() => handleChange("backgroundColor", color)}
                                title={color}
                            />
                        ))}
                        <div className="relative w-6 h-6 rounded-full overflow-hidden border border-[color:var(--border)]">
                            <input
                                type="color"
                                className="absolute inset-[-4px] w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                value={currentBg}
                                onChange={(e) => handleChange("backgroundColor", e.target.value)}
                                onFocus={onInteractionStart}
                                onBlur={onInteractionEnd}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Duck Body */}
                    <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                        <div className="text-xs text-[color:var(--fg)]">Body</div>
                        <div className="flex items-center gap-2">
                            <div className="h-8 flex-1 max-w-[120px] rounded-lg border border-[color:var(--border)] flex items-center px-1 bg-[color:var(--surface)]">
                                <input
                                    type="color"
                                    className="w-full h-6 rounded bg-transparent cursor-pointer"
                                    value={currentDuck}
                                    onChange={(e) => handleChange("duckColor", e.target.value)}
                                    onFocus={onInteractionStart}
                                    onBlur={onInteractionEnd}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Duck Belly */}
                    <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                        <div className="text-xs text-[color:var(--fg)]">Belly</div>
                        <div className="flex items-center gap-2">
                            <div className="h-8 flex-1 max-w-[120px] rounded-lg border border-[color:var(--border)] flex items-center px-1 bg-[color:var(--surface)]">
                                <input
                                    type="color"
                                    className="w-full h-6 rounded bg-transparent cursor-pointer"
                                    value={preferences.duckBellyColor || "#FFF3C9"}
                                    onChange={(e) => handleChange("duckBellyColor", e.target.value)}
                                    onFocus={onInteractionStart}
                                    onBlur={onInteractionEnd}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Duck Beak */}
                    <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                        <div className="text-xs text-[color:var(--fg)]">Beak</div>
                        <div className="flex items-center gap-2">
                            <div className="h-8 flex-1 max-w-[120px] rounded-lg border border-[color:var(--border)] flex items-center px-1 bg-[color:var(--surface)]">
                                <input
                                    type="color"
                                    className="w-full h-6 rounded bg-transparent cursor-pointer"
                                    value={preferences.beakColor || "#FF8B4A"}
                                    onChange={(e) => handleChange("beakColor", e.target.value)}
                                    onFocus={onInteractionStart}
                                    onBlur={onInteractionEnd}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Duck Eyes */}
                    <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                        <div className="text-xs text-[color:var(--fg)]">Eyes</div>
                        <div className="flex items-center gap-2">
                            <div className="h-8 flex-1 max-w-[120px] rounded-lg border border-[color:var(--border)] flex items-center px-1 bg-[color:var(--surface)]">
                                <input
                                    type="color"
                                    className="w-full h-6 rounded bg-transparent cursor-pointer"
                                    value={preferences.eyeColor || "#1E2430"}
                                    onChange={(e) => handleChange("eyeColor", e.target.value)}
                                    onFocus={onInteractionStart}
                                    onBlur={onInteractionEnd}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={() => onChange({
                            ...preferences,
                            duckColor: undefined,
                            duckBellyColor: undefined,
                            beakColor: undefined,
                            eyeColor: undefined
                        })}
                        className="text-xs text-[color:var(--muted)] hover:text-[color:var(--fg)] px-3 py-1 rounded hover:bg-[color:var(--surface2)]"
                    >
                        Reset Duck Colors
                    </button>
                </div>
            </div>
        </div>
    );
}
