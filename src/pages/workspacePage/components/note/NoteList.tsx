import { useRef, useState } from "react"
import {
    DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
    type CollisionDetection, type DragMoveEvent,
} from "@dnd-kit/core"
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers"
import { CSS } from "@dnd-kit/utilities"
import { useTabs, useTabsActions } from "@/contexts/use-tabs"
import { useTranslation } from "react-i18next"
import { buildDndAccessibility } from "@/lib/dnd-accessibility"
import { cn } from "@/lib/utils"
import { NoteHeader } from "./NoteHeader"
import { computeTabMove, computeTabZone, type TabZone } from "./tab-reorder"
import type { Note } from "@/types/types"

type Hover = { overId: number, zone: TabZone } | null

// Only the horizontal position matters: the tab under the pointer's x wins, whatever the y
const collisionDetection: CollisionDetection = ({ droppableContainers, droppableRects, pointerCoordinates }) => {
    if (!pointerCoordinates) return []
    for (const container of droppableContainers) {
        const rect = droppableRects.get(container.id)
        if (rect && pointerCoordinates.x >= rect.left && pointerCoordinates.x <= rect.right)
            return [{ id: container.id }]
    }
    return []
}

const Tab = ({ note, hover }: { note: Note, hover: Hover }) => {
    const { setNodeRef: setDropRef } = useDroppable({ id: note.id })
    const { setNodeRef: setDragRef, listeners, transform, isDragging } = useDraggable({ id: note.id })
    const indicator = hover?.overId === note.id ? hover.zone : null

    return (
        <div
            ref={node => {
                setDropRef(node)
                setDragRef(node)
            }}
            {...listeners}
            style={{ transform: CSS.Translate.toString(transform) }}
            className={cn("relative", isDragging && "z-10 opacity-70")}
        >
            {indicator && !isDragging &&
                <div className={cn("pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-primary", indicator === "before" ? "left-0" : "right-0")} />}
            <NoteHeader note={note} />
        </div>
    )
}

export const NoteList = () => {
    useTranslation() // re-renders on language change so the screen reader texts follow it
    const { tabs } = useTabs()
    const { reorderTabs } = useTabsActions()
    const [hover, setHover] = useState<Hover>(null)
    const hoverRef = useRef<Hover>(null)

    // A small distance keeps plain clicks (open / close tab) working
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    const accessibility = buildDndAccessibility(entry => tabs.find(tab => tab.id === entry.id)?.name, { keyboard: false })

    const updateHover = (next: Hover) => {
        hoverRef.current = next
        setHover(prev => prev?.overId === next?.overId && prev?.zone === next?.zone ? prev : next)
    }

    const handleDragMove = (event: DragMoveEvent) => {
        const { over, active, activatorEvent, delta } = event
        const origin = activatorEvent as { clientX?: number } | null
        if (!over || over.id === active.id || typeof origin?.clientX !== "number") return updateHover(null)
        updateHover({ overId: Number(over.id), zone: computeTabZone(over.rect, origin.clientX + delta.x) })
    }

    const handleDragEnd = (activeId: number) => {
        const current = hoverRef.current
        updateHover(null)
        if (!current) return
        const move = computeTabMove(tabs.map(tab => tab.id), activeId, current.overId, current.zone)
        if (move) reorderTabs(move.from, move.to)
    }

    return (
        <DndContext
            sensors={sensors}
            accessibility={accessibility}
            modifiers={[restrictToHorizontalAxis]}
            collisionDetection={collisionDetection}
            onDragMove={handleDragMove}
            onDragEnd={event => handleDragEnd(Number(event.active.id))}
            onDragCancel={() => updateHover(null)}
        >
            <div className="flex shrink-0 w-full overflow-x-auto overflow-y-hidden bg-secondary divide-x-1">
                {tabs.map(note => <Tab key={note.id} note={note} hover={hover} />)}
            </div>
        </DndContext>
    )
}
