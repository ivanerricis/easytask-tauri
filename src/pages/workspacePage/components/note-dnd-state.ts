import { createContext, useCallback, useContext } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { toast } from "sonner"
import { useWorkspaceActions } from "@/contexts/workspace-data-context"
import { useActiveNote, useActiveNoteActions } from "@/contexts/active-note-context"
import { getErrorMessage } from "@/lib/utils"
import {
    ACCEPTS, moveGroupInList,
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
 * The cached note data is updated at once and restored if the write fails (errors are shown with a toast (sonner)).
 * A section moved into a NEW group is applied once the write returns the id of the new group (background reload if it is missing).
 * @category Note DnD
 */
export function useNoteMoves() {
    const { moveSection, moveSectionToNewGroup, moveTask } = useWorkspaceActions()
    const { applySectionMove, applySectionMoveToNewGroup, applyTaskMove } = useActiveNoteActions()

    const moveSectionTo = useCallback(async (sectionId: number, target: SectionTarget) => {
        const rollback = target.type === "group" ? applySectionMove(sectionId, target.groupId, target.index) : null
        try {
            if (target.type === "group") await moveSection(sectionId, target.groupId, target.index)
            else {
                // The new group only exists once the write is done; without its id the note is reloaded in background
                const groupId = await moveSectionToNewGroup(sectionId, target.index)
                applySectionMoveToNewGroup(sectionId, groupId, target.index)
            }
        } catch (err) {
            rollback?.()
            toast.error(getErrorMessage(err))
        }
    }, [moveSection, moveSectionToNewGroup, applySectionMove, applySectionMoveToNewGroup])

    const moveTaskTo = useCallback(async (taskId: number, target: TaskTarget) => {
        const destination = { sectionId: target.sectionId, parentTaskId: target.parentTaskId }
        const rollback = applyTaskMove(taskId, destination, target.index)
        try {
            await moveTask(taskId, destination, target.index)
        } catch (err) {
            rollback()
            toast.error(getErrorMessage(err))
        }
    }, [moveTask, applyTaskMove])

    return { moveSectionTo, moveTaskTo }
}

/**
 * Moves a group to a new index among the groups: optimistic update of the note data, rolled back when
 * saving the positions fails.
 * @category Note DnD
 */
export function useGroupMoves() {
    const { updateGroupsPositions } = useWorkspaceActions()
    const { noteDataTree } = useActiveNote()
    const { setNoteDataTree } = useActiveNoteActions()

    const moveGroupTo = useCallback(async (groupId: number, index: number) => {
        if (!noteDataTree) return
        const updatedGroups = moveGroupInList(noteDataTree.groups, groupId, index)
        if (!updatedGroups) return

        setNoteDataTree({ groups: updatedGroups })
        try {
            await updateGroupsPositions(updatedGroups)
        } catch (error) {
            console.error("Errore durante l'aggiornamento delle posizioni dei gruppi:", error)
            setNoteDataTree(noteDataTree)
        }
    }, [noteDataTree, setNoteDataTree, updateGroupsPositions])

    return { moveGroupTo }
}
