"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Compact language selector dropdown
 * Used in auth pages where the full Hub is not available
 */
export default function LanguageSelector() {
    const { language, setLanguage } = useLanguage();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-white hover:bg-zinc-700/80 transition-all"
                >
                    <Globe size={16} />
                    <span className="text-sm font-medium">{language === 'de' ? '🇩🇪' : '🇬🇧'}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-32">
                <DropdownMenuItem
                    onClick={() => setLanguage('en')}
                    className={language === 'en' ? 'bg-zinc-800' : ''}
                >
                    🇬🇧 English
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setLanguage('de')}
                    className={language === 'de' ? 'bg-zinc-800' : ''}
                >
                    🇩🇪 Deutsch
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
