import { useCallback, useContext } from "react"
import {
    LayoutActionsContext,
    IsSplitStoreContext,
    LayoutContext,
    PaneContext,
    type LayoutActionsType,
    type LayoutContextType,
    type PaneContextType,
} from "./layout-context-object"
import { findPane, type PaneIndex } from "./layout-reducer"
import { useStoreSelector } from "@/lib/external-store"

const ALWAYS_FOCUSED = () => true

const readRoot = (ref: PaneContextType["rootRef"] | undefined): ParentNode => ref?.current ?? document

/** The layout of the panes. Outside the provider: a single empty pane. */
export const useLayout = (): LayoutContextType => useContext(LayoutContext)

/** Whether the workspace is split. Unlike `useLayout` it re-renders only when this flips, not on every tab change. False outside the provider. */
export const useIsSplit = (): boolean => useStoreSelector(useContext(IsSplitStoreContext), isSplit => isSplit)

/** The actions on the layout. Outside the provider they do nothing. */
export const useLayoutActions = (): LayoutActionsType => useContext(LayoutActionsContext)

/** The pane the component is rendered in, null outside the panes. */
export const usePane = (): PaneContextType | null => useContext(PaneContext)

/** Whether the pane of the component has the focus (true outside the panes). Re-renders on change. */
export const useIsFocusedPane = (): boolean => useContext(PaneContext)?.focused ?? true

/** Reads the focus of the pane without subscribing, for event handlers. Stable identity; always true outside the panes. */
export const usePaneFocusGetter = (): (() => boolean) => useContext(PaneContext)?.isFocused ?? ALWAYS_FOCUSED

/** The pane that holds a note, null if the note is not open. */
export const usePaneOfNote = (noteId: number): PaneIndex | null => {
    return findPane(useLayout(), noteId)
}

/** A function returning the root element of the pane to query within (the document outside the panes). */
export const usePaneRoot = (): (() => ParentNode) => {
    const rootRef = useContext(PaneContext)?.rootRef
    return useCallback(() => readRoot(rootRef), [rootRef])
}
