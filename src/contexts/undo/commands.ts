import i18n from "@/i18n"
import { reportError } from "@/lib/report-error"
import type { DBItemType } from "@/db/queries/shared_queries"
import type { TaskMoveTarget } from "@/db/queries/move"
import type { NoteDataTree, WorkspaceDataTree } from "@/types/types"
import type { WorkspaceActionsType } from "../workspace-data"
import type { ActiveNoteActionsType } from "../active-note-context-object"
import { findSection, findTask } from "../note-tree-ops"
import { findTreeItem, type TreeItemType } from "../workspace-tree-ops"
import type { UndoCommand } from "./stack"

/**
 * What the commands need from the rest of the app. Everything is stable (the actions never change identity), so a
 * command stays valid after the component that recorded it has unmounted.
 * @category Undo
 */
export type UndoDeps = {
    /** The workspace the history belongs to (null outside a workspace). */
    getWorkspaceId: () => number | null
    workspace: Pick<WorkspaceActionsType,
        "renameItem" | "updateItemColor" | "deleteItem" | "restoreItem" | "moveTreeItem" | "moveSection" | "moveTask" |
        "updateTaskCompletion" | "updateTaskPriority" | "updateTaskDescription" | "getWorkspaceData">
    note: Pick<ActiveNoteActionsType,
        "patchTask" | "patchSection" | "patchGroup" | "removeGroup" | "removeSection" | "removeTask" |
        "applySectionMove" | "applyTaskMove" | "refreshActiveNote">
}

/** The types of item whose actions are undoable (folders and notes live in the sidebar tree, the others in the open note). */
export type UndoItemType = "folder" | "note" | "section_group" | "section" | "task"

const UNDOABLE: readonly DBItemType[] = ["folder", "note", "section_group", "section", "task"]

/** Whether the actions on this type of item can be undone. */
export const isUndoableType = (itemType: DBItemType): itemType is UndoItemType => UNDOABLE.includes(itemType)

const isTreeType = (itemType: UndoItemType): itemType is TreeItemType => itemType === "folder" || itemType === "note"

/** Where a folder or a note sits: the parent folder (null = workspace root) and the index among its siblings of the same type. */
export type TreePlace = { folderId: number | null, index: number }
/** Where a section sits in the open note. */
export type SectionPlace = { groupId: number, index: number }
/** Where a task sits in the open note: a section (top level, parentTaskId null) or under another task. */
export type TaskPlace = { sectionId: number, parentTaskId: number | null, index: number }

const NAME_MAX = 40

const shorten = (name: string | null | undefined) => {
    const value = (name ?? "").replace(/\s+/g, " ").trim()
    return value.length > NAME_MAX ? `${value.slice(0, NAME_MAX - 1)}…` : value
}

const typeName = (itemType: DBItemType) => i18n.t(`undo.itemTypes.${itemType}`)

type LabelKey = "rename" | "color" | "complete" | "reopen" | "addPriority" | "removePriority" | "description" | "delete" | "create" | "move"

/** The translated description of an action on an item, with the (shortened) name of the item when it has one. */
export function makeLabel(key: LabelKey, itemType: DBItemType, name: string | null | undefined): string {
    const label = i18n.t(`undo.labels.${key}`, { type: typeName(itemType) })
    const short = shorten(name)
    return short ? i18n.t("undo.named", { label, name: short }) : label
}

/** The display name of an item of any type (name, section title or task text). */
export function getItemName(item: object): string | undefined {
    const { name, title, text } = item as { name?: string | null, title?: string, text?: string }
    return name ?? title ?? text ?? undefined
}

/** Where a folder or a note currently sits in the sidebar tree. */
export function captureTreePlace(tree: WorkspaceDataTree | null | undefined, itemType: TreeItemType, id: number): (TreePlace & { name: string }) | null {
    const found = tree ? findTreeItem(tree, itemType, id) : undefined
    return found ? { folderId: found.parentId, index: found.index, name: found.item.name } : null
}

/** Where a section currently sits in the note. */
export function captureSectionPlace(tree: NoteDataTree | null | undefined, sectionId: number): (SectionPlace & { name: string }) | null {
    const found = tree ? findSection(tree, sectionId) : undefined
    return found ? { groupId: found.groupId, index: found.index, name: found.section.title } : null
}

/** Where a task currently sits in the note. */
export function captureTaskPlace(tree: NoteDataTree | null | undefined, taskId: number): (TaskPlace & { name: string }) | null {
    const found = tree ? findTask(tree, taskId) : undefined
    if (!found) return null
    const sectionId = "parentTaskId" in found.parent ? found.task.sectionID : found.parent.sectionId
    if (sectionId === null) return null
    return {
        sectionId,
        parentTaskId: "parentTaskId" in found.parent ? found.parent.parentTaskId : null,
        index: found.index,
        name: found.task.text,
    }
}

/**
 * Builds the commands (an action and its inverse, both on stable ids) of every undoable user action.
 * Every inverse applies the same optimistic update as the original action, so no full reload is needed, and
 * rolls it back when the write fails (the error then reaches the history, which reports it).
 * @category Undo
 */
export function createUndoCommands(deps: UndoDeps) {
    const { workspace, note, getWorkspaceId } = deps

    /** A failed refresh must not turn an applied change into a failed command. */
    const reloadTree = async () => {
        const workspaceId = getWorkspaceId()
        if (workspaceId === null) return
        try {
            await workspace.getWorkspaceData(workspaceId)
        } catch (error) {
            reportError(error, i18n.t("errors.refreshTree"))
        }
    }
    const reloadNote = async () => {
        try {
            await note.refreshActiveNote()
        } catch (error) {
            reportError(error, i18n.t("errors.refreshNote"))
        }
    }

    /** Applies a rename/color change to the cached note data (folders and notes are patched by the workspace actions). */
    const patchNoteItem = (itemType: UndoItemType, id: number, key: "name" | "color", value: string | null) => {
        if (itemType === "task") return note.patchTask(id, key === "name" ? { text: value ?? "" } : { color: value })
        if (itemType === "section") return note.patchSection(id, key === "name" ? { title: value ?? "" } : { color: value })
        if (itemType === "section_group") return note.patchGroup(id, key === "name" ? { name: value?.trim() || null } : { color: value })
        return null
    }

    const removeFromNote = (itemType: UndoItemType, id: number) => {
        if (itemType === "section_group") return note.removeGroup(id)
        if (itemType === "section") return note.removeSection(id)
        if (itemType === "task") return note.removeTask(id)
        return null
    }

    /** Soft delete with the same optimistic removal as the delete dialog (folders and notes are removed by deleteItem). */
    const removeItem = async (itemType: UndoItemType, id: number) => {
        const rollback = removeFromNote(itemType, id)
        try {
            await workspace.deleteItem(itemType, id)
        } catch (error) {
            rollback?.()
            throw error
        }
    }

    /** Restores from the trash (the ids are the same, so every reference stays valid) and reloads what changed. */
    const restoreItem = async (itemType: UndoItemType, id: number) => {
        await workspace.restoreItem(itemType, id)
        if (isTreeType(itemType)) await reloadTree()
        else await reloadNote()
    }

    const setName = (itemType: UndoItemType, id: number) => async (name: string) => {
        const rollback = patchNoteItem(itemType, id, "name", name)
        try {
            await workspace.renameItem(itemType, id, name)
        } catch (error) {
            rollback?.()
            throw error
        }
    }

    const setColor = (itemType: UndoItemType, id: number) => async (color: string | null) => {
        const rollback = patchNoteItem(itemType, id, "color", color)
        try {
            await workspace.updateItemColor(itemType, id, color ?? undefined)
        } catch (error) {
            rollback?.()
            throw error
        }
    }

    const moveTreeTo = (itemType: TreeItemType, id: number) => async (place: TreePlace) => {
        await workspace.moveTreeItem(itemType, id, place.folderId, place.index)
        await reloadTree()
    }

    const moveSectionTo = async (sectionId: number, groupId: number, index: number) => {
        const rollback = note.applySectionMove(sectionId, groupId, index)
        try {
            await workspace.moveSection(sectionId, groupId, index)
        } catch (error) {
            rollback()
            throw error
        }
    }

    const moveTaskTo = async (taskId: number, target: TaskMoveTarget, index: number) => {
        const rollback = note.applyTaskMove(taskId, target, index)
        try {
            await workspace.moveTask(taskId, target, index)
        } catch (error) {
            rollback()
            throw error
        }
    }

    const setTaskFlag = (key: "completed" | "priority", taskId: number) => async (value: boolean) => {
        const rollback = note.patchTask(taskId, { [key]: value })
        try {
            if (key === "completed") await workspace.updateTaskCompletion(taskId, value)
            else await workspace.updateTaskPriority(taskId, value)
        } catch (error) {
            rollback()
            throw error
        }
    }

    const setTaskDescription = (taskId: number) => async (description: string) => {
        const rollback = note.patchTask(taskId, { description })
        try {
            await workspace.updateTaskDescription(taskId, description !== "" ? description : undefined)
        } catch (error) {
            rollback()
            throw error
        }
    }

    return {
        /** Rename of a folder, note, group, section or task. */
        rename: (itemType: UndoItemType, id: number, before: string, after: string): UndoCommand => {
            const apply = setName(itemType, id)
            return {
                label: makeLabel("rename", itemType, before),
                undo: () => apply(before),
                redo: () => apply(after),
            }
        },

        /** Color change (null = no color). */
        color: (itemType: UndoItemType, id: number, name: string | null | undefined, before: string | null | undefined, after: string | null | undefined): UndoCommand => {
            const apply = setColor(itemType, id)
            return {
                label: makeLabel("color", itemType, name),
                undo: () => apply(before ?? null),
                redo: () => apply(after ?? null),
            }
        },

        taskCompletion: (taskId: number, name: string, before: boolean, after: boolean): UndoCommand => {
            const apply = setTaskFlag("completed", taskId)
            return {
                label: makeLabel(after ? "complete" : "reopen", "task", name),
                undo: () => apply(before),
                redo: () => apply(after),
            }
        },

        taskPriority: (taskId: number, name: string, before: boolean, after: boolean): UndoCommand => {
            const apply = setTaskFlag("priority", taskId)
            return {
                label: makeLabel(after ? "addPriority" : "removePriority", "task", name),
                undo: () => apply(before),
                redo: () => apply(after),
            }
        },

        taskDescription: (taskId: number, name: string, before: string, after: string): UndoCommand => {
            const apply = setTaskDescription(taskId)
            return {
                label: makeLabel("description", "task", name),
                undo: () => apply(before),
                redo: () => apply(after),
            }
        },

        /** Move to the trash: undone by restoring the item, with the same id and the same position. */
        remove: (itemType: UndoItemType, id: number, name: string | null | undefined): UndoCommand => ({
            label: makeLabel("delete", itemType, name),
            undo: () => restoreItem(itemType, id),
            redo: () => removeItem(itemType, id),
        }),

        /** Creation: undone by moving the new item to the trash, redone by restoring it (the id never changes). */
        create: (itemType: UndoItemType, id: number, name: string | null | undefined): UndoCommand => ({
            label: makeLabel("create", itemType, name),
            undo: () => removeItem(itemType, id),
            redo: () => restoreItem(itemType, id),
        }),

        /** Move of a folder or a note in the sidebar tree. */
        treeMove: (itemType: TreeItemType, id: number, name: string, from: TreePlace, to: TreePlace): UndoCommand => {
            const apply = moveTreeTo(itemType, id)
            return {
                label: makeLabel("move", itemType, name),
                undo: () => apply(from),
                redo: () => apply(to),
            }
        },

        /** Move of a section into another group (or elsewhere in its group). */
        sectionMove: (sectionId: number, name: string, from: SectionPlace, to: SectionPlace): UndoCommand => ({
            label: makeLabel("move", "section", name),
            undo: () => moveSectionTo(sectionId, from.groupId, from.index),
            redo: () => moveSectionTo(sectionId, to.groupId, to.index),
        }),

        /**
         * Move of a section into a group that the move itself created (`newGroupId`): undone by moving the section back
         * and trashing the empty group, redone by restoring the same group and moving the section into it.
         */
        sectionMoveToNewGroup: (sectionId: number, name: string, newGroupId: number, from: SectionPlace): UndoCommand => ({
            label: makeLabel("move", "section", name),
            undo: async () => {
                await moveSectionTo(sectionId, from.groupId, from.index)
                await removeItem("section_group", newGroupId)
            },
            redo: async () => {
                await workspace.restoreItem("section_group", newGroupId)
                await workspace.moveSection(sectionId, newGroupId, 0)
                await reloadNote()
            },
        }),

        /** Move of a task (with its subtasks) to another section or parent task. */
        taskMove: (taskId: number, name: string, from: TaskPlace, to: TaskPlace): UndoCommand => ({
            label: makeLabel("move", "task", name),
            undo: () => moveTaskTo(taskId, { sectionId: from.sectionId, parentTaskId: from.parentTaskId }, from.index),
            redo: () => moveTaskTo(taskId, { sectionId: to.sectionId, parentTaskId: to.parentTaskId }, to.index),
        }),
    }
}

export type UndoCommands = ReturnType<typeof createUndoCommands>

type RecorderOf<T> = { [K in keyof T]: T[K] extends (...args: infer A) => UndoCommand ? (...args: A) => void : never }

/** The same builders, but each call also records the command in the history. */
export type UndoRecorder = RecorderOf<UndoCommands> & {
    /** Records a command built by the caller (for the actions that need the state of their own component). */
    record: (command: UndoCommand) => void
    /** Marks a write that records its command when it ends, so that an undo asked meanwhile waits for it. */
    track: <T>(write: Promise<T>) => Promise<T>
}

/** Wraps the builders so that every call records the command. */
export function createUndoRecorder(commands: UndoCommands, record: (command: UndoCommand) => void, track: UndoRecorder["track"] = write => write): UndoRecorder {
    const entries = Object.entries(commands).map(([name, build]) =>
        [name, (...args: never[]) => record((build as (...a: never[]) => UndoCommand)(...args))] as const)
    return { ...Object.fromEntries(entries), record, track } as UndoRecorder
}

/** A recorder that does nothing (outside an UndoProvider, e.g. in isolated component tests). */
const noop = () => {}
export const NOOP_RECORDER: UndoRecorder = {
    rename: noop, color: noop, taskCompletion: noop, taskPriority: noop, taskDescription: noop, remove: noop, create: noop,
    treeMove: noop, sectionMove: noop, sectionMoveToNewGroup: noop, taskMove: noop, record: noop, track: write => write,
}
