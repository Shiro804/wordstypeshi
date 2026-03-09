"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/games/common/Modal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { fetchWordHistory, type StoredWordDefinition } from "@/lib/word-definitions";
import type { Difficulty } from "@/lib/difficulty";

type Props = {
    open: boolean;
    onClose: () => void;
};

const difficultyColors: Record<Difficulty, string> = {
    easy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    medium: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    hard: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

// German translations for parts of speech
const germanPartsOfSpeech: Record<string, string> = {
    noun: "Substantiv",
    verb: "Verb",
    adjective: "Adjektiv",
    adverb: "Adverb",
    pronoun: "Pronomen",
    preposition: "Präposition",
    conjunction: "Konjunktion",
    interjection: "Interjektion",
};

function translatePartOfSpeech(pos: string): string {
    return germanPartsOfSpeech[pos.toLowerCase()] || pos;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export default function WordHistory({ open, onClose }: Props) {
    const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
    const [words, setWords] = useState<StoredWordDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedWord, setExpandedWord] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        const run = async () => {
            setLoading(true);
            setError(null);

            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setError("Bitte einloggen um die Worthistorie zu sehen");
                    return;
                }

                const data = await fetchWordHistory(
                    user.id,
                    difficulty === "all" ? undefined : difficulty
                );
                setWords(data);
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Fehler beim Laden");
            } finally {
                setLoading(false);
            }
        };

        void run();
    }, [open, difficulty]);

    return (
        <Modal open={open} onClose={onClose} title="📚 Worthistorie">
            <div className="space-y-3">
                {/* Filter */}
                <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                        Filter
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--fg)] shadow-sm transition hover:bg-[color:var(--surface2)]"
                            >
                                <span>{difficulty === "all" ? "Alle" : difficulty}</span>
                                <span className="text-[color:var(--muted)]">▾</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-32">
                            <DropdownMenuItem onClick={() => setDifficulty("all")}>
                                Alle
                            </DropdownMenuItem>
                            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                                <DropdownMenuItem key={d} onClick={() => setDifficulty(d)}>
                                    {d}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="ml-auto text-xs text-[color:var(--muted)]">
                        {words.length} {words.length === 1 ? "Wort" : "Wörter"}
                    </div>
                </div>

                {/* Loading / Error states */}
                {loading && (
                    <div className="text-sm text-[color:var(--muted)]">Laden…</div>
                )}
                {error && <div className="text-sm text-rose-300">{error}</div>}

                {/* Word list */}
                {!loading && !error && (
                    <div className="max-h-[60vh] overflow-y-auto space-y-2">
                        {words.length === 0 ? (
                            <div className="py-8 text-center text-sm text-[color:var(--muted)]">
                                Noch keine gelösten Wörter.
                                <br />
                                <span className="text-xs">Spiele ein paar Runden um deine Historie aufzubauen!</span>
                            </div>
                        ) : (
                            words.map((word) => {
                                const isExpanded = expandedWord === word.id;
                                return (
                                    <div
                                        key={word.id}
                                        className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]/80 overflow-hidden"
                                    >
                                        {/* Word header - always visible */}
                                        <button
                                            type="button"
                                            onClick={() => setExpandedWord(isExpanded ? null : word.id)}
                                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[color:var(--surface2)] transition"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-bold text-[color:var(--fg)] tracking-wider">
                                                    {word.word}
                                                </span>
                                                {word.part_of_speech && (
                                                    <span className="text-[10px] text-[color:var(--muted)] italic">
                                                        {translatePartOfSpeech(word.part_of_speech)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${difficultyColors[word.difficulty]}`}>
                                                    {word.difficulty}
                                                </span>
                                                <span className="text-xs text-[color:var(--muted)]">
                                                    {formatDate(word.solved_at)}
                                                </span>
                                                <span className="text-[color:var(--muted)]">
                                                    {isExpanded ? "▲" : "▼"}
                                                </span>
                                            </div>
                                        </button>

                                        {/* Expandable definition */}
                                        {isExpanded && (
                                            <div className="px-3 pb-3 pt-1 border-t border-[color:var(--border)]/50">
                                                <div className="text-sm text-[color:var(--fg)]/90 leading-relaxed">
                                                    {word.meaning}
                                                </div>
                                                {word.meaning_german && (
                                                    <div className="mt-2 pt-2 border-t border-[color:var(--border)]/30 text-sm text-[color:var(--muted)] italic">
                                                        🇩🇪 {word.meaning_german}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
