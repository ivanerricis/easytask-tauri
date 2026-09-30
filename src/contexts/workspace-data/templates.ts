import { useCallback, useMemo } from "react"
import { countDBTemplates, createDBNoteFromTemplate, createDBTemplateFromNote, getDBTemplates, updateDBTemplateFromNote } from "@/db/queries/template"
import type { Runtime, WorkspaceActionsType } from "./types"

type TemplateActions = Pick<WorkspaceActionsType,
    "getTemplates" | "countTemplates" | "createTemplateFromNote" | "updateTemplateFromNote" | "createNoteFromTemplate">

/**
 * Note templates. Every write bumps templatesVersion.
 * @category WorkspaceData Context
 */
export function useTemplateActions({ withLoading, setTemplatesVersion }: Runtime): TemplateActions {
    /**
     * Retrieves the templates of a workspace. Does not touch the context state.
     * @param workspaceID - The ID of the workspace.
     * @category Workspace Data Context
     */
    const getTemplates = useCallback((workspaceID: number) =>
        withLoading(() => getDBTemplates(workspaceID)), [withLoading])

    /**
     * Counts the templates of a workspace (for the footer badge).
     * @param workspaceID - The ID of the workspace.
     * @category Workspace Data Context
     */
    const countTemplates = useCallback((workspaceID: number) =>
        withLoading(() => countDBTemplates(workspaceID)), [withLoading])

    /**
     * Creates a template from a note (an exact snapshot of its current content).
     * @param noteID - The ID of the source note.
     * @param name - The template name (unique in the workspace).
     * @returns The ID of the new template.
     * @throws Will throw an error on a name clash or when the note no longer exists.
     * @category Workspace Data Context
     */
    const createTemplateFromNote = useCallback((noteID: number, name: string) => withLoading(async () => {
        const id = await createDBTemplateFromNote(noteID, name)
        setTemplatesVersion(version => version + 1)
        return id
    }), [withLoading, setTemplatesVersion])

    /**
     * Refreshes the snapshot of a template from its source note.
     * @param templateID - The ID of the template.
     * @throws Will throw an error when the source note no longer exists.
     * @category Workspace Data Context
     */
    const updateTemplateFromNote = useCallback((templateID: number) => withLoading(async () => {
        await updateDBTemplateFromNote(templateID)
        setTemplatesVersion(version => version + 1)
    }), [withLoading, setTemplatesVersion])

    /**
     * Creates a note from a template at the end of the destination. Does NOT reload the data:
     * the caller must call getWorkspaceData and can then open the note.
     * @param templateID - The ID of the template.
     * @param workspaceID - The ID of the workspace.
     * @param folderID - The destination folder, null for the workspace root.
     * @param name - The name of the new note.
     * @returns The ID of the new note.
     * @throws Will throw an error on a name clash in the destination.
     * @category Workspace Data Context
     */
    const createNoteFromTemplate = useCallback((templateID: number, workspaceID: number, folderID: number | null, name: string) =>
        withLoading(() => createDBNoteFromTemplate(templateID, workspaceID, folderID, name)), [withLoading])

    return useMemo(() => ({ getTemplates, countTemplates, createTemplateFromNote, updateTemplateFromNote, createNoteFromTemplate }), [ getTemplates, countTemplates, createTemplateFromNote, updateTemplateFromNote, createNoteFromTemplate ])
}
