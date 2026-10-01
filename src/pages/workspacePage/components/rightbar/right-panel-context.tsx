import { useState } from "react"
import { usePreferences } from "@/contexts/use-preferences"
import { useSelectTask } from "@/contexts/use-tabs"
import { useCompactLayout } from "@/lib/sidebar-layout"
import { RightPanelContext } from "./right-panel-context-object"

/**
 * State of the right panel: open/closed (persisted; in a compact window it is a closed-by-default overlay that is
 * not persisted, like the left sidebar) and the active tab (persisted). Must be inside the preferences and tabs providers.
 * @category RightPanel
 */
export function RightPanelProvider({ children }: { children: React.ReactNode }) {
    const { sidebarRightOpen, setSideBarRightOpen, rightPanelTab, setRightPanelTab } = usePreferences()
    const compact = useCompactLayout()
    const selectTask = useSelectTask()
    const [overlayOpen, setOverlayOpen] = useState(false)
    const [prevCompact, setPrevCompact] = useState(compact)
    if (prevCompact !== compact) {
        setPrevCompact(compact)
        setOverlayOpen(false)
    }

    const open = compact ? overlayOpen : sidebarRightOpen
    const setOpen = (value: boolean) => {
        if (compact) setOverlayOpen(value)
        else setSideBarRightOpen(value)
    }
    const showTaskDetails = (taskId: number) => {
        selectTask(taskId)
        setRightPanelTab("details")
        setOpen(true)
    }

    return (
        <RightPanelContext.Provider value={{ open, setOpen, tab: rightPanelTab, setTab: setRightPanelTab, showTaskDetails }}>
            {children}
        </RightPanelContext.Provider>
    )
}
