import { createContext } from "react"
import type { Note } from "@/types/types"

export type TabsContextType = {
    /** Ids of the open notes, in tab order. */
    openIds: number[]
    /** Id of the active tab, if any. */
    activeId: number | null
    /** The open notes, derived from the live notes list (ids not found are dropped). */
    tabs: Note[]
    /** The active note, derived from the live notes list. */
    currentNote: Note | null
}

export type TabsActionsType = {
    /** Opens the note in a tab (if not already open) and makes it the active one. */
    openNote: (noteId: number) => void
    /** Closes a tab; when it is the active one the neighbour tab becomes active. */
    closeNote: (noteId: number) => void
    /** Closes several tabs at once. */
    closeNotes: (noteIds: readonly number[]) => void
    /** Closes the active tab. */
    closeActiveNote: () => void
    /** Closes every tab. */
    closeAllNotes: () => void
    /** Moves a tab from an index to another one and activates it. */
    reorderTabs: (from: number, to: number) => void
    /** Makes an open tab the active one. */
    activateNote: (noteId: number) => void
    /** Activates the next (1) or previous (-1) tab, wrapping around the ends. */
    cycleNote: (direction: 1 | -1) => void
}

/** What is selected in a note (shown in the details panel). */
export type SelectedItem = { type: "task", id: number }

export type ScrollPosition = { left: number, top: number }

/**
 * Per-note UI state that must survive tab switches (collapsed sections, scroll position).
 * It is a plain external store: it never triggers a re-render of the whole tabs tree.
 * @category Tabs
 */
export type TabUiStore = {
    isSectionCollapsed: (noteId: number, sectionId: number) => boolean
    setSectionCollapsed: (noteId: number, sectionId: number, collapsed: boolean) => void
    isGroupCollapsed: (noteId: number, groupId: number) => boolean
    setGroupCollapsed: (noteId: number, groupId: number, collapsed: boolean) => void
    getSelectedItem: (noteId: number) => SelectedItem | null
    setSelectedItem: (noteId: number, item: SelectedItem | null) => void
    getScroll: (noteId: number) => ScrollPosition | undefined
    setScroll: (noteId: number, position: ScrollPosition) => void
    /** Drops the UI state of the notes that are not in `keep` (closed tabs). */
    retain: (keep: readonly number[]) => void
    subscribe: (listener: () => void) => () => void
}

export const TabsContext = createContext<TabsContextType | null>(null)
export const TabsActionsContext = createContext<TabsActionsType | null>(null)
export const ActiveIdContext = createContext<number | null>(null)
export const TabUiContext = createContext<TabUiStore | null>(null)
