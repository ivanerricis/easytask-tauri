import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { it } from "./locales/it"
import { en } from "./locales/en"

const SUPPORTED_LANGUAGES = ["it", "en"] as const

export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export type LanguagePreference = "system" | Language

export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = "system"

export const isLanguagePreference = (value: unknown): value is LanguagePreference =>
    value === "system" || (SUPPORTED_LANGUAGES as readonly unknown[]).includes(value)

/** Maps a BCP 47 tag ("it-IT", "en-US", ...) to a supported language: Italian for "it*", English otherwise. */
export const languageFromLocale = (locale: string | undefined | null): Language =>
    typeof locale === "string" && locale.toLowerCase().startsWith("it") ? "it" : "en"

/** The language of the operating system / webview. */
export const getSystemLanguage = (): Language =>
    languageFromLocale(typeof navigator !== "undefined" ? navigator.language : undefined)

/** Resolves a stored preference ("system", "it" or "en") to a concrete language. */
export const resolveLanguage = (preference: LanguagePreference): Language =>
    preference === "system" ? getSystemLanguage() : preference

const syncDocumentLanguage = (lng: string) => {
    if (typeof document !== "undefined") document.documentElement.lang = lng
}

/**
 * Initializes i18next (static bundled resources, so it is synchronous).
 * Safe to call more than once: later calls only switch the language.
 */
export const initI18n = (preference: LanguagePreference = DEFAULT_LANGUAGE_PREFERENCE): typeof i18n => {
    const lng = resolveLanguage(preference)
    if (!i18n.isInitialized) {
        void i18n.use(initReactI18next).init({
            resources: { it: { translation: it }, en: { translation: en } },
            lng,
            fallbackLng: "en",
            supportedLngs: [...SUPPORTED_LANGUAGES],
            interpolation: { escapeValue: false },
            react: { useSuspense: false },
            initAsync: false,
        })
        i18n.on("languageChanged", syncDocumentLanguage)
        syncDocumentLanguage(lng)
    } else {
        void applyLanguagePreference(preference)
    }
    return i18n
}

/** Switches the UI language immediately, without a restart. */
export const applyLanguagePreference = async (preference: LanguagePreference): Promise<void> => {
    const lng = resolveLanguage(preference)
    if (i18n.language !== lng) await i18n.changeLanguage(lng)
    syncDocumentLanguage(lng)
}

/** The language currently in use, for Intl formatting. */
export const currentLanguage = (): Language => (i18n.language === "it" ? "it" : "en")

export default i18n
