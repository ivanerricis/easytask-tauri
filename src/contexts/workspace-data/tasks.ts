import { useCallback, useMemo } from "react"
import { createDBSubTask, createDBTask, updateDBTaskCompletion, updateDBTaskDescription, updateDBTaskPriority } from "@/db/queries/task"
import { moveDBTask, type TaskMoveTarget } from "@/db/queries/move"
import type { Runtime, WorkspaceActionsType } from "./types"

type TaskActions = Pick<WorkspaceActionsType,
    "createTask" | "createSubTask" | "updateTaskPriority" | "updateTaskCompletion" | "updateTaskDescription" | "moveTask">

/**
 * Tasks and subtasks of the open note.
 * @category WorkspaceData Context
 */
export function useTaskActions({ withLoading, withTrashChange }: Runtime): TaskActions {
    const createTask = useCallback((sectionID: number, text: string) =>
        withLoading(() => createDBTask(sectionID, text)), [withLoading])

    const createSubTask = useCallback((taskID: number, text: string) =>
        withLoading(() => createDBSubTask(taskID, text)), [withLoading])

    /**
     * Edit the priority of a task.
     * @param taskID - The ID of the task to edit.
     * @param priority - The new priority state of the task.
     * @throws Will throw an error if the task cannot be edited.
     * @category Workspace Data Context
     */
    const updateTaskPriority = useCallback((taskID: number, priority: boolean) =>
        withLoading(() => updateDBTaskPriority(taskID, priority)), [withLoading])

    /**
     * Update the completion status of a task.
     * @param taskID - The ID of the task to edit.
     * @param isCompleted - The new completion status of the task.
     * @throws Will throw an error if the task cannot be edited.
     * @category Workspace Data Context
     */
    const updateTaskCompletion = useCallback((taskID: number, isCompleted: boolean) =>
        withLoading(() => updateDBTaskCompletion(taskID, isCompleted)), [withLoading])

    const updateTaskDescription = useCallback((taskID: number, description?: string) =>
        withLoading(() => updateDBTaskDescription(taskID, description)), [withLoading])

    /**
     * Moves a task (with its whole subtree) to a section of the open note, at the top level or under another task,
     * at the given index among its new siblings. It does NOT reload the data: the caller updates the active note.
     * @param taskID - The ID of the task to move.
     * @param target - The destination section and optional parent task.
     * @param targetIndex - The index among the destination siblings (clamped).
     * @throws Will throw an error if the target is invalid (e.g. the task itself or one of its descendants).
     * @category Workspace Data Context
     */
    const moveTask = useCallback((taskID: number, target: TaskMoveTarget, targetIndex: number) =>
        withTrashChange(() => moveDBTask(taskID, target, targetIndex)), [withTrashChange])

    return useMemo(() => ({ createTask, createSubTask, updateTaskPriority, updateTaskCompletion, updateTaskDescription, moveTask }), [ createTask, createSubTask, updateTaskPriority, updateTaskCompletion, updateTaskDescription, moveTask ])
}
