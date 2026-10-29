import { createContext } from "react"
import type { PaneIndex } from "@/contexts/layout-reducer"
import type { TabHover } from "./tab-reorder"

/** The state of the drag shared by the tab bars (provided by `TabsDndProvider`). */
export type TabsDndContextType = {
    /** Where the dragged tab hovers now, null when it is over nothing it can be dropped on. */
    hover: TabHover | null
    /** The tab being dragged. */
    dragging: { pane: PaneIndex, noteId: number } | null
}

/** Null outside `TabsDndProvider`: a tab bar then runs its own drag and drop context. */
export const TabsDndContext = createContext<TabsDndContextType | null>(null)
