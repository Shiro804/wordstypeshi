"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, type Language, type TranslationKeys } from './translations';

const LANGUAGE_STORAGE_KEY = 'batagames_language';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('de'); // Default to German
    const [mounted, setMounted] = useState(false);

    // Load language preference on mount
    useEffect(() => {
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
        if (stored && (stored === 'en' || stored === 'de')) {
            setLanguageState(stored);
        } else {
            // Try to detect browser language
            const browserLang = navigator.language.toLowerCase();
            if (browserLang.startsWith('de')) {
                setLanguageState('de');
            } else {
                setLanguageState('en');
            }
        }
        setMounted(true);
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }, []);

    // Get translations for current language
    const t = translations[language];

    // Prevent hydration mismatch by rendering with default until mounted
    if (!mounted) {
        return (
            <LanguageContext.Provider value={{ language: 'de', setLanguage, t: translations.de }}>
                {children}
            </LanguageContext.Provider>
        );
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

// Convenience hook for just getting translations
export function useTranslations() {
    const { t } = useLanguage();
    return t;
}
