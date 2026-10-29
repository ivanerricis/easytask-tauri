import type { PaneIndex } from "@/contexts/layout-reducer"
import type { TabsActionsType, TabsContextType } from "@/contexts/tabs-context-object"
import { makeNote } from "@/test/ui-fixtures"

const noop = () => {}
export const noopActions: TabsActionsType = {
    openNote: noop, closeNote: noop, closeNotes: noop, closeActiveNote: noop, closeAllNotes: noop,
    reorderTabs: noop, activateNote: noop, cycleNote: noop,
}

export const tabsValue = (openIds: number[], activeId: number | null): TabsContextType => {
    const tabs = openIds.map(id => makeNote({ id }))
    return { openIds, activeId, tabs, currentNote: tabs.find(n => n.id === activeId) ?? null, restored: true }
}

export type SplitState = { open0: number[], active0: number | null, open1: number[], active1: number | null, focused: PaneIndex }
