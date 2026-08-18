"use client";

import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// SVG Flag components (inline for simplicity)
function FlagUK({ className = "w-5 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 60 40" className={className}>
            <rect width="60" height="40" fill="#012169" />
            <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="6" />
            <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="2" />
            <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6" />
        </svg>
    );
}

function FlagDE({ className = "w-5 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 60 40" className={className}>
            <rect y="0" width="60" height="13.33" fill="#000" />
            <rect y="13.33" width="60" height="13.33" fill="#DD0000" />
            <rect y="26.66" width="60" height="13.34" fill="#FFCE00" />
        </svg>
    );
}

/**
 * Compact language selector dropdown
 * Used in auth pages where the full Hub is not available
 */
export default function LanguageSelector({ className }: { className?: string }) {
    const { language, setLanguage } = useLanguage();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-white hover:bg-zinc-700/80 transition-all",
                        className,
                    )}
                >
                    {language === 'de' ? <FlagDE /> : <FlagUK />}
                    <span className="text-sm font-medium">{language.toUpperCase()}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-32">
                <DropdownMenuItem
                    onClick={() => setLanguage('en')}
                    className={language === 'en' ? 'bg-zinc-800' : ''}
                >
                    <FlagUK className="w-5 h-4 mr-2" /> English
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setLanguage('de')}
                    className={language === 'de' ? 'bg-zinc-800' : ''}
                >
                    <FlagDE className="w-5 h-4 mr-2" /> Deutsch
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
