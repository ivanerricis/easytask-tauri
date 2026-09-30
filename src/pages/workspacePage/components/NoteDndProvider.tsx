import { useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import {
    DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
    type Collision, type CollisionDetection, type DragMoveEvent, type DragStartEvent,
} from "@dnd-kit/core"
import { useActiveNote } from "@/contexts/active-note-context"
import {
    computeDropZone, computeSectionTarget, computeTaskTarget, findSection, findTask,
    type DropZone, type NoteDragKind, type NoteDragRef, type NoteOverRef, type SectionTarget, type TaskTarget,
} from "./note-dnd"
import { NO_HOVER, NoteDndContext, noteKey, useNoteMoves, type NoteHover } from "./note-dnd-state"

type PendingDrop =
    | { kind: "section", id: number, target: SectionTarget }
    | { kind: "task", id: number, target: TaskTarget }

/**
 * The droppable under the pointer wins, the smallest one first (a task row beats its section card, a section card
 * beats its group). Only droppables that accept the dragged kind take part.
 */
const collisionDetection: CollisionDetection = ({ active, droppableContainers, droppableRects, pointerCoordinates }) => {
    const kind = active.data.current?.kind as NoteDragKind | undefined
    if (!kind || !pointerCoordinates) return []
    const hits: Collision[] = []
    for (const container of droppableContainers) {
        const accepts = container.data.current?.accepts as NoteDragKind[] | undefined
        const rect = droppableRects.get(container.id)
        if (!accepts?.includes(kind) || !rect) continue
        const { x, y } = pointerCoordinates
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue
        hits.push({ id: container.id, data: { droppableContainer: container, value: rect.width * rect.height } })
    }
    return hits.sort((a, b) => (a.data?.value as number) - (b.data?.value as number))
}

const getPointerY = (event: DragMoveEvent): number | null => {
    const origin = event.activatorEvent as { clientY?: number } | null
    if (origin && typeof origin.clientY === "number") return origin.clientY + event.delta.y
    const translated = event.active.rect.current.translated
    return translated ? translated.top + translated.height / 2 : null
}

/**
 * Drag & drop of sections and tasks inside the open note (dnd-kit), independent from the horizontal
 * reordering of the groups (@hello-pangea/dnd, its handle is the grip of the group header).
 * Drop zones, from the pointer position on the hovered element:
 * - section dragged over a section card: top half = before, bottom half = after (any group);
 * - section dragged over the empty area of a group (or its header): appended to the group;
 * - section dragged over a slot between two groups / the "Nuovo gruppo" column at the end: new group;
 * - task dragged over a task row: top 25% = before, bottom 25% = after, middle = inside (last subtask);
 *   for a task with subtasks the bottom 25% means "first subtask";
 * - task dragged over a section (header, empty body): last top level task of that section.
 * Invalid or no-op targets (e.g. a task under itself or its own descendant) show no indicator and do nothing.
 * @category Note DnD
 */
export const NoteDndProvider = ({ children }: { children: ReactNode }) => {
    const { noteDataTree } = useActiveNote()
    const { moveSectionTo, moveTaskTo } = useNoteMoves()
    const [active, setActive] = useState<NoteDragRef | null>(null)
    const [hover, setHover] = useState<NoteHover>(NO_HOVER)
    const pendingRef = useRef<PendingDrop | null>(null)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    const reset = () => {
        pendingRef.current = null
        setActive(null)
        setHover(NO_HOVER)
    }

    const handleDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current as NoteDragRef | undefined
        setActive(data ? { kind: data.kind, id: data.id } : null)
    }

    const handleDragMove = (event: DragMoveEvent) => {
        const dragged = event.active.data.current as NoteDragRef | undefined
        const over = event.over
        if (!dragged || !over || !noteDataTree) {
            pendingRef.current = null
            setHover(prev => prev === NO_HOVER ? prev : NO_HOVER)
            return
        }

        const overData = over.data.current as NoteOverRef
        const overRef: NoteOverRef = { kind: overData.kind, id: overData.id }
        let zone: DropZone = "inside"
        if (overRef.kind === "task" || overRef.kind === "section") {
            const pointerY = getPointerY(event)
            if (pointerY == null) return
            const overTask = overRef.kind === "task" ? findTask(noteDataTree, overRef.id) : undefined
            zone = computeDropZone(dragged.kind, overRef.kind, over.rect, pointerY, { hasSubtasks: (overTask?.subtasks.length ?? 0) > 0 })
        }

        let pending: PendingDrop | null = null
        if (dragged.kind === "section") {
            const target = computeSectionTarget(noteDataTree, dragged.id, overRef, zone)
            if (target) pending = { kind: "section", id: dragged.id, target }
        } else {
            const target = computeTaskTarget(noteDataTree, dragged.id, overRef, zone)
            if (target) pending = { kind: "task", id: dragged.id, target }
        }
        pendingRef.current = pending

        const next: NoteHover = pending ? { overKey: noteKey(overRef.kind, overRef.id), zone } : NO_HOVER
        setHover(prev => prev.overKey === next.overKey && prev.zone === next.zone ? prev : next)
    }

    const handleDragEnd = async () => {
        const pending = pendingRef.current
        reset()
        if (!pending) return
        if (pending.kind === "section") await moveSectionTo(pending.id, pending.target)
        else await moveTaskTo(pending.id, pending.target)
    }

    const state = useMemo(() => ({ active, hover }), [active, hover])

    const preview = useMemo(() => {
        if (!active || !noteDataTree) return null
        if (active.kind === "section") {
            const section = findSection(noteDataTree, active.id)
            return section ? (
                <div className="min-w-[250px] max-w-[320px] truncate rounded-xs border bg-accent p-2 text-sm shadow-lg">
                    {section.title}
                </div>
            ) : null
        }
        const task = findTask(noteDataTree, active.id)
        return task ? (
            <div className="max-w-[320px] truncate rounded-xs border bg-background p-2 text-sm shadow-lg">
                {task.text}
            </div>
        ) : null
    }, [active, noteDataTree])

    return (
        <NoteDndContext.Provider value={state}>
            <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onDragCancel={reset}
            >
                {children}
                {createPortal(<DragOverlay dropAnimation={null}>{preview}</DragOverlay>, document.body)}
            </DndContext>
        </NoteDndContext.Provider>
    )
}
