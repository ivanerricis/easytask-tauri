import { useRef, useState, type KeyboardEvent } from "react"
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
import { DropLine } from "../sidebar/DropLine"
import { computeTabMove, computeTabZone, pickTabByX, type TabZone } from "./tab-reorder"
import type { Note } from "@/types/types"

type Hover = { overId: number, zone: TabZone } | null

// Only the horizontal position matters: the tab under the pointer's x wins, whatever the y.
// Past either end of the bar the first / last tab wins, so a tab can be dropped at the very start or end.
const collisionDetection: CollisionDetection = ({ droppableContainers, droppableRects, pointerCoordinates }) => {
    if (!pointerCoordinates) return []
    const tabs = droppableContainers.flatMap(container => {
        const rect = droppableRects.get(container.id)
        return rect ? [{ id: container.id, left: rect.left, right: rect.right }] : []
    })
    const id = pickTabByX(tabs, pointerCoordinates.x)
    return id === null ? [] : [{ id }]
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
            {!isDragging && <DropLine zone={indicator} vertical className="z-20" />}
            <NoteHeader note={note} />
        </div>
    )
}

export const NoteList = () => {
    const { t } = useTranslation()
    const { tabs } = useTabs()
    const { reorderTabs, activateNote } = useTabsActions()
    const listRef = useRef<HTMLDivElement>(null)
    const [hover, setHover] = useState<Hover>(null)
    const hoverRef = useRef<Hover>(null)

    // A small distance keeps plain clicks (open / close tab) working
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    const accessibility = buildDndAccessibility(entry => tabs.find(tab => tab.id === entry.id)?.name, { keyboard: false })

    // Arrows, Home and End move between the tabs (roving tabindex: only the active tab is in the tab order)
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement
        if (target.getAttribute("role") !== "tab" || tabs.length === 0) return
        const index = tabs.findIndex(note => String(note.id) === target.dataset.noteId)
        if (index < 0) return
        const next = e.key === "ArrowRight" ? (index + 1) % tabs.length
            : e.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
                : e.key === "Home" ? 0
                    : e.key === "End" ? tabs.length - 1
                        : null
        if (next === null) return
        e.preventDefault()
        const note = tabs[next]
        activateNote(note.id)
        listRef.current?.querySelector<HTMLElement>(`[role="tab"][data-note-id="${note.id}"]`)?.focus()
    }

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
            {/* The line under the tabs: drawn by every inactive tab and, as an inset shadow, by the empty part of the bar.
                The active tab paints over it, so it opens onto the note below. */}
            <div ref={listRef} role="tablist" aria-label={t("notes.openTabs")} onKeyDown={handleKeyDown} className="flex shrink-0 w-full overflow-x-auto overflow-y-hidden bg-secondary divide-x-1 shadow-[inset_0_-1px_0_0_var(--color-primary)]">
                {tabs.map(note => <Tab key={note.id} note={note} hover={hover} />)}
            </div>
        </DndContext>
    )
}
