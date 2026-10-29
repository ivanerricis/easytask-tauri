import type { ReactNode } from "react"
import type { ExternalStore } from "@/lib/external-store"
import type { PaneIndex } from "@/lib/tabs/layout-reducer"
import {
    FocusedPaneStoreContext, IsSplitStoreContext, LayoutActionsContext, LayoutContext, PaneTabsContext,
} from "./layout-context-object"
import { ActiveIdContext, ActiveIdStoreContext, TabUiContext, TabsActionsContext, TabsContext, type TabUiStore } from "./tabs-context-object"
import type { TabsValues } from "./use-tabs-values"

type TabsProvidersProps = {
    values: TabsValues
    uiStore: TabUiStore
    active: number | null
    activeStore: ExternalStore<number | null>
    focusedStore: ExternalStore<PaneIndex>
    isSplitStore: ExternalStore<boolean>
    children: ReactNode
}

/**
 * The nested providers of the tabs and layout contexts (split in several contexts so consumers re-render only for what
 * they use).
 * @category Tabs
 */
export function TabsProviders({ values, uiStore, active, activeStore, focusedStore, isSplitStore, children }: TabsProvidersProps) {
    return (
        <TabsActionsContext.Provider value={values.actions}>
            <LayoutActionsContext.Provider value={values.layoutActions}>
                <TabUiContext.Provider value={uiStore}>
                    <FocusedPaneStoreContext.Provider value={focusedStore}>
                        <IsSplitStoreContext.Provider value={isSplitStore}>
                            <LayoutContext.Provider value={values.layout}>
                                <PaneTabsContext.Provider value={values.paneTabs}>
                                    <ActiveIdContext.Provider value={active}>
                                        <ActiveIdStoreContext.Provider value={activeStore}>
                                            <TabsContext.Provider value={values.value}>
                                                {children}
                                            </TabsContext.Provider>
                                        </ActiveIdStoreContext.Provider>
                                    </ActiveIdContext.Provider>
                                </PaneTabsContext.Provider>
                            </LayoutContext.Provider>
                        </IsSplitStoreContext.Provider>
                    </FocusedPaneStoreContext.Provider>
                </TabUiContext.Provider>
            </LayoutActionsContext.Provider>
        </TabsActionsContext.Provider>
    )
}
