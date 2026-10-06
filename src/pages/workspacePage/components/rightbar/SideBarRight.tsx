import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useActiveNote } from "@/contexts/use-active-note"
import { useActiveNoteId, useSelectedTask } from "@/contexts/use-tabs"
import { findTask } from "@/contexts/note-tree-ops"
import { usePreferences } from "@/contexts/use-preferences"
import { useShortcut } from "@/hooks/use-shortcut"
import { focusRing } from "@/lib/a11y"
import { useCompactLayout } from "@/lib/sidebar-layout"
import type { RightPanelTab } from "@/lib/store/preferences"
import { cn } from "@/lib/utils"
import { SideBar } from "../sidebar/SideBar"
import { DetailsPanel } from "./DetailsPanel"
import { HistoryPanel } from "./HistoryPanel"
import { useRightPanel } from "./use-right-panel"

const TABS: RightPanelTab[] = ["details", "history"]
const tabId = (tab: RightPanelTab) => `right-panel-tab-${tab}`
const panelId = (tab: RightPanelTab) => `right-panel-${tab}`

/**
 * The right sidebar: two tabs, "Details" (the selected task, otherwise the active note) and "History" (undo/redo).
 * Open state, width and tab are remembered; in a compact window it is an overlay. Must be inside a RightPanelProvider.
 * @category RightPanel
 */
export const SideBarRight = () => {
    const { t } = useTranslation()
    const { open, setOpen, tab, setTab } = useRightPanel()
    const { sidebarRightWidth, setSidebarRightWidth } = usePreferences()
    const compact = useCompactLayout()
    const tabRefs = useRef<Partial<Record<RightPanelTab, HTMLButtonElement | null>>>({})
    const activeId = useActiveNoteId()
    const { noteDataTree } = useActiveNote()
    const [selectedId, selectTask] = useSelectedTask(activeId)

    useShortcut("toggle-right-sidebar", () => setOpen(!open), { allowInInputs: true })

    // A selected task that disappears (deleted, moved to the trash) is no longer selected
    useEffect(() => {
        if (selectedId !== null && noteDataTree && !findTask(noteDataTree, selectedId)) selectTask(null)
    }, [selectedId, noteDataTree, selectTask])

    const handleTabKeyDown = (e: React.KeyboardEvent) => {
        const index = TABS.indexOf(tab)
        let next: RightPanelTab | undefined
        if (e.key === "ArrowRight") next = TABS[(index + 1) % TABS.length]
        else if (e.key === "ArrowLeft") next = TABS[(index - 1 + TABS.length) % TABS.length]
        else if (e.key === "Home") next = TABS[0]
        else if (e.key === "End") next = TABS[TABS.length - 1]
        if (!next) return
        e.preventDefault()
        setTab(next)
        tabRefs.current[next]?.focus()
    }

    return (
        <SideBar
            position="right"
            open={open}
            onOpenChange={setOpen}
            width={sidebarRightWidth}
            onWidthChange={setSidebarRightWidth}
            overlay={compact}
            toggleShortcut="toggle-right-sidebar"
            toggleLabels={{ toggle: t("rightPanel.toggle"), show: t("rightPanel.show"), hide: t("rightPanel.hide") }}
        >
            <div className="flex h-full w-full flex-col bg-secondary">
                {/* Same height as the left sidebar header and the note tabs */}
                <div role="tablist" aria-label={t("rightPanel.tabs")} className="flex shrink-0 min-h-[42px] border-b-2" onKeyDown={handleTabKeyDown}>
                    {TABS.map(item => (
                        <button
                            key={item}
                            ref={node => { tabRefs.current[item] = node }}
                            type="button"
                            role="tab"
                            id={tabId(item)}
                            aria-selected={tab === item}
                            aria-controls={panelId(item)}
                            tabIndex={tab === item ? 0 : -1}
                            onClick={() => setTab(item)}
                            className={cn(
                                focusRing,
                                "flex-1 cursor-pointer border-b-2 px-3 py-2 text-sm hover:bg-accent",
                                tab === item ? "border-primary font-semibold" : "border-transparent text-muted-foreground",
                            )}
                        >
                            {t(`rightPanel.${item}`)}
                        </button>
                    ))}
                </div>
                <div
                    role="tabpanel"
                    id={panelId(tab)}
                    aria-labelledby={tabId(tab)}
                    className="min-h-0 flex-1 overflow-y-auto"
                >
                    {tab === "details" ? <DetailsPanel /> : <HistoryPanel />}
                </div>
            </div>
        </SideBar>
    )
}
