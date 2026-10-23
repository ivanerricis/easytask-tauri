import { createExternalStore, type ExternalStore } from "@/lib/external-store"
import type { SearchMatch, SearchMatchKind } from "./note-search"

export type NoteSearchState = {
    /** The search field is open. */
    open: boolean
    query: string
    matches: SearchMatch[]
    /** Index of the current match in `matches` (0 without matches). */
    activeIndex: number
    /** Grows when the current match has to be brought into view (a step, a new query), not when the tree changes. */
    revealTick: number
}

export type NoteSearchStore = ExternalStore<NoteSearchState> & {
    open: () => void
    /** Closes the field and clears the search. */
    close: () => void
    setQuery: (query: string) => void
    /** Replaces the matches; `fresh` (another query) goes back to the first one, otherwise the current one is kept. */
    setMatches: (matches: SearchMatch[], fresh?: boolean) => void
    /** Moves to the next (1) or previous (-1) match, wrapping around. */
    step: (delta: 1 | -1) => void
}

export const INITIAL_NOTE_SEARCH: NoteSearchState = { open: false, query: "", matches: [], activeIndex: 0, revealTick: 0 }

export function createNoteSearchStore(): NoteSearchStore {
    const store = createExternalStore<NoteSearchState>(INITIAL_NOTE_SEARCH)
    const patch = (changes: Partial<NoteSearchState>) => store.set({ ...store.getState(), ...changes })
    return {
        ...store,
        open: () => { if (!store.getState().open) patch({ open: true }) },
        close: () => store.set(INITIAL_NOTE_SEARCH),
        setQuery: query => {
            if (query !== store.getState().query) patch({ query })
        },
        setMatches: (matches, fresh = false) => {
            const state = store.getState()
            if (matches.length === 0 && state.matches.length === 0) return
            if (fresh || state.matches.length === 0) {
                patch({ matches, activeIndex: 0, revealTick: matches.length > 0 ? state.revealTick + 1 : state.revealTick })
                return
            }
            // The tree changed (an edit, a completed task): stay on the same match when it still exists
            const current = state.matches[state.activeIndex]?.id
            const kept = matches.findIndex(m => m.id === current)
            patch({ matches, activeIndex: kept >= 0 ? kept : Math.min(state.activeIndex, Math.max(0, matches.length - 1)) })
        },
        step: delta => {
            const state = store.getState()
            const total = state.matches.length
            if (total === 0) return
            patch({ activeIndex: (state.activeIndex + delta + total) % total, revealTick: state.revealTick + 1 })
        },
    }
}

/** The current match, if any. */
export const activeMatch = (state: NoteSearchState): SearchMatch | undefined => state.matches[state.activeIndex]

/** The occurrence of the item `kind`+`id` that is the current match, or -1. */
export const activeOccurrenceOf = (state: NoteSearchState, kind: SearchMatchKind, id: number): number => {
    const match = state.open ? activeMatch(state) : undefined
    return match && match.kind === kind && match.itemId === id ? match.occurrence : -1
}
