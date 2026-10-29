import { useMemo, useState, type ReactNode } from "react"
import { createExternalStore } from "@/lib/external-store"
import { TabsActionsContext, TabsContext, ActiveIdContext, ActiveIdStoreContext, type TabsActionsType } from "@/contexts/tabs-context-object"
import { FocusedPaneStoreContext, IsSplitStoreContext, PaneTabsContext, type PaneTabsValue } from "@/contexts/layout-context-object"
import type { PaneIndex } from "@/contexts/layout-reducer"
import type { SplitState } from "@/test/split-fixtures"
import { noopActions, tabsValue } from "@/test/split-fixtures"

/** Test harness: supplies the layout contexts directly (what the TabsProvider will provide). */
export function SplitHarness({ state, actions0 = noopActions, actions1 = noopActions, focusStore, children }: {
    state: SplitState
    actions0?: TabsActionsType
    actions1?: TabsActionsType
    focusStore?: ReturnType<typeof createExternalStore<PaneIndex>>
    children: ReactNode
}) {
    const [ownFocus] = useState(() => createExternalStore<PaneIndex>(state.focused))
    const store = focusStore ?? ownFocus
    const [stores] = useState(() => [createExternalStore<number | null>(state.active0), createExternalStore<number | null>(state.active1)] as const)
    stores[0].set(state.active0)
    stores[1].set(state.active1)
    const pane0 = useMemo<PaneTabsValue>(() => ({ tabs: tabsValue(state.open0, state.active0), actions: actions0, activeStore: stores[0] }), [state.open0, state.active0, actions0, stores])
    const pane1 = useMemo<PaneTabsValue>(() => ({ tabs: tabsValue(state.open1, state.active1), actions: actions1, activeStore: stores[1] }), [state.open1, state.active1, actions1, stores])
    const paneTabs = useMemo(() => [pane0, pane1] as const, [pane0, pane1])
    const focusedPane = state.focused === 0 ? pane0 : pane1
    const union = useMemo(() => tabsValue([...state.open0, ...state.open1], focusedPane.tabs.activeId), [state.open0, state.open1, focusedPane])
    return (
        <FocusedPaneStoreContext.Provider value={store}>
            <PaneTabsContext.Provider value={paneTabs}>
                <TabsContext.Provider value={union}>
                    <TabsActionsContext.Provider value={focusedPane.actions}>
                        <ActiveIdContext.Provider value={focusedPane.tabs.activeId}>
                            <ActiveIdStoreContext.Provider value={focusedPane.activeStore}>{children}</ActiveIdStoreContext.Provider>
                        </ActiveIdContext.Provider>
                    </TabsActionsContext.Provider>
                </TabsContext.Provider>
            </PaneTabsContext.Provider>
        </FocusedPaneStoreContext.Provider>
    )
}

/** Test harness: supplies the "is split" store read by `useIsSplit` (what the TabsProvider provides). */
export function IsSplitProvider({ isSplit, children }: { isSplit: boolean, children: ReactNode }) {
    const [store] = useState(() => createExternalStore(isSplit))
    store.set(isSplit)
    return <IsSplitStoreContext.Provider value={store}>{children}</IsSplitStoreContext.Provider>
}
