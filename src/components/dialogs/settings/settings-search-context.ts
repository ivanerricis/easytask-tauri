import { createContext, useContext } from "react"

export type SettingsSearch = {
    /** The normalized query ("" when not searching). */
    query: string
    /** True inside a panel or subsection whose title matches: all its rows are shown. */
    scopeMatches: boolean
}

export const SettingsSearchContext = createContext<SettingsSearch>({ query: "", scopeMatches: false })

export const useSettingsSearch = () => useContext(SettingsSearchContext)

/** Lowercase and strip the accents, so "Cosi" finds "Così". */
export const normalizeSearch = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim()

export const matchesSearch = (query: string, ...texts: (string | undefined)[]) =>
    texts.some(text => text !== undefined && normalizeSearch(text).includes(query))

/** Hides the containers (card, subsection, panel) left without any visible row while searching. */
export const HIDE_WHEN_NO_ROWS = "[&:not(:has([data-settings-row]))]:hidden"
