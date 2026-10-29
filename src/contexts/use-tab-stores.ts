import { useLayoutEffect, useState } from "react"
import { focusedPane, type LayoutState, type PaneIndex } from "@/lib/tabs/layout-reducer"
import { createExternalStore, type ExternalStore } from "@/lib/external-store"

/** The external stores that mirror the layout, so the rows that read them re-render only for what they use. */
export type TabStores = {
    activeStore: ExternalStore<number | null>
    focusedStore: ExternalStore<PaneIndex>
    isSplitStore: ExternalStore<boolean>
    paneStores: readonly [ExternalStore<number | null>, ExternalStore<number | null>]
    /** The active note of the focused pane. */
    active: number | null
}

/**
 * Creates the active/focused/isSplit/pane external stores and keeps them in sync with the layout (before paint, so the
 * rows that read the stores never show a stale active note).
 * @param state The layout state.
 * @returns The stores and the active id of the focused pane.
 * @category Tabs
 */
export function useTabStores(state: LayoutState): TabStores {
    const [activeStore] = useState(() => createExternalStore<number | null>(null))
    const [focusedStore] = useState(() => createExternalStore<PaneIndex>(0))
    const [isSplitStore] = useState(() => createExternalStore<boolean>(false))
    const [paneStores] = useState(() => [createExternalStore<number | null>(null), createExternalStore<number | null>(null)] as const)

    const { left, right, focused } = state
    const isSplit = right !== null
    const active = focusedPane(state).activeId

    useLayoutEffect(() => {
        activeStore.set(active)
        focusedStore.set(focused)
        isSplitStore.set(isSplit)
        paneStores[0].set(left.activeId)
        paneStores[1].set(right?.activeId ?? null)
    }, [activeStore, focusedStore, isSplitStore, paneStores, active, focused, left.activeId, right?.activeId, isSplit])

    return { activeStore, focusedStore, isSplitStore, paneStores, active }
}
