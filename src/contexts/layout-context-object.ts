import { createContext, type RefObject } from "react"
import type { NoteDataTree } from "@/types/types"
import { createExternalStore, type ExternalStore } from "@/lib/external-store"
import type { TabsActionsType, TabsContextType } from "./tabs-context-object"
import type { ActiveNoteActionsType } from "./active-note-context-object"
import { initialTabsState, type TabsState } from "./tabs-reducer"
import type { PaneIndex } from "./layout-reducer"

export type LayoutContextType = {
    /** Tabs of the left pane (always present). */
    left: TabsState
    /** Tabs of the right pane, null while the workspace is not split. */
    right: TabsState | null
    /** The pane that has the focus (always 0 when not split). */
    focused: PaneIndex
    isSplit: boolean
}

export type LayoutActionsType = {
    /** Adds an empty right pane. */
    split: () => void
    /** Closes the right pane together with its tabs. */
    unsplit: () => void
    toggleSplit: () => void
    focusPane: (pane: PaneIndex) => void
    /** Opens a note in a pane (moving it there if it is open in the other one). */
    openInPane: (noteId: number, pane: PaneIndex) => void
    /** Moves a note to a pane, at an optional position of its tabs. */
    moveToPane: (noteId: number, pane: PaneIndex, index?: number) => void
}

/** The tabs data and actions of one pane, as the hooks of the tabs return them outside the panes. */
export type PaneTabsValue = {
    tabs: TabsContextType
    actions: TabsActionsType
    activeStore: ExternalStore<number | null>
}

export type PaneContextType = {
    pane: PaneIndex
    /** Whether the pane has the focus (re-renders on change; use `isFocused` in event handlers). */
    focused: boolean
    /** Reads the focus now, without subscribing: stable identity. */
    isFocused: () => boolean
    /** The root element of the pane. */
    rootRef: RefObject<HTMLDivElement | null>
}

export const LayoutContext = createContext<LayoutContextType>({ left: initialTabsState, right: null, focused: 0, isSplit: false })
export const LayoutActionsContext = createContext<LayoutActionsType>({
    split: () => {},
    unsplit: () => {},
    toggleSplit: () => {},
    focusPane: () => {},
    openInPane: () => {},
    moveToPane: () => {},
})
export const FocusedPaneStoreContext = createContext<ExternalStore<PaneIndex>>(createExternalStore<PaneIndex>(0))
/** Tabs of the two panes (null outside the layout provider). */
export const PaneTabsContext = createContext<readonly [PaneTabsValue, PaneTabsValue] | null>(null)
/** Data of the active note of each pane. */
export const PaneNoteTreesContext = createContext<readonly [NoteDataTree | null, NoteDataTree | null] | null>(null)
/** Optimistic actions bound to the active note of each pane. */
export const PaneNoteActionsContext = createContext<readonly [ActiveNoteActionsType, ActiveNoteActionsType] | null>(null)
/** The pane a component is rendered in (null outside the panes). */
export const PaneContext = createContext<PaneContextType | null>(null)
