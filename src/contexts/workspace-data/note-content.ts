import { useCallback, useMemo } from "react"
import type { Group } from "@/types/types"
import { createDBSection, createDBSectionInGroup } from "@/db/queries/section"
import { createDBGroup, updateDBGroupPositions } from "@/db/queries/group"
import { moveDBSection, moveDBSectionToNewGroup } from "@/db/queries/move"
import type { Runtime, WorkspaceActionsType } from "./types"

type NoteContentActions = Pick<WorkspaceActionsType,
    "createGroup" | "createSection" | "createSectionInGroup" | "updateGroupsPositions" | "moveSection" | "moveSectionToNewGroup">

/**
 * Groups and sections of the open note. The creations resolve with the ids of the new rows (the callers build
 * the optimistic data with the active note actions), the moves do not reload anything.
 * @category WorkspaceData Context
 */
export function useNoteContentActions({ withLoading, withTrashChange }: Runtime): NoteContentActions {
    const createGroup = useCallback((noteID: number, name: string) =>
        withLoading(() => createDBGroup(noteID, name)), [withLoading])

    const createSection = useCallback((noteID: number, title: string, position: number) =>
        withLoading(() => createDBSection(noteID, title, position)), [withLoading])

    const createSectionInGroup = useCallback((groupID: number, title: string) =>
        withLoading(() => createDBSectionInGroup(groupID, title)), [withLoading])

    /**
     * Update the positions of multiple groups in the workspace.
     * @param newGroups - The array of groups to update positions for.
     * @throws Will throw an error if the group positions cannot be updated.
     * @category Workspace Data Context
     */
    const updateGroupsPositions = useCallback((newGroups: Group[]) =>
        withLoading(() => updateDBGroupPositions(newGroups)), [withLoading])

    /**
     * Moves a section to a group of the open note at the given index among its sections. The section keeps all
     * its tasks. A source group left empty is kept. It does NOT reload the data: the caller updates the active note.
     * @param sectionID - The ID of the section to move.
     * @param targetGroupID - The destination group ID (same note).
     * @param targetIndex - The index among the destination sections (clamped).
     * @throws Will throw an error if the move is invalid or the destination already has a section with the same title.
     * @category Workspace Data Context
     */
    const moveSection = useCallback((sectionID: number, targetGroupID: number, targetIndex: number) =>
        withTrashChange(() => moveDBSection(sectionID, targetGroupID, targetIndex)), [withTrashChange])

    /**
     * Moves a section into a new group created at the given index among the groups of the open note.
     * It does NOT reload the data: the caller updates the active note with the returned group id.
     * @param sectionID - The ID of the section to move.
     * @param groupPosition - The index of the new group among the current groups (clamped).
     * @returns The ID of the new group.
     * @category Workspace Data Context
     */
    const moveSectionToNewGroup = useCallback((sectionID: number, groupPosition: number) =>
        withTrashChange(() => moveDBSectionToNewGroup(sectionID, groupPosition)), [withTrashChange])

    return useMemo(() => ({ createGroup, createSection, createSectionInGroup, updateGroupsPositions, moveSection, moveSectionToNewGroup }), [ createGroup, createSection, createSectionInGroup, updateGroupsPositions, moveSection, moveSectionToNewGroup ])
}
