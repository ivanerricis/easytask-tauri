import { useContext, useSyncExternalStore } from "react"
import { useActiveNoteId } from "./use-tabs"
import { TemplateDraftsActionsContext, TemplateDraftsContext } from "./template-drafts-context-object"

/** The drafts of the loaded workspace whose template is not deleted. */
export const useTemplateDrafts = () => useContext(TemplateDraftsContext).drafts

/** The stable actions on the drafts (open an editor, save now, retry). */
export const useTemplateDraftActions = () => useContext(TemplateDraftsActionsContext)

/** The draft shown by the note, null when the note is a normal one. */
export function useDraftOfNote(noteId: number | null) {
    const drafts = useTemplateDrafts()
    return noteId === null ? null : drafts.find(draft => draft.noteId === noteId) ?? null
}

/** The save state of the draft of a note ("idle" for a note that is not a draft). */
export function useDraftSaveStatus(noteId: number | null) {
    const { statusStore } = useTemplateDraftActions()
    return useSyncExternalStore(statusStore.subscribe, () => noteId === null ? "idle" as const : statusStore.getStatus(noteId))
}

/** True when the active note is the working copy of a template: archive, audio and automations make no sense there. */
export function useIsActiveDraft(): boolean {
    const drafts = useTemplateDrafts()
    const noteId = useActiveNoteId()
    return noteId !== null && drafts.some(draft => draft.noteId === noteId)
}
