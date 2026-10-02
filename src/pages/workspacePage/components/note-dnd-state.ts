import i18n from "@/i18n"
import { createContext, useCallback, useContext } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { reportError } from "@/lib/report-error"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { getErrorMessage } from "@/lib/utils"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { captureSectionPlace, captureTaskPlace, makeLabel } from "@/contexts/undo/commands"
import { getGroupLabel } from "./groups/group-label"
import type { Group } from "@/types/types"
import type { UndoCommand } from "@/contexts/undo/stack"
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
    const { applySectionMove, applySectionMoveToNewGroup, applyTaskMove, getNoteTree } = useActiveNoteActions()
    const recorder = useUndoRecorder()

    const moveSectionTo = useCallback((sectionId: number, target: SectionTarget) => recorder.track((async () => {
        const from = captureSectionPlace(getNoteTree(), sectionId)
        const rollback = target.type === "group" ? applySectionMove(sectionId, target.groupId, target.index) : null
        try {
            if (target.type === "group") {
                await moveSection(sectionId, target.groupId, target.index)
                if (from) recorder.sectionMove(sectionId, from.name, from, { groupId: target.groupId, index: target.index })
            } else {
                // The new group only exists once the write is done; without its id the note is reloaded in background
                const groupId = await moveSectionToNewGroup(sectionId, target.index)
                applySectionMoveToNewGroup(sectionId, groupId, target.index)
                if (from && Number.isInteger(groupId)) recorder.sectionMoveToNewGroup(sectionId, from.name, groupId, from)
            }
        } catch (err) {
            rollback?.()
            reportError(err, getErrorMessage(err))
        }
    })()), [moveSection, moveSectionToNewGroup, applySectionMove, applySectionMoveToNewGroup, getNoteTree, recorder])

    const moveTaskTo = useCallback((taskId: number, target: TaskTarget) => recorder.track((async () => {
        const destination = { sectionId: target.sectionId, parentTaskId: target.parentTaskId }
        const from = captureTaskPlace(getNoteTree(), taskId)
        const rollback = applyTaskMove(taskId, destination, target.index)
        try {
            await moveTask(taskId, destination, target.index)
            if (from) recorder.taskMove(taskId, from.name, from, target)
        } catch (err) {
            rollback()
            reportError(err, getErrorMessage(err))
        }
    })()), [moveTask, applyTaskMove, getNoteTree, recorder])

    return { moveSectionTo, moveTaskTo }
}

/**
 * Moves a group to a new index among the groups: optimistic update of the note data, rolled back when
 * saving the positions fails.
 * @category Note DnD
 */
export function useGroupMoves() {
    const { updateGroupsPositions } = useWorkspaceActions()
    const { setNoteDataTree, getNoteTree } = useActiveNoteActions()
    const recorder = useUndoRecorder()

    /** Moves the group on the latest data of the open note (also used by undo/redo); rejects when it cannot be moved. */
    const applyGroupMove = useCallback(async (groupId: number, index: number) => {
        const tree = getNoteTree()
        const updatedGroups = tree ? moveGroupInList(tree.groups, groupId, index) : null
        if (!tree || !updatedGroups) throw new Error(i18n.t("undo.errors.unavailable"))

        setNoteDataTree({ groups: updatedGroups })
        try {
            await updateGroupsPositions(updatedGroups)
        } catch (error) {
            setNoteDataTree(tree)
            throw error
        }
    }, [getNoteTree, setNoteDataTree, updateGroupsPositions])

    const moveGroupTo = useCallback(async (groupId: number, index: number) => {
        const tree = getNoteTree()
        if (!tree || !moveGroupInList(tree.groups, groupId, index)) return
        const ordered = [...tree.groups].sort((a, b) => a.position - b.position)
        const fromIndex = ordered.findIndex(group => group.id === groupId)
        const group: Group = ordered[fromIndex]

        try {
            await applyGroupMove(groupId, index)
        } catch (error) {
            reportError(error, i18n.t("errors.moveGroup"))
            return
        }
        const command: UndoCommand = {
            label: makeLabel("move", "section_group", group.name?.trim() || getGroupLabel(group, fromIndex)),
            undo: () => applyGroupMove(groupId, fromIndex),
            redo: () => applyGroupMove(groupId, index),
        }
        recorder.record(command)
    }, [getNoteTree, applyGroupMove, recorder])

    return { moveGroupTo }
}
