"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/games/common/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertMyProfile } from "@/lib/auth/profile";
import {
    checkUsernameAvailability,
    validateUsernameFormat,
} from "@/lib/auth/check-username-availability";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check, X, User } from "lucide-react";

interface UsernameModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (username: string) => void;
}

export default function UsernameModal({ open, onClose, onSave }: UsernameModalProps) {
    const [username, setUsername] = useState("");
    const [isChecking, setIsChecking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formatError, setFormatError] = useState<string | null>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Get current user ID on mount
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setCurrentUserId(data.user.id);
            }
        });
    }, []);

    // Debounced availability check
    useEffect(() => {
        const trimmed = username.trim();

        // Reset states
        setAvailabilityError(null);
        setIsAvailable(null);

        // Validate format first
        const formatErr = validateUsernameFormat(trimmed);
        setFormatError(formatErr);

        if (formatErr || trimmed.length < 2) {
            return;
        }

        // Debounce the availability check
        const timeoutId = setTimeout(async () => {
            setIsChecking(true);
            try {
                const available = await checkUsernameAvailability(trimmed, currentUserId ?? undefined);
                setIsAvailable(available);
                if (!available) {
                    setAvailabilityError("Dieser Username ist bereits vergeben");
                }
            } catch {
                setAvailabilityError("Fehler bei der Überprüfung");
            } finally {
                setIsChecking(false);
            }
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [username, currentUserId]);

    const handleSave = useCallback(async () => {
        const trimmed = username.trim();

        if (!trimmed || formatError || !isAvailable) {
            return;
        }

        setIsSaving(true);
        try {
            await upsertMyProfile({ username: trimmed });
            onSave(trimmed);
        } catch (error: unknown) {
            // Check for unique constraint violation
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("unique") || errorMessage.includes("duplicate")) {
                setAvailabilityError("Dieser Username ist bereits vergeben");
                setIsAvailable(false);
            } else {
                setAvailabilityError("Fehler beim Speichern");
            }
        } finally {
            setIsSaving(false);
        }
    }, [username, formatError, isAvailable, onSave]);

    const canSave = username.trim().length >= 2 && !formatError && isAvailable === true && !isChecking;

    return (
        <Modal open={open} onClose={onClose} title="Username wählen">
            <div className="p-6 max-w-md mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-emerald-500/20">
                        <User className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Username wählen</h2>
                        <p className="text-sm text-zinc-400">
                            Wähle einen Username für das Leaderboard
                        </p>
                    </div>
                </div>

                {/* Username Input */}
                <div className="space-y-2 mb-6">
                    <div className="relative">
                        <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Dein Username"
                            className="pr-10"
                            maxLength={20}
                            autoFocus
                        />
                        {/* Status indicator */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isChecking && (
                                <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                            )}
                            {!isChecking && isAvailable === true && (
                                <Check className="w-4 h-4 text-emerald-400" />
                            )}
                            {!isChecking && isAvailable === false && (
                                <X className="w-4 h-4 text-red-400" />
                            )}
                        </div>
                    </div>

                    {/* Error messages */}
                    {formatError && (
                        <p className="text-xs text-red-400">{formatError}</p>
                    )}
                    {!formatError && availabilityError && (
                        <p className="text-xs text-red-400">{availabilityError}</p>
                    )}
                    {!formatError && !availabilityError && isAvailable && (
                        <p className="text-xs text-emerald-400">Username verfügbar!</p>
                    )}

                    {/* Help text */}
                    <p className="text-xs text-zinc-500">
                        2-20 Zeichen. Erlaubt: a-z, 0-9, _, ., -
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                        disabled={isSaving}
                    >
                        Überspringen
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!canSave || isSaving}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Speichern...
                            </>
                        ) : (
                            "Speichern"
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
