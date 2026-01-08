"use client";

import { Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

/**
 * Small badge that informs users that words are only available in English.
 * Used in Wordle and WordSearch games.
 */
export default function EnglishWordsHint() {
    const { t } = useLanguage();

    return (
        <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px]"
            title={t.games.englishWordsHint}
        >
            <Info size={10} />
            <span className="hidden sm:inline">EN</span>
        </div>
    );
}
