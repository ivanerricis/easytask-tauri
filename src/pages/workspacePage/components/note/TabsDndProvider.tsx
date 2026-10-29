import { useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import {
    DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
    type CollisionDetection, type DragEndEvent, type DragMoveEvent, type DragStartEvent,
} from "@dnd-kit/core"
import { useTranslation } from "react-i18next"
import { PaneTabsContext } from "@/contexts/layout-context-object"
import type { PaneIndex } from "@/contexts/layout-reducer"
import { useLayoutActions } from "@/contexts/use-layout"
import { buildDndAccessibility } from "@/lib/dnd-accessibility"
import { useGrabbingCursor } from "@/hooks/use-grabbing-cursor"
import { announce } from "../tasks/note-announcer-store"
import {
    barDndId, computeTabZone, parseBarDndId, parseTabDndId, pickBarByPoint, pickTabByX, resolveTabDrop,
    type TabHover,
} from "./tab-reorder"
import { TabsDndContext, type TabsDndContextType } from "./tabs-dnd-context-object"

type Dragging = { pane: PaneIndex, noteId: number }

/**
 * First the bar under the pointer (both axes), then inside it the tab under the pointer's x (the first / last one past either end,
 * so a tab can be dropped at either end of a bar), else the bar itself (an empty bar).
 */
const collisionDetection: CollisionDetection = ({ droppableContainers, droppableRects, pointerCoordinates }) => {
    if (!pointerCoordinates) return []
    const { x, y } = pointerCoordinates
    const bars: { id: PaneIndex, left: number, right: number, top: number, bottom: number }[] = []
    const tabs: { id: string, pane: PaneIndex, left: number, right: number }[] = []
    for (const container of droppableContainers) {
        const rect = droppableRects.get(container.id)
        if (!rect) continue
        const barPane = parseBarDndId(container.id)
        if (barPane !== null) bars.push({ id: barPane, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })
        const tab = parseTabDndId(container.id)
        if (tab) tabs.push({ id: String(container.id), pane: tab.pane, left: rect.left, right: rect.right })
    }
    const pane = pickBarByPoint(bars, x, y)
    if (pane === null) return []
    const id = pickTabByX(tabs.filter(tab => tab.pane === pane), x)
    return [{ id: id ?? barDndId(pane) }]
}

/**
 * The single drag and drop context of the two tab bars of the split workspace: a tab can be reordered inside its bar or dropped on the other
 * one, which moves the note to that pane at the drop position. The layout mounts it around BOTH panes; a `NoteList` outside it runs its own context.
 * @category Panes
 */
export function TabsDndProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation()
    const paneTabs = useContext(PaneTabsContext)
    const { moveToPane } = useLayoutActions()
    const [hover, setHover] = useState<TabHover | null>(null)
    const hoverRef = useRef<TabHover | null>(null)
    const [dragging, setDragging] = useState<Dragging | null>(null)
    useGrabbingCursor(dragging !== null)

    // A small distance keeps plain clicks (open / close tab) working
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    const paneLabel = useCallback((pane: PaneIndex) => t(pane === 0 ? "notes.split.leftPane" : "notes.split.rightPane"), [t])
    const noteName = useCallback((pane: PaneIndex, noteId: number) =>
        paneTabs?.[pane].tabs.tabs.find(note => note.id === noteId)?.name, [paneTabs])

    const accessibility = buildDndAccessibility(entry => {
        const tab = parseTabDndId(entry.id)
        if (tab) return noteName(tab.pane, tab.noteId)
        const bar = parseBarDndId(entry.id)
        return bar === null ? undefined : paneLabel(bar)
    }, { keyboard: false })

    const updateHover = (next: TabHover | null) => {
        hoverRef.current = next
        setHover(prev => prev?.pane === next?.pane && prev?.overId === next?.overId && prev?.zone === next?.zone ? prev : next)
    }

    const handleDragStart = (event: DragStartEvent) => setDragging(parseTabDndId(event.active.id))

    const handleDragMove = (event: DragMoveEvent) => {
        const { over, active, activatorEvent, delta } = event
        const origin = activatorEvent as { clientX?: number } | null
        if (!over || over.id === active.id || typeof origin?.clientX !== "number") return updateHover(null)
        const tab = parseTabDndId(over.id)
        if (tab) return updateHover({ pane: tab.pane, overId: tab.noteId, zone: computeTabZone(over.rect, origin.clientX + delta.x) })
        const bar = parseBarDndId(over.id)
        updateHover(bar === null ? null : { pane: bar, overId: null, zone: "after" })
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const from = parseTabDndId(event.active.id)
        const current = hoverRef.current
        setDragging(null)
        updateHover(null)
        if (!from || !paneTabs) return
        const drop = resolveTabDrop([paneTabs[0].tabs.tabs.map(n => n.id), paneTabs[1].tabs.tabs.map(n => n.id)], from.pane, from.noteId, current)
        if (!drop) return
        if (drop.kind === "reorder") return paneTabs[drop.pane].actions.reorderTabs(drop.from, drop.to)
        moveToPane(drop.noteId, drop.toPane, drop.index)
        const name = noteName(drop.fromPane, drop.noteId)
        if (name) announce(t("dnd.tabMovedToPane", { name, pane: paneLabel(drop.toPane) }))
    }

    const handleDragCancel = () => {
        setDragging(null)
        updateHover(null)
    }

    const value = useMemo<TabsDndContextType>(() => ({ hover, dragging }), [hover, dragging])
    const draggedNote = dragging ? paneTabs?.[dragging.pane].tabs.tabs.find(note => note.id === dragging.noteId) : undefined

    return (
        <TabsDndContext.Provider value={value}>
            <DndContext
                sensors={sensors}
                accessibility={accessibility}
                collisionDetection={collisionDetection}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                {children}
                {/* The tab follows the pointer outside the bar (which scrolls and clips its tabs) */}
                <DragOverlay dropAnimation={null}>
                    {draggedNote && (
                        <div
                            data-testid="tab-drag-overlay"
                            className="relative flex min-h-[42px] min-w-28 max-w-60 items-center border border-primary bg-background px-2 text-sm font-medium shadow-md"
                        >
                            {draggedNote.color && <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: draggedNote.color }} />}
                            <span className="block truncate">{draggedNote.name}</span>
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </TabsDndContext.Provider>
    )
}
