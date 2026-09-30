import { createContext, useCallback, useContext } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { toast } from "sonner"
import { useWorkspaceActions } from "@/contexts/workspace-data-context"
import { useActiveNoteActions } from "@/contexts/active-note-context"
import { getErrorMessage } from "@/lib/utils"
import {
    ACCEPTS,
    type DropZone, type NoteDragKind, type NoteDragRef, type NoteOverKind, type SectionTarget, type TaskTarget,
} from "./note-dnd"

/**
 * Hover state shared by the droppables while dragging: the key of the droppable under the pointer
 * (null when the drop would be invalid or a no-op) and the drop zone inside it.
 * @category Note DnD
 */
export type NoteHover = { overKey: string | null, zone: DropZone | null }
export type NoteDndState = { active: NoteDragRef | null, hover: NoteHover }

export const NO_HOVER: NoteHover = { overKey: null, zone: null }

export const NoteDndContext = createContext<NoteDndState>({ active: null, hover: NO_HOVER })

/** Droppable key of a target, also used as dnd-kit id. */
export const noteKey = (kind: NoteOverKind, id: number) => `${kind}-${id}`

/**
 * Registers a droppable of the note view. Returns the ref to attach and the drop zone currently
 * highlighted on it (null when it is not the active target).
 * @category Note DnD
 */
export function useNoteDrop(kind: NoteOverKind, id: number) {
    const key = noteKey(kind, id)
    const { setNodeRef } = useDroppable({ id: key, data: { kind, id, accepts: ACCEPTS[kind] } })
    const { active, hover } = useContext(NoteDndContext)
    return { setNodeRef, zone: hover.overKey === key ? hover.zone : null, active }
}

/**
 * Registers a draggable (section or task) whose activator is a separate drag handle.
 * The whole item is dimmed while it is dragged (the preview is rendered by the DragOverlay).
 * @category Note DnD
 */
export function useNoteDrag(kind: NoteDragKind, id: number) {
    const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging } =
        useDraggable({ id: `drag-${kind}-${id}`, data: { kind, id } })
    return { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging }
}

/**
 * Applies a computed move to the open note. Used by the drag & drop and by the "Sposta in…" menus.
 * Every move calls the context method and then ALWAYS reloads the note data (`refreshActiveNote`), also on error,
 * so the UI reflects the database; errors are shown with a toast (sonner).
 * @category Note DnD
 */
export function useNoteMoves() {
    const { moveSection, moveSectionToNewGroup, moveTask } = useWorkspaceActions()
    const { refreshActiveNote } = useActiveNoteActions()

    const reload = useCallback(async () => {
        try {
            await refreshActiveNote()
        } catch (err) {
            console.error(err)
        }
    }, [refreshActiveNote])

    const moveSectionTo = useCallback(async (sectionId: number, target: SectionTarget) => {
        try {
            if (target.type === "group") await moveSection(sectionId, target.groupId, target.index)
            else await moveSectionToNewGroup(sectionId, target.index)
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
        await reload()
    }, [moveSection, moveSectionToNewGroup, reload])

    const moveTaskTo = useCallback(async (taskId: number, target: TaskTarget) => {
        try {
            await moveTask(taskId, { sectionId: target.sectionId, parentTaskId: target.parentTaskId }, target.index)
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
        await reload()
    }, [moveTask, reload])

    return { moveSectionTo, moveTaskTo }
}
